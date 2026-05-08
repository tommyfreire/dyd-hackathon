// DYD — AI Audit Assistant
//
// Reads structured evidence packets and applies the challenge's Audit Contract:
// scores each rubric criterion, detects red flags, computes a final score, and
// emits a recommendation. The admin remains the final decision owner — every
// piece of UI that surfaces this agent's output must say so.
//
// Demo invariant the math must support: Bob declares 18, Patrick declares 9,
// Patrick wins. That falls out of:
//   final_score = validated_items × quality_multiplier
// with multiplier banded by the weighted rubric score.
//
// Real-LLM swap: replace `audit()` with a server call that sends `packet` +
// `contract` to the model and parses a JSON response in `AuditFindings` shape.
// Inputs and outputs don't change.

import type { AuditContract } from "@/lib/types";
import { computeFormulaScore, DEFAULT_FORMULA } from "@/lib/formula";
import type {
  AuditFindings,
  AuditInput,
  EvidenceItem,
  EvidencePacket,
} from "./types";

// ─── Rubric scorers — one per criterion key in the Audit Contract ───────────
//
// Each scorer returns a 0..1 fraction; the contract's `weight` (out of 100)
// scales it into rubric points. Splitting by criterion keeps the logic
// readable and makes it obvious where each input signal feeds in.

type Scorer = (items: EvidenceItem[]) => { fraction: number; note?: string };

const SCORERS: Record<string, Scorer> = {
  clarity: (items) => {
    if (!items.length) return { fraction: 0 };
    // Items between 30s and 180s are "clear"; very short or rambly items lose points.
    const clear = items.filter((i) => i.lengthSeconds >= 30 && i.lengthSeconds <= 180).length;
    const fraction = clear / items.length;
    const note =
      fraction < 0.5
        ? `${items.length - clear} items too short or too long`
        : fraction === 1
        ? "All items in the clarity sweet spot"
        : undefined;
    return { fraction, note };
  },

  businessImpact: (items) => {
    if (!items.length) return { fraction: 0 };
    const withImpact = items.filter((i) => i.hasBusinessImpact).length;
    const withMetric = items.filter((i) => i.hasMetric).length;
    // Weighted: presence of impact gets you 60% credit, a concrete metric the rest.
    const fraction = (withImpact * 0.6 + withMetric * 0.4) / items.length;
    const note =
      withMetric === items.length
        ? "Concrete metrics in every item"
        : withImpact < items.length
        ? `${items.length - withImpact} items lack a clear business outcome`
        : undefined;
    return { fraction, note };
  },

  clientRelevance: (items) => {
    if (!items.length) return { fraction: 0 };
    // Proxy: item is "relevant" if it names both a company and a role.
    const relevant = items.filter((i) => !!i.clientCompany && !!i.clientRole).length;
    return { fraction: relevant / items.length };
  },

  specificity: (items) => {
    if (!items.length) return { fraction: 0 };
    // Specific = mentions a metric AND has a non-trivial impact summary.
    const specific = items.filter((i) => i.hasMetric && i.impactSummary.length > 40).length;
    const fraction = specific / items.length;
    const note =
      fraction < 0.5 ? "Few items include concrete metrics" : undefined;
    return { fraction, note };
  },

  permissionCompleteness: (items) => {
    if (!items.length) return { fraction: 0 };
    const withPermission = items.filter((i) => i.hasPermission).length;
    const fraction = withPermission / items.length;
    const note =
      withPermission === items.length
        ? "All permissions secured"
        : `${items.length - withPermission} missing permission`;
    return { fraction, note };
  },
};

// ─── Validators — identify items that do NOT count toward the validated total
//
// Mirrors the contract's `redFlags`. Each returns the items it disqualified
// with a human label.

interface RedFlag { key: string; label: string; itemIds: string[]; }

