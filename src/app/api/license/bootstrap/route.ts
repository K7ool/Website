import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) {
      return NextResponse.json({ success: false, reason: "MISSING_PRODUCT_ID" }, { status: 400 });
    }

    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const prodSnap = await adminDb.collection("products").doc(productId).get();
    const prod = prodSnap.data();

    let latestVersion = "1.0.0";
    try {
      const versionsSnap = await adminDb
        .collection("products")
        .doc(productId)
        .collection("productVersions")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      if (!versionsSnap.empty) {
        latestVersion = versionsSnap.docs[0].data().version || "1.0.0";
      }
    } catch (err) {
      console.error("[LICENSE_BOOTSTRAP] Failed to fetch product version:", err);
    }

    return NextResponse.json({
      success: true,
      productId,
      verifyUrl: `${baseUrl}/api/license/verify`,
      sessionUrl: `${baseUrl}/api/license/session`,
      statusUrl: `${baseUrl}/api/license/status`,
      restoreUrl: `${baseUrl}/api/license/session`,
      revokeCheckUrl: `${baseUrl}/api/license/revoke-check`,
      productName: prod?.name || prod?.productName || "Unknown Product",
      latestVersion,
      company: "RoMarketDev",
    });
  } catch (err: any) {
    console.error("[LICENSE_BOOTSTRAP] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
