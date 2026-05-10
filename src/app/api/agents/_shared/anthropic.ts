// Server-side Anthropic Messages caller. Uses native fetch — no SDK.
//
// Reads ANTHROPIC_API_KEY at request time. Demos must run without a key, so
// callers MUST treat `MissingKeyError` as a normal fallback signal, not a
// crash. Other errors (network, non-2xx, malformed body) are also recoverable
// and bubble up as `ProviderError`.

import { recordCall } from "./costLog";
import { costFor } from "./pricing";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5";

export class MissingKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set");
    this.name = "MissingKeyError";
  }
}

export class ProviderError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

export interface CallOptions {
  agent: string;
  system: string;
  user: string;
  /** Hard upper bound on output tokens. Keep small — these prompts are tight. */
  maxTokens?: number;
  /** 0 = deterministic, 1 = creative. We default low for shape stability. */
  temperature?: number;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export interface RawProviderOutput {
  agent: string;
  model: string;
  text: string;
}

const rawOutputs: RawProviderOutput[] = [];

export function getRawProviderOutputs(): readonly RawProviderOutput[] {
  return rawOutputs;
}

export function resetRawProviderOutputs(): void {
  rawOutputs.length = 0;
}

function usageTokens(parsed: AnthropicResponse): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: Math.max(0, Math.round(parsed.usage?.input_tokens ?? 0)),
    outputTokens: Math.max(0, Math.round(parsed.usage?.output_tokens ?? 0)),
  };
}

function recordUsage(agent: string, model: string, parsed: AnthropicResponse): void {
  const { inputTokens, outputTokens } = usageTokens(parsed);
  recordCall({
    agent,
    model,
    inputTokens,
    outputTokens,
    cost: costFor(model, inputTokens, outputTokens),
  });
}

/**
 * Calls Anthropic Messages and returns the concatenated text content.
 * Throws `MissingKeyError` when no key is set, `ProviderError` otherwise.
 */
export async function callAnthropic(opts: CallOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingKeyError();

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const body = {
    model,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new ProviderError(`fetch failed: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try {
      const parsed = JSON.parse(text) as AnthropicResponse;
      if (parsed.usage) recordUsage(opts.agent, model, parsed);
    } catch {}
    throw new ProviderError(
      `Anthropic ${res.status}: ${text.slice(0, 200)}`,
      res.status
    );
  }

  let parsed: AnthropicResponse;
  try {
    parsed = (await res.json()) as AnthropicResponse;
  } catch (err) {
    throw new ProviderError(`response not JSON: ${(err as Error).message}`);
  }

  if (parsed.error) {
    if (parsed.usage) recordUsage(opts.agent, model, parsed);
    throw new ProviderError(parsed.error.message ?? "provider error");
  }

  const text = (parsed.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!)
    .join("\n")
    .trim();

  if (!text) throw new ProviderError("empty response");
  recordUsage(opts.agent, model, parsed);
  rawOutputs.push({ agent: opts.agent, model, text });
  return text;
}
