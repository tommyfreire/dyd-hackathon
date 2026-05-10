import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { smallApprovedCorpus } from "../../fixtures/packets";
import {
  anthropicEnvelope,
  cleanInsightBundleJson,
  fullyUngroundedInsightBundleJson,
  malformedJsonText,
  twoGroundedOneFabricatedInsightBundleJson,
} from "../../fixtures/llmResponses";

let originalFetch: typeof globalThis.fetch | undefined;
let originalKey: string | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalKey = process.env.ANTHROPIC_API_KEY;
  vi.resetModules();
});

afterEach(() => {
  if (originalFetch) globalThis.fetch = originalFetch;
  else delete (globalThis as unknown as { fetch?: unknown }).fetch;
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
  vi.restoreAllMocks();
});

function mockFetchSequence(modelTexts: string[]) {
  let i = 0;
  const spy = vi.fn(async () => {
    const text = modelTexts[Math.min(i, modelTexts.length - 1)];
    i++;
    return new Response(JSON.stringify(anthropicEnvelope(text)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  globalThis.fetch = spy as unknown as typeof globalThis.fetch;
  return spy;
}

async function importPost() {
  const mod = await import("@/app/api/agents/insight-extractor/route");
  return mod.POST as (req: Request) => Promise<Response>;
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/agents/insight-extractor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agents/insight-extractor", () => {
  it("returns 400 for invalid JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const POST = await importPost();
    const req = new Request("http://localhost/api/agents/insight-extractor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for empty corpus", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const POST = await importPost();

    const res = await POST(jsonRequest({ approvedPackets: [], rejectedCount: 0 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("empty_corpus");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 503 when API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ approvedPackets: smallApprovedCorpus, rejectedCount: 1 })
    );
    expect(res.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns sanitized bundle on grounded provider success", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([cleanInsightBundleJson]);
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ approvedPackets: smallApprovedCorpus, rejectedCount: 1 })
    );
    expect(res.status).toBe(200);
    const bundle = await res.json();

    expect(bundle.challengeId).toBe("dyd-001");
    expect(typeof bundle.generatedAt).toBe("string");
    expect(bundle.totals.quotes).toBe(bundle.topQuotes.length);
    expect(bundle.totals.caseStudies).toBe(bundle.caseStudies.length);
    expect(bundle.totals.snippets).toBe(bundle.snippets.length);
    expect(bundle.totals.linkedinPosts).toBe(bundle.linkedinPosts.length);
    expect(bundle.topQuotes.length).toBeLessThanOrEqual(3);
    expect(bundle.caseStudies.length).toBeLessThanOrEqual(3);
    expect(bundle.snippets.length).toBeLessThanOrEqual(3);
    expect(bundle.linkedinPosts.length).toBeLessThanOrEqual(2);
  });

  it("drops one fabricated quote while preserving grounded assets", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([twoGroundedOneFabricatedInsightBundleJson]);
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ approvedPackets: smallApprovedCorpus, rejectedCount: 0 })
    );
    expect(res.status).toBe(200);
    const bundle = await res.json();
    const companies = bundle.topQuotes.map((q: { company: string }) => q.company);
    expect(companies).not.toContain("Imaginary Inc");
    expect(bundle.topQuotes.length).toBe(2);
    expect(bundle.totals.quotes).toBe(2);
  });

  it("returns 502 when validation drops all usable assets", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([fullyUngroundedInsightBundleJson]);
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ approvedPackets: smallApprovedCorpus, rejectedCount: 0 })
    );
    expect(res.status).toBe(502);
  });

  it("returns 502 on malformed model output", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([malformedJsonText]);
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ approvedPackets: smallApprovedCorpus, rejectedCount: 0 })
    );
    expect(res.status).toBe(502);
  });

  it("caches repeated identical input", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchSequence([cleanInsightBundleJson, cleanInsightBundleJson]);
    const POST = await importPost();

    const a = await POST(jsonRequest({ approvedPackets: smallApprovedCorpus, rejectedCount: 1 }));
    const b = await POST(jsonRequest({ approvedPackets: smallApprovedCorpus, rejectedCount: 1 }));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
