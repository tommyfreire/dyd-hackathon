// DYD — Shared types
// Lifted directly from DYD_PRODUCT_CONTEXT.md (PRD §"Data Model Suggestions")
// and extended where the first draft needed more shape than the PRD provided.
// Keep this file canonical — never redeclare these types in components.

export type Role = "participant" | "admin" | "sponsor" | "spectator";

export type ChallengeStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "review"
  | "completed";

export type EvidenceStatus =
  | "not_submitted"
  | "uploaded"
  | "pending_review"
  | "ai_reviewed"
  | "approved"
  | "rejected"
  | "needs_clarification";

export type AdminStatus = "pending" | "approved" | "rejected" | "overridden";

export type ReactionKind = "fire" | "clap" | "rocket" | "eyes" | "trophy";

export type AgentKind =
  | "challenge_designer"
  | "hype_bot"
  | "audit_assistant"
  | "insight_extractor";

export type FeedAuthorType = "bot" | "participant" | "admin" | "employee";

export interface User {
  id: string;
  name: string;
  role: Role;
  jobTitle: string;
  avatarUrl?: string;
}

export interface AuditContractRubricItem {
  key: string;
  label: string;
  weight: number;
}

export interface AuditContract {
  challengeId: string;
  name: string;
  primaryMetric: {
    key: string;
    label: string;
    type: "number" | "duration";
    higherIsBetter: boolean;
  };
  evidence: {
    acceptedTypes: string[];
    requiredFields: string[];
  };
  auditMode: "ai_assisted_human_approved" | "human_only" | "ai_only";
  rubric: AuditContractRubricItem[];
  redFlags: string[];
  finalScoreFormula: string;
  finalDecisionOwner: "admins" | "sponsor" | "ai";
}

export interface Challenge {
  id: string;
  number: string;             // e.g. "DYD #001"
  title: string;
  subtitle: string;
  description: string;
  sponsor: string;
  reward: string;
  rewardSubtitle: string;     // e.g. "+ dinner with leadership"
  registrationDeadline: string;
  submissionDeadline: string;
  status: ChallengeStatus;
  primaryMetricLabel: string;
  primaryMetricKey: string;
  hypeRankingDisclaimer: string;
  rules: string[];
  evidenceRequirements: string[];
  auditContract: AuditContract;
  winnerId?: string;          // populated when status = completed
}

export interface Participant {
  id: string;
  userId: string;
  name: string;
  role: string;               // job title
  avatarInitials: string;
  registered: boolean;
  selfReportedValue: number;
  evidenceStatus: EvidenceStatus;
  hypeRank: number;
  finalRank?: number;
  badges: string[];           // e.g. "On fire", "Quality threat"
  strikeRisk?: boolean;
  strikeIssued?: boolean;
}

export interface RankingEntry extends Participant {
  hypeProgress: number;       // 0–100 — for the visual bar
  auditScore?: number;        // 0–100, undefined if no audit yet
  movement: "up" | "down" | "flat" | "new";
}

export interface EvidenceFile {
  id: string;
  name: string;
  sizeKb: number;
  kind: "video" | "zip" | "text" | "image" | "other";
  uploadedAt: string;
}

export interface EvidenceDraft {
  files: EvidenceFile[];
  clientName?: string;
  clientCompany?: string;
  clientRole?: string;
  permissionToUse: boolean;
  businessImpactSummary: string;
}

export interface EvidenceSubmission extends EvidenceDraft {
  id: string;
  participantId: string;
  challengeId: string;
  submittedAt: string;
}

export interface AuditResult {
  participantId: string;
  declaredMetric: number;
  validatedItems: number;
  rejectedItems: number;
  qualityScore: number;        // 0–100
  /** Legacy multiplier from the v1 scoring band. Kept optional for back-compat. */
  qualityMultiplier?: number;
  /** Snapshot of the formula score at audit time (admin formula recomputes live). */
  suggestedFinalScore: number;
  /** Admin-entered override on the 0–10 final scale. Takes precedence over the formula. */
  overrideScore?: number;
  flags: string[];
  recommendation: string;
  adminStatus: AdminStatus;
  /** Per-criterion scores. Populated when produced by the AI Audit Assistant. */
  rubricBreakdown?: { key: string; label?: string; score: number; max?: number; note?: string }[];
  /** Step-by-step explanation of how the suggested final score was derived. */
  trace?: string[];
}

export interface FeedComment {
  id: string;
  author: string;
  authorType: FeedAuthorType;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  author: string;
  authorRole?: string;
  authorType: FeedAuthorType;
  content: string;
  createdAt: string;
  reactions: Record<ReactionKind, number>;
  comments?: FeedComment[];
  pinned?: boolean;
  /** Optional inline call-to-action rendered below the post body. */
  cta?: { label: string; href: string };
}

export interface AgentSnapshot {
  id: AgentKind;
  name: string;
  purpose: string;
  sampleInput: string;
  latestOutput: string;
  status: "idle" | "running" | "ready" | "error";
  lastActionAt: string;
}

export interface GrowthAssetBundle {
  challengeId: string;
  totals: {
    submitted: number;
    approved: number;
    rejected: number;
    quotes: number;
    caseStudies: number;
    snippets: number;
    linkedinPosts: number;
  };
  topQuotes: { quote: string; client: string; company: string }[];
  caseStudies: { title: string; summary: string; client: string }[];
  snippets: { tag: string; text: string }[];
  linkedinPosts: { title: string; body: string }[];
}

export interface FeedPage {
  posts: FeedPost[];
  nextCursor?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  unread: boolean;
  createdAt: string;
}
