import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cacheWrap } from "@/lib/api-cache";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;
const SESSION_CACHE_TTL = 60_000; // 1 min

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
    console.log("[LICENSE_SESSION] Request received");

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "127.0.0.1";

    if (!checkRateLimit(ip)) {
      console.warn(`[LICENSE_SESSION] Rate limit exceeded for IP: ${ip}`);
      return fail("RATE_LIMIT_EXCEEDED", 429);
    }

    let body: { universeId?: number; creatorId?: number; productId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, reason: "INVALID_REQUEST_BODY" }, { status: 400 });
    }

    console.log("[LICENSE_SESSION] Body:", JSON.stringify(body));

    const { universeId, creatorId, productId } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ success: false, reason: "MISSING_PRODUCT_ID" }, { status: 400 });
    }
    if (!universeId || typeof universeId !== "number") {
      return NextResponse.json({ success: false, reason: "MISSING_UNIVERSE_ID" }, { status: 400 });
    }
    if (!creatorId || typeof creatorId !== "number") {
      return NextResponse.json({ success: false, reason: "MISSING_CREATOR_ID" }, { status: 400 });
    }

    console.log("[LICENSE_SESSION] Fields validated, querying Firestore");

    const cacheKey = `session:${productId}:${universeId}:${creatorId}`;
    const result = await cacheWrap(cacheKey, SESSION_CACHE_TTL, async () => {
      const licSnap = await adminDb
        .collection("licenses")
        .where("productId", "==", productId)
        .get();

      if (licSnap.empty) {
        console.log("[LICENSE_SESSION] No licenses found for product");
        return { verified: false, licenseFound: false, reason: "NO_ACTIVE_LICENSE" };
      }

      let foundBoundUniverseId: number | null = null;
      let foundRevoked = false;

      for (const doc of licSnap.docs) {
        const lic = doc.data();

        const licUniverseId = lic.universeId != null ? Number(lic.universeId) : null;
        const licCreatorId = lic.creatorId != null ? Number(lic.creatorId) : null;

        if (licUniverseId === Number(universeId) && licCreatorId === Number(creatorId)) {
          if (lic.status === "active") {
            if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
              console.log(`[LICENSE_SESSION] License ${doc.id} expired at ${lic.expiresAt}`);
              continue;
            }

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
              console.error("[LICENSE_SESSION] Failed to fetch product version:", err);
            }

            console.log(`[LICENSE_SESSION] Session restored for license ${doc.id} (${lic.key})`);

            return {
              verified: true,
              licenseFound: true,
              licenseKey: lic.key,
              productId: lic.productId,
              productName: lic.productName || "",
              boundUniverseId: licUniverseId,
              creatorId: licCreatorId,
              licenseType: lic.durationMonths && lic.durationMonths > 0 ? "subscription" : "lifetime",
              expiresAt: lic.expiresAt || null,
              latestVersion,
            };
          } else if (lic.status === "revoked") {
            foundRevoked = true;
          }
        } else if (licUniverseId && licUniverseId !== Number(universeId)) {
          foundBoundUniverseId = licUniverseId;
        }
      }

      if (foundBoundUniverseId !== null) {
        return { verified: false, reason: "BOUND_TO_OTHER_UNIVERSE", boundUniverseId: foundBoundUniverseId };
      }

      if (foundRevoked) {
        return { verified: false, licenseFound: true, reason: "LICENSE_REVOKED" };
      }

      return { verified: false, licenseFound: false, reason: "NO_ACTIVE_LICENSE" };
    });

    return success(result);

  } catch (err: any) {
    console.error("[LICENSE_SESSION] Error:", err);
    return NextResponse.json({
      success: false,
      verified: false,
      reason: "SERVER_ERROR",
      error: err.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    route: "/api/license/session",
    method: "GET",
    status: "online",
  });
}
