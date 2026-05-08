// DYD — Fake API layer
// localStorage-backed. Every screen calls these functions; nothing reads
// mock-data.ts directly. Mutations write to localStorage under "dyd:state:v1"
// so the demo survives a refresh.
//
// State is bootstrapped from a "demo stage" preset (see lib/demo-stages.ts).
// The stage switcher in the top bar overwrites the snapshot atomically so the
// demo can jump cleanly between scenes for the recording.

import {
  agentSnapshots,
  currentChallenge,
  evidencePackets,
  users,
} from "./mock-data";
import { STAGE_NOW } from "./format";
import {
  buildSnapshot,
  coerceStage,
  type DemoStage,
} from "./demo-stages";
import { audit } from "@/agents/audit-assistant";
import { extract } from "@/agents/insight-extractor";
import type {
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
  GrowthAssetBundle,
  Notification,
  ReactionKind,
  User,
  Role,
} from "./types";

const STORAGE_KEY = "dyd:state:v1";
const STAGE_KEY = "dyd:stage:v1";
const DEFAULT_STAGE: DemoStage = "launch";
const LATENCY = () => 150 + Math.floor(Math.random() * 150);

interface MutableState {
  participants: Participant[];
  ranking: RankingEntry[];
  feed: FeedPost[];
  evidence: EvidenceSubmission[];
  audits: Record<string, AuditResult>;
  challenge: Challenge;
  currentUserId: string;
  notifications: Notification[];
  /** Has the admin sent the latest audit snapshot to the Daremaster at Day 14? */
  daremasterInsightSent?: boolean;
  /** Has the admin sent the Growth Insight Extractor's bundle to the Daremaster? */
  growthInsightSent?: boolean;
}

let state: MutableState | null = null;

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

function readStage(): DemoStage {
  if (typeof window === "undefined") return DEFAULT_STAGE;
  try {
    const raw = window.localStorage.getItem(STAGE_KEY);
    return coerceStage(raw);
  } catch {}
  return DEFAULT_STAGE;
}

function writeStage(stage: DemoStage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAGE_KEY, stage);
  } catch {}
}

export function getDemoStage(): DemoStage {
  return readStage();
}

/** Resets the world to the canonical snapshot for the given stage. */
export function setDemoStage(stage: DemoStage): void {
  const currentUserId = state?.currentUserId ?? "u-sofia";
  state = buildSnapshot(stage, currentUserId);
  writeStage(stage);
  persist();
}

function hydrate(): MutableState {
  if (state) return state;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        return state!;
      }
    } catch {}
  }
  state = buildSnapshot(readStage(), "u-sofia");
  persist();
  return state;
}

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Broadcast every mutation so subscribers (e.g. the Sidebar lock state)
    // can refresh without waiting for a route change.
    window.dispatchEvent(new CustomEvent("dyd:state-changed"));
  } catch {}
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(clone(value)), LATENCY()));
}

function recomputeRanking(s: MutableState) {
  const sorted = [...s.participants].sort(
    (a, b) => b.selfReportedValue - a.selfReportedValue
  );
  sorted.forEach((p, idx) => (p.hypeRank = idx + 1));
  const max = Math.max(1, sorted[0]?.selfReportedValue ?? 1);
  const auditMap: Record<string, number | undefined> = {};
  s.ranking.forEach((r) => (auditMap[r.id] = r.auditScore));
  s.ranking = sorted.map((p) => ({
    ...p,
    hypeProgress: Math.round((p.selfReportedValue / max) * 100),
    auditScore: auditMap[p.id],
    movement: "flat" as const,
  }));
}

// ── Reads ──────────────────────────────────────────────────────────────────
export async function getChallenge(_id: string = "dyd-001"): Promise<Challenge> {
  return delay(hydrate().challenge);
}

export async function getParticipants(_challengeId: string = "dyd-001"): Promise<Participant[]> {
  return delay(hydrate().participants);
}

export async function getHypeRanking(_challengeId: string = "dyd-001"): Promise<RankingEntry[]> {
  return delay(hydrate().ranking);
}