function detectRedFlags(packet: EvidencePacket, contract: AuditContract): RedFlag[] {
  const flags: RedFlag[] = [];

  if (contract.redFlags.includes("testimonial_under_10_seconds")) {
    const ids = packet.items.filter((i) => i.lengthSeconds < 10).map((i) => i.id);
    if (ids.length) flags.push({ key: "testimonial_under_10_seconds", label: `${ids.length} testimonials under 10s`, itemIds: ids });
  }
  if (contract.redFlags.includes("missing_client_permission")) {
    const ids = packet.items.filter((i) => !i.hasPermission).map((i) => i.id);
    if (ids.length) flags.push({ key: "missing_client_permission", label: `${ids.length} missing permission confirmation`, itemIds: ids });
  }
  if (contract.redFlags.includes("unclear_business_impact")) {
    const ids = packet.items.filter((i) => !i.hasBusinessImpact).map((i) => i.id);
    if (ids.length) flags.push({ key: "unclear_business_impact", label: `${ids.length} unclear business impact`, itemIds: ids });
  }
  // duplicate_submission and not_related_to_bairesdev would need a corpus
  // analysis pass; not implemented in MVP.

  return flags;
}

function recommendationFor(args: {
  qualityScore: number;
  validatedShare: number;
  declaredMetric: number;
  validatedItems: number;
  flagsCount: number;
}): string {
  const { qualityScore, validatedShare, declaredMetric, validatedItems, flagsCount } = args;
  // Manual-review trigger first — anything shaky goes to a human.
  if (qualityScore < 60 || validatedShare < 0.7) return "Needs manual review";
  // Strong candidate: high quality, every item validated, sizable declaration.
  if (qualityScore >= 85 && validatedItems === declaredMetric && declaredMetric >= 8) {
    return "Strong candidate for winner";
  }
  // Dark horse: clean, high-quality, but small declaration.
  if (qualityScore >= 80 && flagsCount === 0 && declaredMetric < 8) {
    return "Dark horse candidate";
  }
  return "Good submission";
}

// ─── The agent's public entry point ─────────────────────────────────────────

/**
 * Audit a participant's submission. Pure function — no I/O, no side effects.
 *
 * @returns A complete AuditFindings record with rubric breakdown and a
 *          human-readable trace. The admin sees this. The admin decides.
 */
export function audit({ packet, contract }: AuditInput): AuditFindings {
  // 1. Score each rubric criterion.
  const breakdown = contract.rubric.map((r) => {
    const scorer = SCORERS[r.key];
    const { fraction, note } = scorer
      ? scorer(packet.items)
      : { fraction: 0, note: "No scorer registered for this criterion" };
    return {
      key: r.key,
      label: r.label,
      score: Math.round(fraction * r.weight),
      max: r.weight,
      note,
    };
  });

  // 2. Sum to a 0–100 quality score (rubric weights sum to 100 by contract).
  const qualityScore = breakdown.reduce((sum, b) => sum + b.score, 0);

  // 3. Detect red flags and back out validated items.
  const flags = detectRedFlags(packet, contract);
  const flaggedItemIds = new Set(flags.flatMap((f) => f.itemIds));
  const validatedItems = packet.items.length - flaggedItemIds.size;
  const rejectedItems = flaggedItemIds.size;
  const validatedShare = packet.items.length === 0 ? 0 : validatedItems / packet.items.length;

  // 4. Final score is derived by the admin's scoring formula. We snapshot a
  //    suggestion using the default config so anyone reading the AuditResult
  //    in isolation has a sensible number — but the live UI always recomputes
  //    via formula.ts whenever the admin tweaks the weights.
  const suggestedFinalScore = computeFormulaScore(
    { qualityScore, validatedItems },
    DEFAULT_FORMULA
  );

  // 5. Recommendation + receipt.
  const recommendation = recommendationFor({
    qualityScore,
    validatedShare,
    declaredMetric: packet.declaredMetric,
    validatedItems,
    flagsCount: flags.length,
  });

  const trace = [
    `Declared metric: ${packet.declaredMetric} testimonials.`,
    `Items submitted: ${packet.items.length}.`,
    flags.length === 0
      ? `No red flags. All ${packet.items.length} items pass validation.`
      : `Red flags: ${flags.map((f) => f.label).join("; ")}.`,
    `Validated items: ${validatedItems} (rejected ${rejectedItems}).`,
    `Rubric weighted score: ${qualityScore}/100.`,
    `Recommendation: ${recommendation}. Final decision requires admin approval.`,
  ];

  return {
    participantId: packet.participantId,
    declaredMetric: packet.declaredMetric,
    validatedItems,
    rejectedItems,
    qualityScore,
    suggestedFinalScore,
    flags: flags.map((f) => f.label),
    recommendation,
    adminStatus: "pending",
    rubricBreakdown: breakdown,
    trace,
  };
}
