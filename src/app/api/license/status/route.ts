import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cacheWrap } from "@/lib/api-cache";
import { sendLicenseWebhook, expiredEmbed } from "@/lib/discord-webhook";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const STATUS_CACHE_TTL = 60_000; // 1 min

function success(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...data });
}

function fail(reason: string, status = 403) {
  return NextResponse.json({ success: false, valid: false, reason }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    if (!checkRateLimit(ip, { max: 50, windowMs: 60_000, store: "status" })) {
      return fail("RATE_LIMIT_EXCEEDED", 429);
    }

    let body: { universeId?: number; productId?: string; licenseKey?: string };
    try {
      body = await req.json();
    } catch {
      return fail("INVALID_REQUEST_BODY", 400);
    }

    const { universeId, productId, licenseKey } = body;

    if (!productId || typeof productId !== "string") {
      return fail("MISSING_PRODUCT_ID", 400);
    }

    const cacheKey = `status:${productId}:${licenseKey || "none"}:${universeId || "none"}`;
    const result = await cacheWrap(cacheKey, STATUS_CACHE_TTL, async () => {
      let query = adminDb.collection("licenses").where("productId", "==", productId);
      if (licenseKey && typeof licenseKey === "string") {
        query = query.where("key", "==", licenseKey);
      }

      const licSnap = await query.limit(1).get();

      if (licSnap.empty) {
        return { valid: false, licenseFound: false, reason: "LICENSE_NOT_FOUND" };
      }

      const lic = licSnap.docs[0].data();

      if (lic.status === "revoked") {
        return { valid: false, revoked: true, reason: "LICENSE_REVOKED" };
      }

      if (lic.status !== "active") {
        return { valid: false, reason: `LICENSE_${lic.status?.toUpperCase() || "INACTIVE"}` };
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
        return { valid: false, reason: "LICENSE_EXPIRED" };
      }

      if (universeId && lic.universeId && Number(lic.universeId) !== Number(universeId)) {
        return { valid: false, reason: "UNIVERSE_MISMATCH" };
      }

      return {
        valid: true,
        revoked: false,
        licenseFound: true,
        licenseKey: lic.key,
        productName: lic.productName || "",
        expiresAt: lic.expiresAt || null,
        boundUniverseId: lic.universeId || null,
      };
    });

    return success(result);
  } catch (err: any) {
    console.error("[LICENSE_STATUS] Error:", err);
    return NextResponse.json({ success: false, valid: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, route: "/api/license/status", method: "GET", status: "online" });
}
