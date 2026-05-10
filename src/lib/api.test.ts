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

// ────────────────────────────────────────────────────────────────────────────
// getGrowthAssets
// ────────────────────────────────────────────────────────────────────────────

describe("getGrowthAssets", () => {
  it("uses live route when response is ok", async () => {
    const liveBundle = {
      challengeId: "dyd-001",
      totals: {
        submitted: 7,
        approved: 6,
        rejected: 1,
        quotes: 1,
        caseStudies: 1,
        snippets: 1,
        linkedinPosts: 1,
      },
      topQuotes: [
        { quote: "live-quote-marker", client: "L", company: "L Co" },
      ],
      caseStudies: [{ title: "Live", summary: "Live summary", client: "L Co" }],
      snippets: [{ tag: "sales", text: "Live snippet text" }],
      linkedinPosts: [{ title: "Live draft", body: "Live body text." }],
      generatedAt: "2026-05-09T00:00:00.000Z",
    };
    const fetchSpy = mockFetch(async (url, init) => {
      expect(url).toBe("/api/agents/insight-extractor");
      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(Array.isArray(body.approvedPackets)).toBe(true);
      expect(typeof body.rejectedCount).toBe("number");
      return okJson(liveBundle);
    });
    const api = await importApi();
    api.setDemoStage("completed");

    const out = await api.getGrowthAssets("dyd-001");
    expect(fetchSpy).toHaveBeenCalledOnce();
    // Live marker survives intact — proves we did not fall back.
    expect(out.topQuotes[0].quote).toBe("live-quote-marker");
    expect(out.generatedAt).toBe("2026-05-09T00:00:00.000Z");
  });

  it("falls back to deterministic extractor on non-ok route response", async () => {
    mockFetch(async () => nonOk(502));
    const api = await importApi();
    api.setDemoStage("completed");

    const out = await api.getGrowthAssets("dyd-001");
    expect(out.challengeId).toBe("dyd-001");
    expect(typeof out.generatedAt).toBe("string");
    expect(out.totals).toBeDefined();
    // Deterministic fallback never invents the live marker.
    expect(out.topQuotes.find((q) => q.quote === "live-quote-marker")).toBeUndefined();
  });

  it("falls back to deterministic extractor when fetch throws", async () => {
    mockFetch(async () => {
      throw new TypeError("network down");
    });
    const api = await importApi();
    api.setDemoStage("completed");

    const out = await api.getGrowthAssets("dyd-001");
    expect(out.challengeId).toBe("dyd-001");
    expect(out.totals).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// designChallenge
// ────────────────────────────────────────────────────────────────────────────

describe("designChallenge", () => {
  it("uses live route when response is ok", async () => {
    const liveBrief = {
      title: "DYD #002 — Live Brief Marker",
      subtitle: "Subtitle from the route.",
      description: "Description from the route, three sentences. Live marker. Done.",
      growthObjective: "Live growth objective.",
      reward: "Trip for 2",
      rules: ["Rule one.", "Rule two.", "Rule three."],
      evidenceRequirements: ["Client name.", "Client role.", "Permission to use."],
      primaryMetric: "Number of testimonials",
      registrationDays: 5,
      submissionDays: 21,
      rubric: [
        { key: "a", label: "A", weight: 25 },
        { key: "b", label: "B", weight: 25 },
        { key: "c", label: "C", weight: 25 },
        { key: "d", label: "D", weight: 25 },
      ],
      hypeRankingDisclaimer: "Live disclaimer.",
      notificationCopy: "Live notification.",
      botLaunchScript: "Live launch script.",
      auditContract: {
        primaryMetric: { key: "n", label: "n", type: "number", higherIsBetter: true },
        evidence: { acceptedTypes: ["video"], requiredFields: ["clientName"] },
        auditMode: "ai_assisted_human_approved",
        rubric: [
          { key: "a", label: "A", weight: 25 },
          { key: "b", label: "B", weight: 25 },
          { key: "c", label: "C", weight: 25 },
          { key: "d", label: "D", weight: 25 },
        ],
        redFlags: [],
        finalScoreFormula: "validated_metric * quality_multiplier",
        finalDecisionOwner: "admins",
      },
    };
    const fetchSpy = mockFetch(async (url, init) => {
      expect(url).toBe("/api/agents/challenge-designer");
      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(body.prompt).toBe("collect testimonials from strategic accounts");
      return okJson(liveBrief);
    });
    const api = await importApi();
    const brief = await api.designChallenge({ prompt: "collect testimonials from strategic accounts" });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(brief.title).toBe("DYD #002 — Live Brief Marker");
  });

  it("falls back to deterministic designer on non-ok route response", async () => {
    mockFetch(async () => nonOk(502));
    const api = await importApi();
    const brief = await api.designChallenge({ prompt: "collect client testimonials" });
    expect(brief.title).toBeTruthy();
    expect(Array.isArray(brief.rules)).toBe(true);
    expect(brief.auditContract).toBeDefined();
    expect(brief.auditContract.finalDecisionOwner).toBe("admins");
    // Deterministic fallback never produces the live marker.
    expect(brief.title).not.toBe("DYD #002 — Live Brief Marker");
  });

  it("falls back to deterministic designer when fetch throws", async () => {
    mockFetch(async () => {
      throw new TypeError("network down");
    });
    const api = await importApi();
    const brief = await api.designChallenge({ prompt: "collect testimonials" });
    expect(brief.title).toBeTruthy();
    expect(brief.auditContract).toBeDefined();
  });

  it("does not call fetch for blank prompt and still returns a deterministic fallback", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const api = await importApi();
    const brief = await api.designChallenge({ prompt: "   " });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(brief).toBeDefined();
    expect(brief.auditContract).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// generateAuditTrace
// ────────────────────────────────────────────────────────────────────────────

describe("generateAuditTrace", () => {
  it("returns null when window is absent", async () => {
    // Override the beforeEach window stub with no window.
    delete (globalThis as { window?: unknown }).window;
    vi.resetModules();
    const api = await importApi();
    const out = await api.generateAuditTrace("p-patrick");
    expect(out).toBeNull();
  });

  it("returns null for an unknown participantId", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const api = await importApi();
    api.setDemoStage("completed");
    const out = await api.generateAuditTrace("p-does-not-exist");
    expect(out).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when no audit exists for the participant", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const api = await importApi();
    // Launch stage builds an empty audits map for all participants.
    api.setDemoStage("launch");
    const out = await api.generateAuditTrace("p-patrick");
    expect(out).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the live trace on a valid route response", async () => {
    const liveTrace = [
      "Validated 9 of 9 items against the contract.",
      "Quality blends to 95; admin formula computes the final.",
      "Recommendation: Strong candidate for winner.",
    ];
    const fetchSpy = mockFetch(async (url, init) => {
      expect(url).toBe("/api/agents/audit-assistant/trace");
      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(body.packet).toBeDefined();
      expect(body.contract).toBeDefined();
      expect(body.findings).toBeDefined();
      return okJson({ trace: liveTrace });
    });
    const api = await importApi();
    api.setDemoStage("completed");
    const out = await api.generateAuditTrace("p-patrick");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(out).toEqual(liveTrace);
  });

  it("returns null on non-ok route response", async () => {
    mockFetch(async () => nonOk(502));
    const api = await importApi();
    api.setDemoStage("completed");
    const out = await api.generateAuditTrace("p-patrick");
    expect(out).toBeNull();
  });

  it("returns null when route response is missing { trace } or has wrong shape", async () => {
    // Arity 1: object lacking the trace key.
    mockFetch(async () => okJson({ data: ["a", "b", "c"] }));
    let api = await importApi();
    api.setDemoStage("completed");
    expect(await api.generateAuditTrace("p-patrick")).toBeNull();

    // Arity 2: trace is present but not an array of strings.
    vi.resetModules();
    (globalThis as { window?: unknown }).window = makeWindow();
    mockFetch(async () => okJson({ trace: [1, 2, 3] }));
    api = await importApi();
    api.setDemoStage("completed");
    expect(await api.generateAuditTrace("p-patrick")).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    mockFetch(async () => {
      throw new TypeError("network down");
    });
    const api = await importApi();
    api.setDemoStage("completed");
    const out = await api.generateAuditTrace("p-patrick");
    expect(out).toBeNull();
  });
});
