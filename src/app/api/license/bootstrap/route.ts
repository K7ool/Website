import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cacheWrap } from "@/lib/api-cache";

const BOOTSTRAP_CACHE_TTL = 300_000; // 5 min

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) {
      return NextResponse.json({ success: false, reason: "MISSING_PRODUCT_ID" }, { status: 400 });
    }

    const cacheKey = `bootstrap:${productId}`;
    const result = await cacheWrap(cacheKey, BOOTSTRAP_CACHE_TTL, async () => {
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

      return {
        success: true,
        productId,
        verifyUrl: `${baseUrl}/api/license/verify`,
        sessionUrl: `${baseUrl}/api/license/session`,
        statusUrl: `${baseUrl}/api/license/status`,
        restoreUrl: `${baseUrl}/api/license/session`,
        revokeCheckUrl: `${baseUrl}/api/license/revoke-check`,
        activityUrl: `${baseUrl}/api/license/activity`,
        heartbeatUrl: `${baseUrl}/api/license/heartbeat`,
        blacklistUrl: `${baseUrl}/api/license/blacklist`,
        productName: prod?.name || prod?.productName || "Unknown Product",
        latestVersion,
        company: "RoMarketDev",
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[LICENSE_BOOTSTRAP] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
