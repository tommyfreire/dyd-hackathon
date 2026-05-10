// Anthropic pricing constants and cost helper.
//
// Values verified against the Anthropic pricing page on 2026-05-10. Re-verify
// before any large live-run if the constants are suspected stale; pricing is
// the kind of thing that shifts quietly.
//
// Numbers are USD per million tokens, separated by direction.

export interface ModelPricing {
  in: number;
  out: number;
}

/** Canonical pricing table. Short aliases share the dated identifier's values. */
export const PRICING: Record<string, ModelPricing> = {
  // Haiku 4.5 — the project default.
  "claude-haiku-4-5":             { in: 1.0,  out: 5.0  },
  "claude-haiku-4-5-20251001":    { in: 1.0,  out: 5.0  },

  // Sonnet 4.6 — escalation if a specific agent's quality demands it.
  "claude-sonnet-4-6":            { in: 3.0,  out: 15.0 },
  "claude-sonnet-4-6-20251001":   { in: 3.0,  out: 15.0 },

  // Opus 4.7 — overkill for these prompts; included for completeness.
  "claude-opus-4-7":              { in: 5.0,  out: 25.0 },
  "claude-opus-4-7-20251001":     { in: 5.0,  out: 25.0 },
};

/** Default model used when an unknown id reaches `costFor`. */
const DEFAULT_PRICING_KEY = "claude-haiku-4-5";

/**
 * Compute USD cost for a single Anthropic call given token counts and model.
 * Falls back to Haiku 4.5 pricing if the model id is unrecognized — but this
 * silently absorbs new models, so a missing-id console warning would be a
 * reasonable Tier-2 hardening.
 */
export function costFor(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING[DEFAULT_PRICING_KEY];
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}

/** Format a USD amount with four decimal places — calls in the demo cost cents-of-cents. */
export function formatUsd(usd: number): string {
  return `$${usd.toFixed(4)}`;
}
