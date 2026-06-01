import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// ─── In-memory rate limiter ───

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window per IP

const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ─── Cleanup stale entries periodically ───

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key);
  }
}, 120_000);

// ─── Response helpers ───

function success(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...data });
}

function fail(reason: string, status = 403) {
  return NextResponse.json({ success: false, valid: false, reason }, { status });
}

// ─── POST /api/license/verify ───

export async function POST(req: NextRequest) {
  try {
    console.log("[LICENSE_VERIFY] Request received");

    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "127.0.0.1";

    if (!checkRateLimit(ip)) {
      console.warn(`[LICENSE_VERIFY] Rate limit exceeded for IP: ${ip}`);
      return fail("RATE_LIMIT_EXCEEDED", 429);
    }

    // Parse body
    let body: { licenseKey?: string; productId?: string; placeId?: number; universeId?: number; creatorId?: number };
    try {
      body = await req.json();
    } catch {
      return fail("INVALID_REQUEST_BODY", 400);
    }

    console.log("[LICENSE_VERIFY] Body:", JSON.stringify(body));

    const { licenseKey, productId, placeId, universeId, creatorId } = body;

    // Validate required fields
    if (!licenseKey || typeof licenseKey !== "string") {
      return fail("MISSING_LICENSE_KEY", 400);
    }
    if (!productId || typeof productId !== "string") {
      return fail("MISSING_PRODUCT_ID", 400);
    }
    if (!universeId || typeof universeId !== "number") {
      return fail("MISSING_UNIVERSE_ID", 400);
    }

    // Look up license by key
    console.log("[LICENSE_VERIFY] Querying database");

    const licSnap = await adminDb.collection("licenses")
      .where("key", "==", licenseKey.trim())
      .limit(1)
      .get();

    if (licSnap.empty) {
      console.warn(`[LICENSE_VERIFY] License not found: ${licenseKey}`);
      return fail("LICENSE_NOT_FOUND");
    }

    console.log("[LICENSE_VERIFY] License found");

    const licDoc = licSnap.docs[0];
    const lic = licDoc.data();
    const licId = licDoc.id;

    // Check status
    if (lic.status === "revoked") {
      console.warn(`[LICENSE_VERIFY] License revoked: ${licId}`);
      return fail("LICENSE_REVOKED");
    }

    if (lic.status !== "active") {
      console.warn(`[LICENSE_VERIFY] License not active (${lic.status}): ${licId}`);
      return fail("LICENSE_NOT_ACTIVE");
    }

    // Check expiry
    if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
      console.warn(`[LICENSE_VERIFY] License expired: ${licId}, expiresAt=${lic.expiresAt}`);
      await adminDb.collection("licenses").doc(licId).update({ status: "expired" });
      return fail("LICENSE_EXPIRED");
    }

    // Check product match
    if (lic.productId !== productId) {
      console.warn(`[LICENSE_VERIFY] Product mismatch: license=${lic.productId}, request=${productId}`);
      return fail("PRODUCT_MISMATCH");
    }

    // FIRST ACTIVATION — auto-bind universe
    if (!lic.universeId) {
      await adminDb.collection("licenses").doc(licId).update({
        universeId,
        creatorId: creatorId || null,
        placeId: placeId || null,
        activationCount: 1,
        lastVerification: new Date().toISOString(),
        lastPlaceId: placeId || null,
        updatedAt: new Date().toISOString(),
      });

      console.log(`[LICENSE_VERIFY] First activation — bound universe ${universeId} to license ${licId}`);
    } else {
      // ANTI-LEAK: verify same universe
      if (Number(lic.universeId) !== Number(universeId)) {
        console.warn(`[LICENSE_VERIFY] Universe mismatch: bound=${lic.universeId}, request=${universeId} for license ${licId}`);
        return fail("UNIVERSE_MISMATCH");
      }

      // Record verification
      const currentCount = (lic.activationCount || 0) + 1;
      await adminDb.collection("licenses").doc(licId).update({
        activationCount: currentCount,
        lastVerification: new Date().toISOString(),
        lastPlaceId: placeId || null,
        placeId: placeId || null,
        updatedAt: new Date().toISOString(),
      });

      console.log(`[LICENSE_VERIFY] Verification recorded for license ${licId} (activation #${currentCount})`);
    }

    console.log("[LICENSE_VERIFY] Querying database");

    // Fetch latest product version
    let latestVersion = "1.0.0";
    try {
      const versionsSnap = await adminDb.collection("products")
        .doc(productId)
        .collection("productVersions")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!versionsSnap.empty) {
        latestVersion = versionsSnap.docs[0].data().version || "1.0.0";
      }
    } catch (err) {
      console.error(`[LICENSE_VERIFY] Failed to fetch product version for ${productId}:`, err);
    }

    // Get the refreshed license doc for accurate values
    const refreshedSnap = await adminDb.collection("licenses").doc(licId).get();
    const refreshed = refreshedSnap.data();

    console.log("[LICENSE_VERIFY] Returning SUCCESS");

    return success({
      valid: true,
      productName: lic.productName || "",
      licenseType: lic.durationMonths && lic.durationMonths > 0 ? "subscription" : "lifetime",
      expiresAt: lic.expiresAt || null,
      latestVersion,
      activationCount: refreshed?.activationCount || 1,
      boundUniverseId: refreshed?.universeId || universeId,
    });

  } catch (err: any) {
    console.error("[LICENSE_VERIFY] ERROR", err);
    return NextResponse.json({
      success: false,
      valid: false,
      reason: "SERVER_ERROR",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    success: true,
    route: "/api/license/verify",
    method: "GET",
    status: "online",
  });
}
