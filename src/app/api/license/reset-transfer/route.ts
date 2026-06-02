import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, reason: "UNAUTHORIZED" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, reason: "UNAUTHORIZED" }, { status: 401 });
    }

    const { licenseId } = await req.json();
    if (!licenseId) {
      return NextResponse.json({ success: false, reason: "MISSING_LICENSE_ID" }, { status: 400 });
    }

    const licSnap = await adminDb.collection("licenses").doc(licenseId).get();
    if (!licSnap.exists) {
      return NextResponse.json({ success: false, reason: "LICENSE_NOT_FOUND" }, { status: 404 });
    }

    const lic = licSnap.data();
    if (!lic || lic.userId !== decodedToken.uid) {
      return NextResponse.json({ success: false, reason: "FORBIDDEN" }, { status: 403 });
    }

    await adminDb.collection("licenses").doc(licenseId).update({
      robloxUserId: null,
      creatorId: null,
      universeId: null,
      placeId: null,
      robloxUsername: null,
      activationCount: 0,
      lastVerification: null,
      lastPlaceId: null,
      updatedAt: new Date().toISOString(),
    });

    await adminDb.collection("licenseActivity").add({
      licenseId,
      licenseKey: lic.key,
      userId: decodedToken.uid,
      type: "transfer",
      details: {
        previousUniverseId: lic.universeId || null,
        previousPlaceId: lic.placeId || null,
        previousCreatorId: lic.creatorId || null,
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[RESET_TRANSFER] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
