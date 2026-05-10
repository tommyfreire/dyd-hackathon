// Wrapper tests for src/lib/api.ts.
//
// These exercise the client-side fallback contracts without booting Next.js:
//   - generateDaremasterPost: trivial mode never fetches; insight/winner
//     fetch the route, fall back to deterministic content on non-ok / throw.
//   - The deterministic fallback content must be score-free.
//
// Each test sets up its own minimal `window` with localStorage so api.ts can
// read/write `dyd:state:v1` etc. We `vi.resetModules()` between tests so the
// module-scoped `state` cache inside api.ts doesn't leak.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { containsForbiddenScoreLanguage } from "@/app/api/agents/_shared/validation";

interface MemoryStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  clear(): void;
}

interface WindowStub {
  localStorage: MemoryStorage;
  dispatchEvent(event: unknown): boolean;
  addEventListener(): void;
  removeEventListener(): void;
}

function makeWindow(): WindowStub {
  const map = new Map<string, string>();
  return {
    localStorage: {
      getItem: (k) => (map.has(k) ? map.get(k)! : null),
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
      clear: () => map.clear(),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

let originalWindow: unknown;
let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  originalWindow = (globalThis as { window?: unknown }).window;
  originalFetch = globalThis.fetch;
  (globalThis as { window?: unknown }).window = makeWindow();
  vi.resetModules();
});

afterEach(() => {
  (globalThis as { window?: unknown }).window = originalWindow;
  if (originalFetch) globalThis.fetch = originalFetch;
  else delete (globalThis as unknown as { fetch?: unknown }).fetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function importApi() {
  return import("@/lib/api");
}

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn(handler);
  globalThis.fetch = spy as unknown as typeof globalThis.fetch;
  return spy;
}

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
function nonOk(status: number): Response {
  return new Response(JSON.stringify({ error: "x" }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// ────────────────────────────────────────────────────────────────────────────

describe("buildDaremasterSnapshot", () => {
  it("returns the current challenge / ranking / count / deadline shape", async () => {
    const api = await importApi();
    api.setDemoStage("day_14");
    const snap = await api.buildDaremasterSnapshot();
    expect(snap.challenge.id).toBe("dyd-001");
    expect(snap.challenge.title.length).toBeGreaterThan(0);
    expect(Array.isArray(snap.ranking)).toBe(true);
    expect(snap.ranking.length).toBeGreaterThan(0);
    expect(typeof snap.participantCount).toBe("number");
    expect(typeof snap.registeredCount).toBe("number");
    expect(typeof snap.daysToRegistrationDeadline).toBe("number");
    expect(typeof snap.daysToSubmissionDeadline).toBe("number");
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("generateDaremasterPost — trivial mode", () => {
  it("never calls fetch and rotates deterministic content", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const api = await importApi();
    api.setDemoStage("day_14");

    const a = await api.generateDaremasterPost("trivial", { trivialIdx: 0 });
    const b = await api.generateDaremasterPost("trivial", { trivialIdx: 1 });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(a.reactions).toEqual({ fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 });
    expect(b.reactions).toEqual({ fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 });
    expect(a.content).not.toEqual(b.content);
    expect(containsForbiddenScoreLanguage(a.content)).toBe(false);
    expect(containsForbiddenScoreLanguage(b.content)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("generateDaremasterPost — insight mode", () => {
  it("uses live route when response is ok and zero-fills reactions", async () => {
    const livePost = {
      trigger: "quality_threat",
      content: "Charlie is the dark horse. Quality is rewriting the leaderboard.",
      reactions: { fire: 99, clap: 99, rocket: 99, eyes: 99, trophy: 99 },
    };
    const fetchSpy = mockFetch(async (url, init) => {
      expect(url).toBe("/api/agents/daremaster");
      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(body.mode).toBe("insight");
      // The wrapper is expected to enrich ranking[*].auditScore for non-trivial modes.
      const audited = body.snapshot.ranking.filter(
        (r: { auditScore?: number }) => typeof r.auditScore === "number"
      );
      expect(audited.length).toBeGreaterThan(0);
      return okJson(livePost);
    });
    const api = await importApi();
    api.setDemoStage("day_14");

    const post = await api.generateDaremasterPost("insight");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(post.content).toBe(livePost.content);
    expect(post.trigger).toBe("quality_threat");
    expect(post.reactions).toEqual({ fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 });
  });

  it("falls back to deterministic Charlie-dark-horse content on non-ok route response", async () => {
    mockFetch(async () => nonOk(502));
    const api = await importApi();
    api.setDemoStage("day_14");

    const post = await api.generateDaremasterPost("insight");
    expect(post.reactions).toEqual({ fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 });
    expect(post.content.toLowerCase()).toContain("charlie");
    expect(post.content.toLowerCase()).toContain("dark horse");
    expect(containsForbiddenScoreLanguage(post.content)).toBe(false);
  });

  it("falls back when fetch throws", async () => {
    mockFetch(async () => {
      throw new TypeError("network down");
    });
    const api = await importApi();
    api.setDemoStage("day_14");

    const post = await api.generateDaremasterPost("insight");
    expect(post.content.toLowerCase()).toContain("charlie");
    expect(containsForbiddenScoreLanguage(post.content)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("generateDaremasterPost — winner mode", () => {
  it("falls back with Patrick winner + growth-asset framing on non-ok", async () => {
    mockFetch(async () => nonOk(502));
    const api = await importApi();
    api.setDemoStage("completed");

    const post = await api.generateDaremasterPost("winner");
    expect(post.reactions).toEqual({ fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 });
    expect(post.content).toContain("Patrick");
    // The deterministic winner script frames the corpus payoff explicitly.
    expect(post.content.toLowerCase()).toContain("reusable assets");
    expect(containsForbiddenScoreLanguage(post.content)).toBe(false);
  });
});