export async function getFeed(_challengeId: string = "dyd-001", _cursor?: string): Promise<FeedPage> {
  const s = hydrate();
  return delay({
    posts: [...s.feed].sort(
      (a, b) =>
        Number(b.pinned ?? false) - Number(a.pinned ?? false) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    nextCursor: undefined,
  });
}

export async function getMySubmission(
  _challengeId: string,
  userId: string
): Promise<EvidenceSubmission | null> {
  const s = hydrate();
  const p = s.participants.find((x) => x.userId === userId);
  if (!p) return delay(null);
  const ev = s.evidence.find((e) => e.participantId === p.id) ?? null;
  return delay(ev);
}

export async function getAuditQueue(_challengeId: string = "dyd-001"): Promise<AuditResult[]> {
  const s = hydrate();
  return delay(Object.values(s.audits));
}

export async function getAuditResult(participantId: string): Promise<AuditResult | null> {
  const s = hydrate();
  return delay(s.audits[participantId] ?? null);
}

export async function getAgents(): Promise<AgentSnapshot[]> {
  return delay(agentSnapshots);
}

export async function getGrowthAssets(_challengeId: string = "dyd-001"): Promise<InsightBundle> {
  // Run the Growth Insight Extractor live against the approved evidence
  // corpus. Anyone whose audit ended up "approved" or "overridden" counts;
  // the rest are rejections.
  const s = hydrate();
  const audits = Object.values(s.audits);
  const approvedIds = new Set(
    audits.filter((a) => a.adminStatus === "approved" || a.adminStatus === "overridden").map((a) => a.participantId)
  );
  const approvedPackets = Object.values(evidencePackets).filter((p) => approvedIds.has(p.participantId));
  const rejectedCount = audits.filter((a) => a.adminStatus === "rejected").length;

  // The admin no longer approves submissions individually — the audit's
  // recommendation is the gate. Anything not flagged for manual review is
  // valid corpus material for the extractor.
  const packetsToUse = approvedPackets.length
    ? approvedPackets
    : Object.values(evidencePackets).filter((p) => {
        const a = s.audits[p.participantId];
        if (!a) return false;
        return a.recommendation !== "Needs manual review";
      });

  return delay(extract({ approvedPackets: packetsToUse, rejectedCount }));
}

export async function getCurrentUser(): Promise<User> {
  const s = hydrate();
  return delay(users[s.currentUserId] ?? users["u-sofia"]);
}

export async function setRole(role: Role): Promise<User> {
  const s = hydrate();
  const map: Record<Role, string> = {
    participant: "u-sofia",   // Tomi
    admin: "u-admin",         // Gabo
    sponsor: "u-admin",       // legacy fallback — not exposed in the role switcher
    spectator: "u-sofia",     // legacy fallback — not exposed in the role switcher
  };
  s.currentUserId = map[role] ?? "u-sofia";
  persist();
  return delay(users[s.currentUserId] ?? users["u-sofia"]);
}

export async function getNotifications(): Promise<Notification[]> {
  const s = hydrate();
  const stage = readStage();
  // Rebuild per-role notifications on every read so role switches reflect
  // immediately (snapshot was built at hydrate time with whichever role was
  // active then, and may be stale).
  const role: "admin" | "participant" = s.currentUserId === "u-admin" ? "admin" : "participant";
  if (stage === "launch") return delay([]);
  if (role === "admin" && stage === "completed") {
    return delay([
      {
        id: "n-audit-ready",
        title: "AI Audit Assistant ready for final assessments.",
        body: "All submissions are in. Open the Admin Review page to confirm the final board.",
        cta: "Open Admin Review",
        href: "/admin",
        unread: true,
        createdAt: "2026-06-29T18:05:00-03:00",
      },
    ]);
  }
  return delay(s.notifications);
}

// ── Writes ─────────────────────────────────────────────────────────────────
export async function register(_challengeId: string, userId: string): Promise<void> {
  const s = hydrate();
  const existing = s.participants.find((p) => p.userId === userId);
  if (existing) {
    existing.registered = true;
  } else {
    const u = users[userId];
    if (u) {
      s.participants.push({
        id: `p-${userId}`,
        userId,
        name: u.name,
        role: u.jobTitle,
        avatarInitials: u.name.split(" ").map((n) => n[0]).slice(0, 2).join(""),
        registered: true,
        selfReportedValue: 0,
        evidenceStatus: "not_submitted",
        hypeRank: s.participants.length + 1,
        badges: [],
      });
    }
  }
  recomputeRanking(s);
  persist();
  return delay(undefined);
}

export async function updateSelfReport(
  _challengeId: string,
  userId: string,
  value: number
): Promise<Participant> {
  const s = hydrate();
  const p = s.participants.find((x) => x.userId === userId);
  if (!p) throw new Error("Not registered");
  p.selfReportedValue = Math.max(0, value);
  recomputeRanking(s);
  persist();
  return delay(p);
}

export async function submitEvidence(
  challengeId: string,
  userId: string,
  draft: EvidenceDraft
): Promise<EvidenceSubmission> {
  const s = hydrate();
  const p = s.participants.find((x) => x.userId === userId);
  if (!p) throw new Error("Not registered");
  const submission: EvidenceSubmission = {
    id: `ev-${userId}-${Date.now()}`,
    participantId: p.id,
    challengeId,
    submittedAt: new Date().toISOString(),
    ...draft,
  };
  s.evidence = s.evidence.filter((e) => e.participantId !== p.id);
  s.evidence.push(submission);
  p.evidenceStatus = "uploaded";
  p.selfReportedValue += 1;
  recomputeRanking(s);
  persist();
  return delay(submission);
}

export async function postFeedComment(_challengeId: string, content: string): Promise<FeedPost> {
  const s = hydrate();
  const u = users[s.currentUserId];
  // Use the active stage's anchored "now" so the relative timestamp ("3m ago")
  // reads sensibly against the rest of the feed.
  const stage = readStage();
  const stageNow = new Date(STAGE_NOW[stage]).getTime();
  const post: FeedPost = {
    id: `fp-${Date.now()}`,
    author: u?.name ?? "Anonymous",
    authorRole: u?.jobTitle,
    authorType:
      u?.role === "admin" ? "admin" :
      u?.role === "participant" ? "participant" : "employee",
    content,
    createdAt: new Date(stageNow).toISOString(),
    reactions: { fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 },
  };
  s.feed = [post, ...s.feed];
  persist();
  return delay(post);
}

export async function react(postId: string, kind: ReactionKind): Promise<FeedPost> {
  const s = hydrate();
  const p = s.feed.find((x) => x.id === postId);
  if (!p) throw new Error("Not found");
  p.reactions[kind] = (p.reactions[kind] ?? 0) + 1;
  persist();
  return delay(p);
}

export async function adminApprove(participantId: string): Promise<AuditResult> {
  const s = hydrate();
  const a = s.audits[participantId];
  if (!a) throw new Error("Not in queue");
  a.adminStatus = "approved";
  const part = s.participants.find((p) => p.id === participantId);
  if (part) part.evidenceStatus = "approved";
  persist();
  return delay(a);
}

export async function adminReject(participantId: string, reason: string): Promise<AuditResult> {
  const s = hydrate();
  const a = s.audits[participantId];
  if (!a) throw new Error("Not in queue");
  a.adminStatus = "rejected";
  a.flags = [...a.flags, `Admin reason: ${reason}`];
  const part = s.participants.find((p) => p.id === participantId);
  if (part) part.evidenceStatus = "rejected";
  persist();
  return delay(a);
}

export async function adminOverrideScore(participantId: string, score: number): Promise<AuditResult> {
  const s = hydrate();
  const a = s.audits[participantId];
  if (!a) throw new Error("Not in queue");
  a.overrideScore = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  a.adminStatus = "overridden";
  persist();
  return delay(a);
}

export async function adminIssueStrike(participantId: string, _reason: string): Promise<Participant> {
  const s = hydrate();
  const p = s.participants.find((x) => x.id === participantId);
  if (!p) throw new Error("Not found");
  p.strikeIssued = true;
  persist();
  return delay(p);
}

export async function adminDeclareWinner(participantId: string): Promise<Challenge> {
  const s = hydrate();
  s.challenge.winnerId = participantId;
  s.challenge.status = "completed";
  const p = s.participants.find((x) => x.id === participantId);
  if (p) p.finalRank = 1;
  persist();
  return delay(s.challenge);
}

export function resetState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  // Also drop any tuned formula (qualityWeight, rubricWeights, targetItems) so a
  // fresh act= URL always lands on default scoring.
  window.localStorage.removeItem("dyd:formula:v1");
  // Reset always returns the world to Launch (the pristine pre-registration scene).
  window.localStorage.setItem(STAGE_KEY, "launch");
  state = null;
}

