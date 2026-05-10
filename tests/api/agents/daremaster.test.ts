import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { postHandoffDaremasterSnapshot } from "../../fixtures/snapshots";
import {
  anthropicEnvelope,
  cleanDaremasterPostJson,
  malformedJsonText,
  nearMissScoreLeakDaremasterPostJson,
  scoreLeakDaremasterPostJson,
} from "../../fixtures/llmResponses";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

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
  const fetchSpy = vi.fn(async (url: string) => {
    if (typeof url !== "string" || !url.includes("anthropic.com")) {
      throw new Error(`unexpected fetch URL: ${String(url)}`);
    }
    const text = modelTexts[Math.min(i, modelTexts.length - 1)];
    i++;
    return new Response(JSON.stringify(anthropicEnvelope(text)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
  return fetchSpy;
}

async function importPost() {
  const mod = await import("@/app/api/agents/daremaster/route");
  return mod.POST as (req: Request) => Promise<Response>;
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/agents/daremaster", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agents/daremaster", () => {
  it("returns 400 for invalid JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const POST = await importPost();
    const req = new Request("http://localhost/api/agents/daremaster", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not valid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for missing snapshot or mode", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const POST = await importPost();

    const cases = [
      {},
      { snapshot: postHandoffDaremasterSnapshot },
      { mode: "insight" },
    ];
    for (const body of cases) {
      const res = await POST(jsonRequest(body));
      expect(res.status).toBe(400);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 503 when API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" })
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe("MissingKeyError");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a validated post on provider success", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([cleanDaremasterPostJson]);
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" })
    );
    expect(res.status).toBe(200);
    const post = await res.json();
    expect(post.trigger).toBeTypeOf("string");
    expect(post.content).toBeTypeOf("string");
    expect(post.content.length).toBeGreaterThan(0);
    expect(post.reactions).toBeDefined();
    // No score language in the validated content.
    expect(post.content).not.toMatch(/\b\d+(\.\d+)?\s*\/\s*(10|100)\b/);
    expect(post.content).not.toMatch(/\b\d+(\.\d+)?\s+out\s+of\s+(10|100)\b/i);
  });

  it("sends mode and snapshot in the Anthropic user prompt", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchSequence([cleanDaremasterPostJson]);
    const POST = await importPost();

    await POST(jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" }));
    const init = (fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(init.body as string);
    const userMsg = body.messages[0].content as string;
    expect(userMsg).toContain("Mode: insight");
    expect(userMsg).toContain("Bob Martinez");
    expect(userMsg).toContain("Patrick Olawale");
  });

  it("returns 502 when model output leaks score (slash form)", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([scoreLeakDaremasterPostJson]);
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" })
    );
    expect(res.status).toBe(502);
  });

  it("returns 502 when model output uses 'N out of 100' near-miss leak", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([nearMissScoreLeakDaremasterPostJson]);
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" })
    );
    expect(res.status).toBe(502);
  });

  it("returns 502 when model output is malformed", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([malformedJsonText]);
    const POST = await importPost();

    const res = await POST(
      jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" })
    );
    expect(res.status).toBe(502);
  });

  it("caches repeated identical input", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchSequence([cleanDaremasterPostJson, cleanDaremasterPostJson]);
    const POST = await importPost();

    const a = await POST(jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" }));
    const b = await POST(jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" }));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const aBody = await a.json();
    const bBody = await b.json();
    expect(bBody).toEqual(aBody);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("uses different cache keys per mode", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchSequence([cleanDaremasterPostJson, cleanDaremasterPostJson]);
    const POST = await importPost();

    await POST(jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" }));
    await POST(jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "winner" }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

// Sanity: assert the route was hit with the Anthropic endpoint, not something else.
describe("POST /api/agents/daremaster — provider URL sanity", () => {
  it("calls the Anthropic Messages endpoint exactly", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchSequence([cleanDaremasterPostJson]);
    const POST = await importPost();

    await POST(jsonRequest({ snapshot: postHandoffDaremasterSnapshot, mode: "insight" }));
    expect((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe(ANTHROPIC_ENDPOINT);
  });
});
