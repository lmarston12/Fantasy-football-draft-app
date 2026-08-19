/**
 * A tiny in-memory TTL cache.
 *
 * Used server-side to avoid re-fetching Sleeper's large (~5MB) player catalog
 * on every request. It is per-instance and best-effort: on Vercel's
 * serverless runtime each cold instance starts empty, which is fine — the
 * catalog is fetched once per warm instance and reused across requests.
 *
 * Not used for live draft picks, which must always be fresh.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/**
 * Return the cached value for `key`, or compute + cache it with `loader`.
 * Concurrent callers for the same key share a single in-flight promise.
 */
const inFlight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    try {
      const value = await loader();
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  return promise as Promise<T>;
}

/** Clear the cache (used in tests). */
export function clearCache(): void {
  store.clear();
  inFlight.clear();
}
