// Cache + single-flight + TTL invariants.
//
// The cache module holds module-scoped Maps. We use vi.resetModules() and
// dynamic re-imports between tests so each test gets a fresh cache without
// any production-only `__resetForTests` export.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function loadCache() {
  return import("./cache");
}

// ────────────────────────────────────────────────────────────────────────────
// hashInput
// ────────────────────────────────────────────────────────────────────────────

describe("hashInput", () => {
  it("is stable across object key order", async () => {
    const { hashInput } = await loadCache();
    const a = { snapshot: { ranking: [1, 2, 3], status: "review" }, mode: "insight" };
    const b = { mode: "insight", snapshot: { status: "review", ranking: [1, 2, 3] } };
    expect(hashInput(a)).toBe(hashInput(b));
  });

  it("is stable across deeply nested key order", async () => {
    const { hashInput } = await loadCache();
    const a = { x: { y: { z: 1, w: 2 } } };
    const b = { x: { y: { w: 2, z: 1 } } };
    expect(hashInput(a)).toBe(hashInput(b));
  });

  it("preserves array element order (arrays are not reordered)", async () => {
    const { hashInput } = await loadCache();
    expect(hashInput([1, 2, 3])).not.toBe(hashInput([3, 2, 1]));
  });

  it("changes when a nested value changes", async () => {
    const { hashInput } = await loadCache();
    const a = { snapshot: { count: 1 } };
    const b = { snapshot: { count: 2 } };
    expect(hashInput(a)).not.toBe(hashInput(b));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// cacheSet / cacheGet
// ────────────────────────────────────────────────────────────────────────────

describe("cacheSet / cacheGet", () => {
  it("returns the value before TTL expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T00:00:00Z"));
    const { cacheSet, cacheGet } = await loadCache();
    cacheSet("k", { ok: 1 }, 60_000);
    vi.advanceTimersByTime(30_000);
    expect(cacheGet("k")).toEqual({ ok: 1 });
  });

  it("returns undefined after TTL expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T00:00:00Z"));
    const { cacheSet, cacheGet } = await loadCache();
    cacheSet("k", "value", 1_000);
    vi.advanceTimersByTime(1_500);
    expect(cacheGet("k")).toBeUndefined();
  });

  it("returns undefined for unset keys", async () => {
    const { cacheGet } = await loadCache();
    expect(cacheGet("never-set")).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// withCache — TTL + single-flight + reject behavior
// ────────────────────────────────────────────────────────────────────────────

describe("withCache", () => {
  it("computes once for repeated calls before TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T00:00:00Z"));
    const { withCache } = await loadCache();
    const compute = vi.fn(async () => "value");
    const a = await withCache("k", 60_000, compute);
    const b = await withCache("k", 60_000, compute);
    expect(a).toBe("value");
    expect(b).toBe("value");
    expect(compute).toHaveBeenCalledOnce();
  });

  it("shares the in-flight promise so concurrent callers get one compute", async () => {
    const { withCache } = await loadCache();
    let resolveCompute!: (v: string) => void;
    const compute = vi.fn(
      () =>
        new Promise<string>((res) => {
          resolveCompute = res;
        })
    );
    const p1 = withCache("k", 60_000, compute);
    const p2 = withCache("k", 60_000, compute);
    // Resolve only after both callers have registered.
    resolveCompute("once");
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe("once");
    expect(b).toBe("once");
    expect(compute).toHaveBeenCalledOnce();
  });

  it("does not cache rejected computes — next call retries", async () => {
    const { withCache } = await loadCache();
    let attempt = 0;
    const compute = vi.fn(async () => {
      attempt++;
      if (attempt === 1) throw new Error("boom");
      return "second-attempt-value";
    });
    await expect(withCache("k", 60_000, compute)).rejects.toThrow("boom");
    const out = await withCache("k", 60_000, compute);
    expect(out).toBe("second-attempt-value");
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("recomputes after TTL expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T00:00:00Z"));
    const { withCache } = await loadCache();
    let i = 0;
    const compute = vi.fn(async () => `v${++i}`);

    const a = await withCache("k", 60_000, compute);
    expect(a).toBe("v1");

    // Past TTL.
    vi.advanceTimersByTime(60_001);

    const b = await withCache("k", 60_000, compute);
    expect(b).toBe("v2");
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("does not collide cache keys across distinct keys", async () => {
    const { withCache } = await loadCache();
    const compute = vi.fn(async (k: string) => `value-for-${k}`);
    const a = await withCache("alpha", 60_000, () => compute("alpha"));
    const b = await withCache("beta", 60_000, () => compute("beta"));
    expect(a).toBe("value-for-alpha");
    expect(b).toBe("value-for-beta");
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
