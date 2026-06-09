import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cacheWrap } from "@/lib/api-cache";
import { sendLicenseWebhook, revokeEmbed, expiredEmbed } from "@/lib/discord-webhook";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const REVOKE_CACHE_TTL = 60_000; // 1 min

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    if (!checkRateLimit(ip, { max: 30, windowMs: 60_000, store: "revoke-check" })) {
      return NextResponse.json({ success: false, reason: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    }

    let body: { universeId?: number; productId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, reason: "INVALID_REQUEST_BODY" }, { status: 400 });
    }

    const { universeId, productId } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ success: false, reason: "MISSING_PRODUCT_ID" }, { status: 400 });
    }

    const cacheKey = `revoke:${productId}:${universeId || "none"}`;
    const result = await cacheWrap(cacheKey, REVOKE_CACHE_TTL, async () => {
      let query = adminDb.collection("licenses").where("productId", "==", productId);
      if (universeId && typeof universeId === "number") {
        query = query.where("universeId", "==", universeId);
      }

      const licSnap = await query.limit(1).get();

      if (licSnap.empty) {
        return { success: true, revoked: false, active: false, reason: "LICENSE_NOT_FOUND" };
      }

      const lic = licSnap.docs[0].data();

      if (lic.status === "revoked") {
        sendLicenseWebhook(revokeEmbed({
          key: lic.key || "",
          productName: lic.productName || "Unknown",
          userId: lic.userId || "",
          universeId: lic.universeId || undefined,
        }));
        return { success: true, revoked: true, active: false, reason: "LICENSE_REVOKED" };
      }

      if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
        await adminDb.collection("licenses").doc(licSnap.docs[0].id).update({ status: "expired" });
        sendLicenseWebhook(expiredEmbed({
          key: lic.key || "",
          productName: lic.productName || "Unknown",
          userId: lic.userId || "",
          licenseId: licSnap.docs[0].id,
          expiresAt: lic.expiresAt,
        }));
        return { success: true, revoked: false, active: false, reason: "LICENSE_EXPIRED" };
      }

      if (lic.status !== "active") {
        return { success: true, revoked: false, active: false, reason: `LICENSE_${lic.status?.toUpperCase() || "INACTIVE"}` };
      }

      return { success: true, revoked: false, active: true };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[LICENSE_REVOKE_CHECK] Error:", err);
    return NextResponse.json({ success: false, revoked: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, route: "/api/license/revoke-check", method: "GET", status: "online" });
}
