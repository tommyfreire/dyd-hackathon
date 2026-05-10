// In-memory response cache with TTL + single-flight protection.
//
// Lives for the lifetime of the Node process. Cache hits avoid hitting the
// provider; single-flight collapses concurrent requests for the same input
// into one outbound call.

import { createHash } from "node:crypto";

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** Stable hash of a JSON-serializable input. */
export function hashInput(input: unknown): string {
  const stable = stableStringify(input);
  return createHash("sha1").update(stable).digest("hex");
}

export function cacheGet<V>(key: string): V | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return e.value as V;
}

export function cacheSet<V>(key: string, value: V, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Cache + single-flight wrapper. If another caller is already computing the
 * same key, share that promise. If a fresh value exists, return it. Otherwise
 * compute, cache, and return.
 */
export async function withCache<V>(
  key: string,
  ttlMs: number,
  compute: () => Promise<V>
): Promise<V> {
  const cached = cacheGet<V>(key);
  if (cached !== undefined) return cached;

  const existing = inflight.get(key) as Promise<V> | undefined;
  if (existing) return existing;

  const p = (async () => {
    try {
      const v = await compute();
      cacheSet(key, v, ttlMs);
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

// JSON.stringify with sorted keys so logically-equal inputs hash equally.
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  );
}
