import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { approvedPacketA } from "../../fixtures/packets";
import { sampleAuditContract, sampleAuditFindings } from "../../fixtures/findings";
import {
  anthropicEnvelope,
  authorityClaimAuditTraceJson,
  cleanAuditTraceJson,
  malformedJsonText,
  nineLineAuditTraceJson,
  oversizedAuditTraceJson,
  videoAnalysisAuditTraceJson,
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
  const mod = await import("@/app/api/agents/audit-assistant/trace/route");
  return mod.POST as (req: Request) => Promise<Response>;
}

function validBody() {
  return {
    packet: approvedPacketA,
    contract: sampleAuditContract,
    findings: sampleAuditFindings,
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/agents/audit-assistant/trace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agents/audit-assistant/trace", () => {
  it("returns 400 for invalid JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const POST = await importPost();
    const req = new Request("http://localhost/api/agents/audit-assistant/trace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for missing packet/contract/findings", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const POST = await importPost();

    const base = validBody();
    for (const key of ["packet", "contract", "findings"] as const) {
      const body = { ...base } as Record<string, unknown>;
      delete body[key];
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

    const res = await POST(jsonRequest(validBody()));
    expect(res.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns trace on provider success", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([cleanAuditTraceJson]);
    const POST = await importPost();

    const res = await POST(jsonRequest(validBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.trace)).toBe(true);
    expect(data.trace.length).toBeGreaterThanOrEqual(3);
    expect(data.trace.length).toBeLessThanOrEqual(8);
  });

  it("user prompt includes structured fields and deterministic findings", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchSequence([cleanAuditTraceJson]);
    const POST = await importPost();

    await POST(jsonRequest(validBody()));
    const init = (fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(init.body as string);
    const userMsg = body.messages[0].content as string;
    // Authoritative findings appear in the prompt.
    expect(userMsg).toContain('"validatedItems": 9');
    expect(userMsg).toContain('"qualityScore": 95');
    expect(userMsg).toContain("Strong candidate for winner");
    // Rubric and structured packet fields are referenced.
    expect(userMsg).toContain("rubric");
    expect(userMsg).toContain("Wells Fargo");
    expect(userMsg).toContain("hasPermission");
  });

  it("returns 502 for video-analysis trace", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([videoAnalysisAuditTraceJson]);
    const POST = await importPost();
    const res = await POST(jsonRequest(validBody()));
    expect(res.status).toBe(502);
  });

  it("returns 502 for oversized trace", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([oversizedAuditTraceJson]);
    const POST = await importPost();
    const res = await POST(jsonRequest(validBody()));
    expect(res.status).toBe(502);
  });

  it("returns 502 for nine-line trace", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([nineLineAuditTraceJson]);
    const POST = await importPost();
    const res = await POST(jsonRequest(validBody()));
    expect(res.status).toBe(502);
  });

  it("returns 502 for agent-final-authority trace", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([authorityClaimAuditTraceJson]);
    const POST = await importPost();
    const res = await POST(jsonRequest(validBody()));
    expect(res.status).toBe(502);
  });

  it("returns 502 for malformed model output", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchSequence([malformedJsonText]);
    const POST = await importPost();
    const res = await POST(jsonRequest(validBody()));
    expect(res.status).toBe(502);
  });

  it("caches by audit-relevant fields", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchSequence([cleanAuditTraceJson, cleanAuditTraceJson]);
    const POST = await importPost();

    await POST(jsonRequest(validBody()));
    await POST(jsonRequest(validBody()));
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("changed findings bypass the cache", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchSequence([cleanAuditTraceJson, cleanAuditTraceJson]);
    const POST = await importPost();

    const a = validBody();
    const b = {
      ...validBody(),
      findings: { ...sampleAuditFindings, qualityScore: 90 },
    };
    await POST(jsonRequest(a));
    await POST(jsonRequest(b));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
