// DYD runtime API.
//
// The public surface stays intentionally stable for the screens. Internally,
// world state now lives in Postgres via server actions; only demo-stage/role
// UI hints and formula tuning remain in localStorage.

import * as agentActions from "@/server/actions/agents";
import * as auditActions from "@/server/actions/audit";
import * as challengeActions from "@/server/actions/challenge";
import * as evidenceActions from "@/server/actions/evidence";
import * as feedActions from "@/server/actions/feed";
import * as participantActions from "@/server/actions/participants";
import { STAGE_NOW } from "./format";
import { coerceStage, type DemoStage } from "./demo-stages";
import { design } from "@/agents/challenge-designer";
import { generate as generateDaremasterFallback } from "@/agents/daremaster";
import { extract } from "@/agents/insight-extractor";
import type {
  ChallengeBrief,
  ChallengeDesignerInput,
  DaremasterPost,
  DaremasterSnapshot,
  InsightBundle,
} from "@/agents/types";
import type {
  Challenge,
  Participant,
  RankingEntry,
  FeedPage,
  FeedPost,
  EvidenceSubmission,
  EvidenceDraft,
  AuditResult,
  AgentSnapshot,
  Notification,
  ReactionKind,
  User,
  Role,
} from "./types";

const STAGE_KEY = "dyd:stage:v1";
const DEFAULT_STAGE: DemoStage = "launch";

function readStage(): DemoStage {
  if (typeof window === "undefined") return DEFAULT_STAGE;
  try {
    return coerceStage(window.localStorage.getItem(STAGE_KEY));
  } catch {
    return DEFAULT_STAGE;
  }
}

function writeStage(stage: DemoStage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAGE_KEY, stage);
  } catch {}
}

function broadcastStateChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("dyd:state-changed"));
  } catch {}
}

export function getDemoStage(): DemoStage {
  return readStage();
}

/** Records the active demo stage for UI formatting. The DB is seeded via /api/seed. */
export function setDemoStage(stage: DemoStage): void {
  writeStage(stage);
  broadcastStateChanged();
}

// -- Reads ------------------------------------------------------------------

export async function getChallenge(id: string = "dyd-001"): Promise<Challenge> {
  return challengeActions.getChallenge(id);
}

export async function getParticipants(challengeId: string = "dyd-001"): Promise<Participant[]> {
  return participantActions.getParticipants(challengeId);
}

export async function getHypeRanking(challengeId: string = "dyd-001"): Promise<RankingEntry[]> {
  return participantActions.getHypeRanking(challengeId);
}

export async function getFeed(challengeId: string = "dyd-001", cursor?: string): Promise<FeedPage> {
  return feedActions.getFeed(challengeId, cursor);
}

export async function getMySubmission(
  challengeId: string,
  userId: string
): Promise<EvidenceSubmission | null> {
  return evidenceActions.getMySubmission(challengeId, userId);
}

export async function getAuditQueue(challengeId: string = "dyd-001"): Promise<AuditResult[]> {
  return auditActions.getAuditQueue(challengeId);
}

export async function getAuditResult(participantId: string): Promise<AuditResult | null> {
  return auditActions.getAuditResult(participantId);
}

export async function getAgents(): Promise<AgentSnapshot[]> {
  return agentActions.getAgents();
}

export async function getCurrentUser(): Promise<User> {
  return challengeActions.getCurrentUser();
}

export async function setRole(role: Role): Promise<User> {
  return challengeActions.setRole(role);
}

export async function getNotifications(): Promise<Notification[]> {
  return challengeActions.getNotifications();
}

// -- Writes -----------------------------------------------------------------

export async function register(challengeId: string, userId: string): Promise<void> {
  await participantActions.register(challengeId, userId);
  broadcastStateChanged();
}

export async function updateSelfReport(
  challengeId: string,
  userId: string,
  value: number
): Promise<Participant> {
  const participant = await participantActions.updateSelfReport(challengeId, userId, value);
  broadcastStateChanged();
  return participant;
}

