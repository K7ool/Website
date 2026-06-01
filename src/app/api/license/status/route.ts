import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 50;

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

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key);
  }
}, 120_000);

function success(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...data });
}

function fail(reason: string, status = 403) {
  return NextResponse.json({ success: false, valid: false, reason }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "127.0.0.1";

    if (!checkRateLimit(ip)) {
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

    let query = adminDb.collection("licenses").where("productId", "==", productId);
    if (licenseKey && typeof licenseKey === "string") {
      query = query.where("key", "==", licenseKey);
    }

    const licSnap = await query.limit(1).get();

    if (licSnap.empty) {
      return success({ valid: false, licenseFound: false, reason: "LICENSE_NOT_FOUND" });
    }

    const lic = licSnap.docs[0].data();

    if (lic.status === "revoked") {
      return success({ valid: false, revoked: true, reason: "LICENSE_REVOKED" });
    }

    if (lic.status !== "active") {
      return success({ valid: false, reason: `LICENSE_${lic.status?.toUpperCase() || "INACTIVE"}` });
    }

    if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
      await adminDb.collection("licenses").doc(licSnap.docs[0].id).update({ status: "expired" });
      return success({ valid: false, reason: "LICENSE_EXPIRED" });
    }

    if (universeId && lic.universeId && Number(lic.universeId) !== Number(universeId)) {
      return success({ valid: false, reason: "UNIVERSE_MISMATCH" });
    }

    return success({
      valid: true,
      revoked: false,
      licenseFound: true,
      licenseKey: lic.key,
      productName: lic.productName || "",
      expiresAt: lic.expiresAt || null,
      boundUniverseId: lic.universeId || null,
    });
  } catch (err: any) {
    console.error("[LICENSE_STATUS] Error:", err);
    return NextResponse.json({ success: false, valid: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, route: "/api/license/status", method: "GET", status: "online" });
}
