// DYD — Agent layer types
//
// These shapes describe what each agent CONSUMES and PRODUCES. They are the
// I/O contracts of the agent layer — separate from product types in
// src/lib/types.ts so the agent layer can evolve independently.
//
// When we eventually replace deterministic logic with real LLM calls, the
// implementation of each agent module changes; the input/output shapes here
// stay the same. That's the seam.

import type {
  AuditContract,
  AuditResult,
  Challenge,
  FeedPost,
  GrowthAssetBundle,
  Participant,
  RankingEntry,
  ReactionKind,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Shared evidence shape — fed to both the Audit Assistant and the Insight Extractor.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One unit of evidence inside a participant's submission packet.
 *
 * The fields here are the structured signals the Audit Assistant scores
 * against the rubric — in lieu of real video transcription. Each item
 * represents one testimonial.
 */
export interface EvidenceItem {
  id: string;
  /** Client-side metadata. */
  clientName: string;
  clientCompany: string;
  clientRole: string;
  /** Approximate length of the underlying video / transcript, in seconds. */
  lengthSeconds: number;
  /** Did the client confirm in writing that the testimonial can be reused? */
  hasPermission: boolean;
  /** Does the testimonial mention a concrete business outcome? */
  hasBusinessImpact: boolean;
  /** Does the impact statement include a metric (%, $, time)? */
  hasMetric: boolean;
  /** Free-form text the participant submitted — the "transcript snippet". */
  snippet: string;
  /** Raw business impact one-liner from the participant. */
  impactSummary: string;
}

/** A participant's full submission for one DYD challenge. */
export interface EvidencePacket {
  participantId: string;
  /** What the participant claims as their primary metric (e.g. 18 testimonials). */
  declaredMetric: number;
  items: EvidenceItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Challenge Designer
// ─────────────────────────────────────────────────────────────────────────────

export interface ChallengeDesignerInput {
  /** A one-line growth goal from leadership, e.g. "collect client testimonials". */
  prompt: string;
}

export interface ChallengeBrief {
  title: string;
  subtitle: string;
  description: string;
  growthObjective: string;
  reward: string;
  rules: string[];
  evidenceRequirements: string[];
  primaryMetric: string;
  registrationDays: number;
  submissionDays: number;
  rubric: { key: string; label: string; weight: number }[];
  hypeRankingDisclaimer: string;
  notificationCopy: string;
  botLaunchScript: string;
  /** The canonical Audit Contract this brief implies. */
  auditContract: Pick<AuditContract, "primaryMetric" | "evidence" | "auditMode" | "rubric" | "redFlags" | "finalScoreFormula" | "finalDecisionOwner">;
}

// ─────────────────────────────────────────────────────────────────────────────
// Daremaster
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What the Daremaster looks at to decide what to broadcast.
 * Built from the current world state — see daremaster.ts + buildDaremasterSnapshot().
 */
export interface DaremasterSnapshot {
  challenge: Pick<Challenge, "id" | "title" | "registrationDeadline" | "submissionDeadline" | "status">;
  ranking: RankingEntry[];
  participantCount: number;
  registeredCount: number;
  /** Days from now to the registration deadline (negative = past). */
  daysToRegistrationDeadline: number;
  daysToSubmissionDeadline: number;
}

/** A new feed post the Daremaster wants to publish. */
export interface DaremasterPost {
  /** Why the bot picked this template — used to label the agent's "trace". */
  trigger:
    | "launch"
    | "leaderboard_movement"
    | "quality_threat"
    | "deadline_pressure"
    | "early_quiet"
    | "ranking_tension"
    | "registration_confirmation";
  content: string;
  reactions: Record<ReactionKind, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Audit Assistant
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditInput {
  packet: EvidencePacket;
  contract: AuditContract;
}

/**
 * The Audit Assistant's full output. Extends AuditResult with the receipts —
 * the rubric breakdown and the math trail used to derive the final score.
 * Admins approve or override; nothing here is final.
 */
export interface AuditFindings extends AuditResult {
  /** Per-rubric-criterion score, derived from the evidence items. */
  rubricBreakdown: { key: string; label: string; score: number; max: number; note?: string }[];
  /**
   * Step-by-step explanation a human can read:
   * "11 of 18 items validated → 46/100 quality → 0.55 multiplier → 6.05 final."
   * This is what gets shown when the admin clicks "How this score is computed".
   */
  trace: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Growth Insight Extractor
// ─────────────────────────────────────────────────────────────────────────────

export interface InsightInput {
  approvedPackets: EvidencePacket[];
  /** Rejected count, used for the totals row. */
  rejectedCount: number;
}

export type InsightBundle = GrowthAssetBundle & {
  /** ISO timestamp of when this bundle was generated. */
  generatedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Common
// ─────────────────────────────────────────────────────────────────────────────

/** Identifies which agent emitted a given output, for UI traces. */
export type AgentId =
  | "challenge_designer"
  | "daremaster"
  | "audit_assistant"
  | "insight_extractor";

// Re-export only what's broadly needed downstream so callers can `import { ... } from "@/agents/types"`.
export type { Participant, FeedPost };