export async function submitEvidence(
  challengeId: string,
  userId: string,
  draft: EvidenceDraft
): Promise<EvidenceSubmission> {
  const submission = await evidenceActions.submitEvidence(challengeId, userId, draft);
  broadcastStateChanged();
  return submission;
}

export async function postFeedComment(challengeId: string, content: string): Promise<FeedPost> {
  const post = await feedActions.postFeedComment(challengeId, content);
  broadcastStateChanged();
  return post;
}

export async function react(postId: string, kind: ReactionKind): Promise<FeedPost> {
  const post = await feedActions.react(postId, kind);
  broadcastStateChanged();
  return post;
}

export async function adminApprove(participantId: string): Promise<AuditResult> {
  const result = await auditActions.adminApprove(participantId);
  broadcastStateChanged();
  return result;
}

export async function adminReject(participantId: string, reason: string): Promise<AuditResult> {
  const result = await auditActions.adminReject(participantId, reason);
  broadcastStateChanged();
  return result;
}

export async function adminOverrideScore(participantId: string, score: number): Promise<AuditResult> {
  const result = await auditActions.adminOverrideScore(participantId, score);
  broadcastStateChanged();
  return result;
}

export async function adminIssueStrike(participantId: string, reason: string): Promise<Participant> {
  const participant = await participantActions.adminIssueStrike(participantId, reason);
  broadcastStateChanged();
  return participant;
}

export async function adminDeclareWinner(participantId: string): Promise<Challenge> {
  const challenge = await challengeActions.adminDeclareWinner(participantId);
  broadcastStateChanged();
  return challenge;
}

export function resetState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("dyd:formula:v1");
    window.localStorage.setItem(STAGE_KEY, DEFAULT_STAGE);
  } catch {}
}

export async function sendDaremasterSnapshot(): Promise<void> {
  await agentActions.sendDaremasterSnapshot();
  broadcastStateChanged();
}

export async function getDaremasterInsightSent(): Promise<boolean> {
  return agentActions.getDaremasterInsightSent();
}

export async function sendGrowthInsightSnapshot(): Promise<void> {
  await agentActions.sendGrowthInsightSnapshot();
  broadcastStateChanged();
}

export async function getGrowthInsightSent(): Promise<boolean> {
  return agentActions.getGrowthInsightSent();
}

/** Re-seeds are now handled by /api/seed; this keeps old callers stable. */
export function reloadFromStage(): void {
  setDemoStage(readStage());
}

// -- Agent invocations -------------------------------------------------------

export async function buildDaremasterSnapshot(): Promise<DaremasterSnapshot> {
  return agentActions.buildDaremasterSnapshot();
}

const TRIVIAL_VARIANTS: string[] = [
  "The Hype Ranking is heating up. Keep going - every testimonial counts.",
  "Numbers are climbing. Stay focused, the deadline is approaching.",
  "Daredevils are moving fast. Don't fall behind.",
];

const FRESH_REACTIONS = { fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 } as const;

export type DaremasterMode = "trivial" | "insight" | "winner";

export interface GenerateDaremasterOptions {
  /** Index into TRIVIAL_VARIANTS for the trivial mode rotation. Ignored otherwise. */
  trivialIdx?: number;
}

export async function generateDaremasterPost(
  mode: DaremasterMode,
  opts: GenerateDaremasterOptions = {}
): Promise<DaremasterPost> {
  const snapshot =
    mode === "trivial"
      ? await agentActions.buildDaremasterSnapshot()
      : await agentActions.buildDaremasterSnapshotWithAudit();

  if (mode === "trivial") {
    return deterministicDaremasterPost(snapshot, "trivial", opts.trivialIdx ?? 0);
  }

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/agents/daremaster", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ snapshot, mode }),
      });
      if (res.ok) {
        const live = (await res.json()) as DaremasterPost;
        return { ...live, reactions: { ...FRESH_REACTIONS } };
      }
    } catch {
      // Fall through to deterministic fallback.
    }
  }

  return deterministicDaremasterPost(snapshot, mode, opts.trivialIdx ?? 0);
}

