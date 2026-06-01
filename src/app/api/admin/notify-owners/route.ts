import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Extract token ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    // ── 2. Verify token ──
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (err: any) {
      console.error("[NOTIFY_OWNERS] verifyIdToken failed:", err.code, err.message);
      return NextResponse.json({ success: false, error: err?.message || "Authentication failed" }, { status: 401 });
    }

    // ── 3. Verify admin role ──
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    const profile = profileSnap.data();
    if (!profile || profile.role !== "admin") {
      console.warn("[NOTIFY_OWNERS] Non-admin attempted:", decoded.uid);
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // ── 4. Parse body ──
    let body: {
      productId?: string;
      productName?: string;
      productSlug?: string;
      latestVersion?: string;
      latestTitle?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }
    if (!body.productId) {
      return NextResponse.json({ success: false, error: "Missing productId" }, { status: 400 });
    }

    // ── 5. Find owners ──
    const ownerIds = new Set<string>();

    try {
      const licSnap = await adminDb
        .collection("licenses")
        .where("productId", "==", body.productId)
        .where("status", "==", "active")
        .get();
      licSnap.forEach((d) => { const uid = d.data().userId; if (uid) ownerIds.add(uid); });
    } catch (err: any) {
      console.error("[NOTIFY_OWNERS] License query failed:", err.message);
    }

    try {
      const orderSnap = await adminDb.collection("orders").get();
      orderSnap.forEach((d) => {
        const data = d.data();
        if (data.status === "approved" || data.status === "completed") {
          const match =
            data.productId === body.productId ||
            (data.items || []).some(
              (i: any) => i.id === body.productId || i.productId === body.productId
            );
          if (match && data.userId) ownerIds.add(data.userId);
        }
      });
    } catch (err: any) {
      console.error("[NOTIFY_OWNERS] Order query failed:", err.message);
    }

    if (ownerIds.size === 0) {
      return NextResponse.json({ success: true, notifiedCount: 0 });
    }

    // ── 6. Create notifications ──
    const now = new Date().toISOString();
    const title = body.productName
      ? `New Update Available: ${body.productName}`
      : "New Update Available";
    const message = body.latestTitle
      ? `A new version of ${body.productName || "your product"} is now available: v${body.latestVersion} — ${body.latestTitle}`
      : `A new version of ${body.productName || "your product"} is now available: v${body.latestVersion}`;

    let createdCount = 0;
    const errors: string[] = [];

    for (const userId of ownerIds) {
      try {
        await adminDb.collection("notifications").add({
          userId,
          title,
          message,
          type: "update",
          read: false,
          createdAt: now,
          productId: body.productId,
          versionId: body.latestVersion || "",
        });
        createdCount++;
      } catch (err: any) {
        errors.push(`userId ${userId}: ${err.message}`);
      }
    }

    console.log(`[NOTIFY_OWNERS] Done — ${createdCount}/${ownerIds.size} notifications created`);
    return NextResponse.json({ success: true, notifiedCount: createdCount, totalOwners: ownerIds.size });
  } catch (err: any) {
    console.error("[NOTIFY_OWNERS]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
