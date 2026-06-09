import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { checkLegalAcceptanceServer } from "@/lib/legal";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, { max: 30, windowMs: 60_000, store: "check-ownership" })) {
      return NextResponse.json({ error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[CHECK_OWNERSHIP] No auth header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      console.error("[CHECK_OWNERSHIP] Invalid JSON body");
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { productId } = body;
    console.log("[CHECK_OWNERSHIP] Request body:", JSON.stringify(body));

    if (!productId) {
      console.error("[CHECK_OWNERSHIP] Missing productId");
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
      console.log("[CHECK_OWNERSHIP] Token verified — uid:", decoded.uid, "email:", decoded.email || "N/A");
    } catch (err: any) {
      console.error("[CHECK_OWNERSHIP] Token verification failed —", err?.message || err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.uid;
    console.log("[CHECK_OWNERSHIP] Checking ownership — userId:", userId, "productId:", productId);

    // Check legal acceptance
    let profileSnap;
    try {
      profileSnap = await adminDb.collection("profiles").doc(userId).get();
    } catch (err: any) {
      console.error("[CHECK_OWNERSHIP] Firestore profile query failed —", err?.message || err);
      console.error("[CHECK_OWNERSHIP] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const profileData = profileSnap.data();
    console.log("[CHECK_OWNERSHIP] Profile data:", profileData ? "found" : "not found");

    const profile = profileData
      ? {
          acceptedTermsVersion: profileData.acceptedTermsVersion,
          acceptedPrivacyVersion: profileData.acceptedPrivacyVersion,
          acceptedRefundVersion: profileData.acceptedRefundVersion,
        }
      : null;

    if (!checkLegalAcceptanceServer(profile)) {
      console.log("[CHECK_OWNERSHIP] Legal documents not accepted");
      return NextResponse.json(
        {
          error:
            "Legal documents must be accepted before using this feature. Please accept the Terms of Service, Privacy Policy, and Refund Policy.",
        },
        { status: 403 }
      );
    }

    // Check licenses
    console.log("[CHECK_OWNERSHIP] Checking licenses...");
    let licSnap;
    try {
      licSnap = await adminDb
        .collection("licenses")
        .where("userId", "==", userId)
        .where("productId", "==", productId)
        .get();
    } catch (err: any) {
      console.error("[CHECK_OWNERSHIP] Firestore license query failed —", err?.message || err);
      console.error("[CHECK_OWNERSHIP] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    console.log("[CHECK_OWNERSHIP] License query result — docs:", licSnap.docs.length);
    for (const doc of licSnap.docs) {
      const data = doc.data();
      console.log("[CHECK_OWNERSHIP] License:", doc.id, "status:", data.status, "expiresAt:", data.expiresAt);
      if (data.status === "active") {
        if (!data.expiresAt || new Date(data.expiresAt) > new Date()) {
          console.log("[CHECK_OWNERSHIP] Active license found — product already owned");
          return NextResponse.json({ error: "Product already owned", owned: true }, { status: 409 });
        }
      }
    }

    // Check orders
    console.log("[CHECK_OWNERSHIP] Checking orders...");
    let orderSnap;
    try {
      orderSnap = await adminDb.collection("orders").where("userId", "==", userId).get();
    } catch (err: any) {
      console.error("[CHECK_OWNERSHIP] Firestore order query failed —", err?.message || err);
      console.error("[CHECK_OWNERSHIP] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    console.log("[CHECK_OWNERSHIP] Order query result — docs:", orderSnap.docs.length);
    for (const doc of orderSnap.docs) {
      const data = doc.data();
      console.log("[CHECK_OWNERSHIP] Order:", doc.id, "status:", data.status);
      if (data.status === "approved" || data.status === "completed") {
        const items = data.items || [];
        if (items.some((item: any) => item.id === productId) || data.productId === productId) {
          console.log("[CHECK_OWNERSHIP] Completed order found — product already owned");
          return NextResponse.json({ error: "Product already owned", owned: true }, { status: 409 });
        }
      }
    }

    console.log("[CHECK_OWNERSHIP] Product not owned — returning available");
    return NextResponse.json({ owned: false }, { status: 200 });
  } catch (err: any) {
    console.error("[CHECK_OWNERSHIP] Unexpected error:", err?.message || err);
    console.error("[CHECK_OWNERSHIP] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
