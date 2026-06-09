// ─── In-memory rate limiter for API routes ───
// Resets on cold start; per-Vercel-instance (not cross-instance).

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();
const CLEANUP_INTERVAL = 120_000;

setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

export function checkRateLimit(
  ip: string,
  opts: { max?: number; windowMs?: number; store?: string } = {},
): boolean {
  const { max = 10, windowMs = 60_000, store: storeName = "default" } = opts;
  const store = getStore(storeName);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "127.0.0.1"
  );
}