// ── Daremaster insight handoff ─────────────────────────────────────────────
//
// At Day 14, the admin can "Send snapshot to Daremaster" from the Admin
// Review page. That flips a flag so the next Daremaster generation produces
// an insightful post (about Charlie being the dark horse) instead of a
// trivial one. The Agents page reads this flag to decide which variant to
// surface.

export async function sendDaremasterSnapshot(): Promise<void> {
  const s = hydrate();
  s.daremasterInsightSent = true;
  persist();
  return delay(undefined);
}

export async function getDaremasterInsightSent(): Promise<boolean> {
  const s = hydrate();
  return delay(!!s.daremasterInsightSent);
}

export async function sendGrowthInsightSnapshot(): Promise<void> {
  const s = hydrate();
  s.growthInsightSent = true;
  persist();
  return delay(undefined);
}

export async function getGrowthInsightSent(): Promise<boolean> {
  const s = hydrate();
  return delay(!!s.growthInsightSent);
}

/** Re-seeds the world from the active stage's preset, preserving the role. */
export function reloadFromStage(): void {
  setDemoStage(readStage());
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent invocations
//
// These helpers let admin-only UI on /agents trigger each agent live. They
// adapt the agent's pure I/O to the API layer (look up state, persist output
// to the world, return the result for the UI to render).
// ─────────────────────────────────────────────────────────────────────────────

/** Build a Daremaster snapshot from the current world state. */
export async function buildDaremasterSnapshot(): Promise<DaremasterSnapshot> {
  const s = hydrate();
  const now = Date.now();
  const days = (iso: string) =>
    Math.round((new Date(iso).getTime() - now) / 86_400_000);
  return clone({
    challenge: {
      id: s.challenge.id,
      title: s.challenge.title,
      registrationDeadline: s.challenge.registrationDeadline,
      submissionDeadline: s.challenge.submissionDeadline,
      status: s.challenge.status,
    },
    ranking: s.ranking,
    participantCount: s.participants.length,
    registeredCount: s.participants.filter((p) => p.registered).length,
    daysToRegistrationDeadline: days(s.challenge.registrationDeadline),
    daysToSubmissionDeadline: days(s.challenge.submissionDeadline),
  });
}

/** Persist a Daremaster post to the feed and return the resulting FeedPost. */
export async function postDaremasterMessage(
  post: DaremasterPost,
  pinned: boolean = false,
  cta?: FeedPost["cta"]
): Promise<FeedPost> {
  const s = hydrate();
  const stage = readStage();
  const stageNow = new Date(STAGE_NOW[stage]).getTime();
  const fp: FeedPost = {
    id: `fp-bot-${Date.now()}`,
    author: "Daremaster",
    authorRole: "DYD Bot",
    authorType: "bot",
    content: post.content,
    createdAt: new Date(stageNow).toISOString(),
    reactions: post.reactions,
    pinned,
    cta,
  };
  // If we're pinning, demote any other pinned post so only one stays at the top.
  if (pinned) s.feed = s.feed.map((p) => (p.pinned ? { ...p, pinned: false } : p));
  s.feed = [fp, ...s.feed];
  persist();
  return delay(fp);
}

/** Toggle a feed post's pinned flag. Demotes any other pinned post when pinning. */
export async function setFeedPostPinned(postId: string, pinned: boolean): Promise<void> {
  const s = hydrate();
  s.feed = s.feed.map((p) => {
    if (p.id === postId) return { ...p, pinned };
    if (pinned && p.pinned) return { ...p, pinned: false };
    return p;
  });
  persist();
  return delay(undefined);
}

/**
 * Re-run the AI Audit Assistant for one participant against the canonical
 * evidence packet. Updates the audit cache in-place — the admin sees a fresh
 * AuditResult on the /admin page after this returns.
 */
export async function runAudit(participantId: string): Promise<AuditResult | null> {
  const packet = evidencePackets[participantId];
  if (!packet) return delay(null);
  const findings = audit({ packet, contract: currentChallenge.auditContract });
  const s = hydrate();
  s.audits[participantId] = findings;
  persist();
  return delay(findings);
}
