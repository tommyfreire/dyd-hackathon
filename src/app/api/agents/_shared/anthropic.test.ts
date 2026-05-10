import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  callAnthropic,
  MissingKeyError,
  ProviderError,
} from "./anthropic";
import { anthropicEnvelope } from "../../../../../tests/fixtures/llmResponses";

const ENDPOINT = "https://api.anthropic.com/v1/messages";

let originalFetch: typeof globalThis.fetch | undefined;
let originalKey: string | undefined;
let originalModel: string | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalKey = process.env.ANTHROPIC_API_KEY;
  originalModel = process.env.ANTHROPIC_MODEL;
});

afterEach(() => {
  if (originalFetch) globalThis.fetch = originalFetch;
  else delete (globalThis as unknown as { fetch?: unknown }).fetch;
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.ANTHROPIC_MODEL;
  else process.env.ANTHROPIC_MODEL = originalModel;
  vi.restoreAllMocks();
});

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number; bodyText?: string } = {}) {
  const fetchSpy = vi.fn(async () => {
    if (init.bodyText !== undefined) {
      return new Response(init.bodyText, {
        status: init.status ?? 200,
        statusText: init.ok === false ? "Error" : "OK",
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      statusText: init.ok === false ? "Error" : "OK",
      headers: { "content-type": "application/json" },
    });
  });
  globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
  return fetchSpy;
}

describe("callAnthropic", () => {
  it("throws MissingKeyError when ANTHROPIC_API_KEY is absent", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    await expect(
      callAnthropic({ agent: "test", system: "s", user: "u" })
    ).rejects.toBeInstanceOf(MissingKeyError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the expected Anthropic request envelope and returns text", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const fetchSpy = mockFetchOnce(anthropicEnvelope("hello world"));

    const out = await callAnthropic({
      agent: "test",
      system: "you are a tester",
      user: "say hello",
      maxTokens: 200,
      temperature: 0.5,
    });

    expect(out).toBe("hello world");
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBeTruthy();
    expect(headers["content-type"]).toBe("application/json");

    const body = JSON.parse(init.body as string);
    expect(body.system).toBe("you are a tester");
    expect(body.max_tokens).toBe(200);
    expect(body.temperature).toBe(0.5);
    expect(body.messages).toEqual([{ role: "user", content: "say hello" }]);
    expect(typeof body.model).toBe("string");
    expect(body.model.length).toBeGreaterThan(0);
  });

  it("uses ANTHROPIC_MODEL override when set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ANTHROPIC_MODEL = "claude-test-override";
    const fetchSpy = mockFetchOnce(anthropicEnvelope("ok"));

    await callAnthropic({ agent: "test", system: "s", user: "u" });

    const body = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.model).toBe("claude-test-override");
  });

  it("uses default model when ANTHROPIC_MODEL is absent", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    delete process.env.ANTHROPIC_MODEL;
    const fetchSpy = mockFetchOnce(anthropicEnvelope("ok"));

    await callAnthropic({ agent: "test", system: "s", user: "u" });

    const body = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.model).toMatch(/^claude-/);
  });

  it("throws ProviderError on fetch rejection", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    globalThis.fetch = vi
      .fn(async () => {
        throw new TypeError("network down");
      }) as unknown as typeof globalThis.fetch;

    await expect(callAnthropic({ agent: "test", system: "s", user: "u" })).rejects.toBeInstanceOf(ProviderError);
  });

  it("throws ProviderError with status on non-2xx", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchOnce({ error: { message: "rate limit" } }, { status: 429, ok: false });
    try {
      await callAnthropic({ agent: "test", system: "s", user: "u" });
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).status).toBe(429);
    }
  });

  it("throws ProviderError on malformed provider JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchOnce(undefined, { bodyText: "not json at all" });

    await expect(callAnthropic({ agent: "test", system: "s", user: "u" })).rejects.toBeInstanceOf(ProviderError);
  });

  it("throws ProviderError on empty text content", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    mockFetchOnce({ content: [] });

    await expect(callAnthropic({ agent: "test", system: "s", user: "u" })).rejects.toBeInstanceOf(ProviderError);
  });
});
