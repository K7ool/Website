// ─── In-memory response cache for license API routes ───
// Reduces Firestore reads by caching responses with TTL.

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

const CLEANUP_INTERVAL = 120_000; // 2 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, CLEANUP_INTERVAL);

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function cacheWrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return Promise.resolve(cached);
  return fn().then((result) => {
    cacheSet(key, result, ttlMs);
    return result;
  });
}
