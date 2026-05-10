// DYD — Scoring formula
//
// The Audit Assistant only emits raw signals: rubric-derived qualityScore
// (0–100) and validatedItems (0..N). The final 0–10 score is a blend of
// quality and quantity, and the blend is admin-tunable. Living here so the
// admin /admin page and the agent /agents page agree on what the score means.

import type { AuditResult } from "./types";

export interface ScoringFormulaConfig {
  /** Weight of the quality term in [0, 1]. The quantity term gets (1 − this). */
  qualityWeight: number;
  /** Validated-items count that maxes out the quantity term. */
  targetItems: number;
  /**
   * Per-rubric-criterion weights for the Quality term. Keys map to the
   * AuditContract's rubric keys (clarity, businessImpact, …). Raw numbers —
   * not required to sum to 100; we normalize at use-time. When undefined,
   * the audit's contract weights apply.
   */
  rubricWeights?: Record<string, number>;
}

export const DEFAULT_FORMULA: ScoringFormulaConfig = {
  qualityWeight: 0.7,
  targetItems: 12,
};

const KEY = "dyd:formula:v1";

export function loadFormula(): ScoringFormulaConfig {
  if (typeof window === "undefined") return DEFAULT_FORMULA;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_FORMULA;
    const parsed = JSON.parse(raw) as Partial<ScoringFormulaConfig>;
    const rubricWeights =
      parsed.rubricWeights && typeof parsed.rubricWeights === "object"
        ? Object.fromEntries(
            Object.entries(parsed.rubricWeights).filter(
              ([, v]) => typeof v === "number" && Number.isFinite(v) && v >= 0
            )
          )
        : undefined;
    return {
      qualityWeight:
        typeof parsed.qualityWeight === "number" && parsed.qualityWeight >= 0 && parsed.qualityWeight <= 1
          ? parsed.qualityWeight
          : DEFAULT_FORMULA.qualityWeight,
      targetItems:
        typeof parsed.targetItems === "number" && parsed.targetItems > 0
          ? Math.round(parsed.targetItems)
          : DEFAULT_FORMULA.targetItems,
      rubricWeights: rubricWeights && Object.keys(rubricWeights).length ? rubricWeights : undefined,
    };
  } catch {
    return DEFAULT_FORMULA;
  }
}

export function saveFormula(c: ScoringFormulaConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
}

const SENT_KEY = "dyd:formula-last-sent:v1";

export function loadLastSentFormula(): ScoringFormulaConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    return raw ? (JSON.parse(raw) as ScoringFormulaConfig) : null;
  } catch {
    return null;
  }
}

export function saveLastSentFormula(c: ScoringFormulaConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SENT_KEY, JSON.stringify(c));
  } catch {}
}

export function formulasEqual(a: ScoringFormulaConfig, b: ScoringFormulaConfig): boolean {
  if (a.qualityWeight !== b.qualityWeight) return false;
  if (a.targetItems !== b.targetItems) return false;
  const aw = a.rubricWeights ?? {};
  const bw = b.rubricWeights ?? {};
  const ak = Object.keys(aw);
  const bk = Object.keys(bw);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (aw[k] !== bw[k]) return false;
  return true;
}

type Signals = Pick<AuditResult, "qualityScore" | "validatedItems" | "rubricBreakdown">;

/**
 * Re-derive the 0–100 quality score using the admin's rubric weights when
 * present. Each criterion contributes (score/max) × weight, normalized by the
 * total weight so the result stays bounded regardless of what raw values the
 * admin types in. When no override is configured, returns the audit's
 * contract-derived qualityScore as-is.
 */
export function effectiveQualityScore(
  a: Pick<AuditResult, "qualityScore" | "rubricBreakdown">,
  c: ScoringFormulaConfig
): number {
  const breakdown = a.rubricBreakdown ?? [];
  const weights = c.rubricWeights;
  if (!weights || !breakdown.length) return a.qualityScore;
  const totalWeight = breakdown.reduce(
    (sum, b) => sum + (weights[b.key] ?? 0),
    0
  );
  if (totalWeight <= 0) return a.qualityScore;
  const weighted = breakdown.reduce((sum, b) => {
    const max = b.max && b.max > 0 ? b.max : 1;
    const fraction = clamp(b.score / max, 0, 1);
    const w = weights[b.key] ?? 0;
    return sum + fraction * w;
  }, 0);
  return clamp((weighted / totalWeight) * 100, 0, 100);
}

export function qualityComponent(a: Signals, c: ScoringFormulaConfig): number {
  return clamp(effectiveQualityScore(a, c) / 10, 0, 10);
}

export function quantityComponent(
  a: Pick<AuditResult, "validatedItems">,
  c: ScoringFormulaConfig
): number {
  const target = Math.max(1, c.targetItems);
  return clamp((a.validatedItems / target) * 10, 0, 10);
}

export function computeFormulaScore(a: Signals, c: ScoringFormulaConfig): number {
  const q = qualityComponent(a, c);
  const n = quantityComponent(a, c);
  return round1(q * c.qualityWeight + n * (1 - c.qualityWeight));
}

/** Returns the displayed score: admin override if set, otherwise formula. */
export function effectiveFinalScore(
  a: Pick<AuditResult, "qualityScore" | "validatedItems" | "overrideScore" | "rubricBreakdown">,
  c: ScoringFormulaConfig
): number {
  if (typeof a.overrideScore === "number") return round1(a.overrideScore);
  return computeFormulaScore(a, c);
}

export function formulaTrace(a: Signals, c: ScoringFormulaConfig): string[] {
  const q = qualityComponent(a, c);
  const n = quantityComponent(a, c);
  const eq = effectiveQualityScore(a, c);
  const score = computeFormulaScore(a, c);
  const w = Math.round(c.qualityWeight * 100);
  return [
    `Quality component = ${eq.toFixed(0)}/100 ÷ 10 = ${q.toFixed(1)}/10`,
    `Quantity component = min(${a.validatedItems}/${c.targetItems}, 1) × 10 = ${n.toFixed(1)}/10`,
    `Final = ${q.toFixed(1)} × ${w}% + ${n.toFixed(1)} × ${100 - w}% = ${score.toFixed(1)}/10`,
  ];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
