import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { sendLicenseWebhook } from "@/lib/discord-webhook";

const TRANSFER_COOLDOWN_DAYS = 7;

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

    if (lic.lastTransferAt) {
      const lastTransfer = new Date(lic.lastTransferAt).getTime();
      const now = Date.now();
      const elapsedDays = (now - lastTransfer) / 86400000;
      if (elapsedDays < TRANSFER_COOLDOWN_DAYS) {
        const remainingDays = Math.ceil(TRANSFER_COOLDOWN_DAYS - elapsedDays);
        return NextResponse.json({
          success: false,
          reason: "TRANSFER_COOLDOWN",
          remainingDays,
          message: `You can transfer again in ${remainingDays} day${remainingDays > 1 ? "s" : ""}.`,
        }, { status: 429 });
      }
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
      lastTransferAt: new Date().toISOString(),
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

    sendLicenseWebhook([
      {
        title: "License Transferred",
        description: `License **${lic.key}** binding was reset by the owner`,
        color: 0x3498db,
        fields: [
          { name: "Product", value: lic.productName || "Unknown", inline: true },
          { name: "User", value: `\`${decodedToken.uid}\``, inline: true },
          ...(lic.universeId
            ? [{ name: "Previous Universe", value: String(lic.universeId), inline: true }]
            : []),
        ],
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[RESET_TRANSFER] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
