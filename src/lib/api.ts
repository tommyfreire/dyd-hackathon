// DYD — Fake API layer
// This is the seam. Every screen calls these functions; nothing reads
// mock-data.ts directly. When the backend lands, replace each body with a
// fetch() call to /api/* — keep the signatures EXACTLY the same.
//
// Persistence: mutations are written to localStorage under "dyd:state:v1" so
// demo state survives a refresh. On first load, we hydrate from mock-data.ts.

import {
  currentChallenge,
  participants as seedParticipants,
  rankingEntries as seedRanking,
  feedPosts as seedFeed,
  auditResults as seedAudits,
  evidenceSubmissions as seedEvidence,
  agentSnapshots,
  growthAssets,
  notifications,
  users,
} from "./mock-data";
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
}

let state: MutableState | null = null;

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
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
  state = {
    participants: clone(seedParticipants),
    ranking: clone(seedRanking),
    feed: clone(seedFeed),
    evidence: clone(seedEvidence),
    audits: clone(seedAudits),
    challenge: clone(currentChallenge),
    currentUserId: "u-bob",
    notifications: clone(notifications),
  };
  persist();
  return state;
}

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(clone(value)), LATENCY()));
}

// Recompute the ranking projection after a participant mutation
function recomputeRanking(s: MutableState) {
  const sorted = [...s.participants].sort(
    (a, b) => b.selfReportedValue - a.selfReportedValue
  );
  sorted.forEach((p, idx) => (p.hypeRank = idx + 1));
  const max = Math.max(1, sorted[0].selfReportedValue);
  const auditMap: Record<string, number | undefined> = {};
  s.ranking.forEach((r) => (auditMap[r.id] = r.auditScore));
  s.ranking = sorted.map((p) => ({
    ...p,
    hypeProgress: Math.round((p.selfReportedValue / max) * 100),
    auditScore: auditMap[p.id],
    movement: "flat" as const,
  }));
}

// ─────────── Reads ───────────

export async function getChallenge(_id: string = "dyd-001"): Promise<Challenge> {
  return delay(hydrate().challenge);
}

export async function getParticipants(_challengeId: string): Promise<Participant[]> {
  return delay(hydrate().participants);
}

export async function getHypeRanking(_challengeId: string): Promise<RankingEntry[]> {
  return delay(hydrate().ranking);
}

export async function getFeed(_challengeId: string, _cursor?: string): Promise<FeedPage> {
  const s = hydrate();
  return delay({ posts: [...s.feed].sort((a, b) =>
    (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ), nextCursor: undefined });
}

export async function getMySubmission(_challengeId: string, userId: string): Promise<EvidenceSubmission | null> {
  const s = hydrate();
  const p = s.participants.find((x) => x.userId === userId);
  if (!p) return delay(null);
  const ev = s.evidence.find((e) => e.participantId === p.id) ?? null;
  return delay(ev);
}

export async function getAuditQueue(_challengeId: string): Promise<AuditResult[]> {
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

export async function getGrowthAssets(_challengeId: string): Promise<GrowthAssetBundle> {
  return delay(growthAssets);
}

export async function getCurrentUser(): Promise<User> {
  const s = hydrate();
  return delay(users[s.currentUserId] ?? users["u-bob"]);
}

export async function setRole(role: Role): Promise<User> {
  const s = hydrate();
  const map: Record<Role, string> = {
    participant: "u-bob",
    admin: "u-admin",
    sponsor: "u-sponsor",
    spectator: "u-spectator",
  };
  s.currentUserId = map[role];
  persist();
  return delay(users[s.currentUserId]);
}

export async function getNotifications(): Promise<Notification[]> {
  return delay(hydrate().notifications);
}

// ─────────── Writes ───────────

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

export async function updateSelfReport(_challengeId: string, userId: string, value: number): Promise<Participant> {
  const s = hydrate();
  const p = s.participants.find((x) => x.userId === userId);
  if (!p) throw new Error("Not registered");
  p.selfReportedValue = Math.max(0, value);
  recomputeRanking(s);
  persist();
  return delay(p);
}

export async function submitEvidence(challengeId: string, userId: string, draft: EvidenceDraft): Promise<EvidenceSubmission> {
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
  // Replace any prior draft from this participant
  s.evidence = s.evidence.filter((e) => e.participantId !== p.id);
  s.evidence.push(submission);
  p.evidenceStatus = "uploaded";
  persist();
  return delay(submission);
}

export async function postFeedComment(_challengeId: string, content: string): Promise<FeedPost> {
  const s = hydrate();
  const u = users[s.currentUserId];
  const post: FeedPost = {
    id: `fp-${Date.now()}`,
    author: u?.name ?? "Anonymous",
    authorRole: u?.jobTitle,
    authorType: u?.role === "admin" ? "admin" : u?.role === "participant" ? "participant" : "employee",
    content,
    createdAt: new Date().toISOString(),
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
  a.suggestedFinalScore = score;
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
  state = null;
}