async function deterministicDaremasterPost(
  snapshot: DaremasterSnapshot,
  mode: DaremasterMode,
  trivialIdx: number
): Promise<DaremasterPost> {
  const base = generateDaremasterFallback(snapshot);
  let content: string;
  if (mode === "winner") content = await buildWinnerPostContent();
  else if (mode === "insight") content = await buildInsightPostContent();
  else content = TRIVIAL_VARIANTS[trivialIdx % TRIVIAL_VARIANTS.length];
  return { ...base, content, reactions: { ...FRESH_REACTIONS } };
}

async function buildInsightPostContent(): Promise<string> {
  const facts = await agentActions.getDaremasterFallbackFacts();
  return (
    `Charlie is the dark horse. ${facts.charlieValidated} clean testimonials, perfect permissions, every story specific. ` +
    `Bob leads the Hype Ranking with ${facts.bobLead} self-reported - but the audit weighs quality just as hard, ` +
    `and on substance both Patrick and Charlie are ahead of him. Quality is rewriting the leaderboard.`
  );
}

async function buildWinnerPostContent(): Promise<string> {
  const facts = await agentActions.getDaremasterFallbackFacts();
  return (
    `Patrick wins DYD #001. ${facts.patrickValidated} polished testimonials, every story validated, business impact named in every clip. ` +
    `Bob's ${facts.bobLead}-strong Hype lead held for two weeks, but the audit's quality blend tipped the board. ` +
    `Marketing has already turned the corpus into reusable assets - quotes, case studies, sales snippets, LinkedIn drafts.`
  );
}

export async function postDaremasterMessage(
  post: DaremasterPost,
  pinned: boolean = false,
  cta?: FeedPost["cta"]
): Promise<FeedPost> {
  const feedPost = await feedActions.postDaremasterMessage(post, pinned, cta);
  broadcastStateChanged();
  return feedPost;
}

export async function setFeedPostPinned(postId: string, pinned: boolean): Promise<void> {
  await feedActions.setFeedPostPinned(postId, pinned);
  broadcastStateChanged();
}

export async function runAudit(participantId: string): Promise<AuditResult | null> {
  const result = await auditActions.runAudit(participantId);
  broadcastStateChanged();
  return result;
}

export async function getGrowthAssets(_challengeId: string = "dyd-001"): Promise<InsightBundle> {
  const input = await agentActions.getInsightInput();

  if (typeof window !== "undefined" && input.approvedPackets.length > 0) {
    try {
      const res = await fetch("/api/agents/insight-extractor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        return (await res.json()) as InsightBundle;
      }
    } catch {
      // Fall through to deterministic extract().
    }
  }

  return extract(input);
}

export async function generateAuditTrace(
  participantId: string
): Promise<string[] | null> {
  if (typeof window === "undefined") return null;
  const input = await agentActions.getAuditTraceInput(participantId);
  if (!input) return null;
  try {
    const res = await fetch("/api/agents/audit-assistant/trace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { trace?: unknown };
    if (!Array.isArray(data.trace)) return null;
    if (!data.trace.every((line) => typeof line === "string")) return null;
    return data.trace as string[];
  } catch {
    return null;
  }
}

export async function designChallenge(
  input: ChallengeDesignerInput
): Promise<ChallengeBrief> {
  if (typeof window !== "undefined" && input.prompt?.trim()) {
    try {
      const res = await fetch("/api/agents/challenge-designer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        return (await res.json()) as ChallengeBrief;
      }
    } catch {
      // Fall through to deterministic design().
    }
  }
  return design(input);
}

export { STAGE_NOW };
