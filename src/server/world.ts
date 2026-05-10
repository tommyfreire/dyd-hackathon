import { Prisma } from "@prisma/client";
import { audit } from "@/agents/audit-assistant";
import {
  agentSnapshots,
  currentChallenge,
  evidencePackets as seedEvidencePackets,
  notifications as seedNotifications,
  users as seedUsers,
} from "@/lib/mock-data";
import { STAGE_NOW } from "@/lib/format";
import { buildSnapshot, coerceStage, type DemoStage } from "@/lib/demo-stages";
import { prisma } from "./db";
import type {
  AuditFindings,
  DaremasterPost,
  DaremasterSnapshot,
  EvidenceItem,
  EvidencePacket,
} from "@/agents/types";
import type {
  AgentSnapshot,
  AuditResult,
  Challenge,
  EvidenceDraft,
  EvidenceSubmission,
  FeedPage,
  FeedPost,
  GrowthAssetBundle,
  Notification,
  Participant,
  RankingEntry,
  ReactionKind,
  Role,
  User,
} from "@/lib/types";

const CHALLENGE_ID = "dyd-001";

const ROLE_TO_USER_ID: Record<Role, string> = {
  participant: "u-sofia",
  admin: "u-admin",
  sponsor: "u-admin",
  spectator: "u-sofia",
};

const EMPTY_REACTIONS: Record<ReactionKind, number> = {
  fire: 0,
  clap: 0,
  rocket: 0,
  eyes: 0,
  trophy: 0,
};

export const TRUNCATE_WORLD_SQL = Prisma.sql`
  TRUNCATE TABLE
    "FeedPost",
    "AuditResult",
    "EvidenceSubmission",
    "EvidenceItem",
    "EvidencePacket",
    "Participant",
    "ChallengeState",
    "Challenge",
    "User"
  RESTART IDENTITY CASCADE
`;

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return clone(value) as Prisma.InputJsonValue;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...EMPTY_REACTIONS };
  return value as Record<string, number>;
}

function iso(value: Date): string {
  return value.toISOString();
}

function parseDate(value: string): Date {
  return new Date(value);
}

function roleToUserId(role: Role): string {
  return ROLE_TO_USER_ID[role] ?? "u-sofia";
}

function currentStageLabel(stage: string): DemoStage {
  return coerceStage(stage);
}

function mapUser(row: {
  id: string;
  name: string;
  role: string;
  jobTitle: string;
  avatarInitials: string | null;
}): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role as Role,
    jobTitle: row.jobTitle,
  };
}

function mapChallenge(row: {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  sponsor: string;
  reward: string;
  rewardSubtitle: string;
  registrationDeadline: Date;
  submissionDeadline: Date;
  status: string;
  primaryMetricLabel: string;
  primaryMetricKey: string;
  hypeRankingDisclaimer: string;
  rules: Prisma.JsonValue;
  evidenceRequirements: Prisma.JsonValue;
  auditContract: Prisma.JsonValue;
  winnerId: string | null;
}): Challenge {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    sponsor: row.sponsor,
    reward: row.reward,
    rewardSubtitle: row.rewardSubtitle,
    registrationDeadline: iso(row.registrationDeadline),
    submissionDeadline: iso(row.submissionDeadline),
    status: row.status as Challenge["status"],
    primaryMetricLabel: row.primaryMetricLabel,
    primaryMetricKey: row.primaryMetricKey,
    hypeRankingDisclaimer: row.hypeRankingDisclaimer,
    rules: asArray<string>(row.rules),
    evidenceRequirements: asArray<string>(row.evidenceRequirements),
    auditContract: row.auditContract as unknown as Challenge["auditContract"],
    winnerId: row.winnerId ?? undefined,
  };
}

function mapParticipant(row: {
  id: string;
  userId: string;
  name: string;
  role: string;
  avatarInitials: string;
  registered: boolean;
  selfReportedValue: number;
  evidenceStatus: string;
  hypeRank: number;
  finalRank: number | null;
  badges: Prisma.JsonValue;
  strikeRisk: boolean;
  strikeIssued: boolean;
}): Participant {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    role: row.role,
    avatarInitials: row.avatarInitials,
    registered: row.registered,
    selfReportedValue: row.selfReportedValue,
    evidenceStatus: row.evidenceStatus as Participant["evidenceStatus"],
    hypeRank: row.hypeRank,
    finalRank: row.finalRank ?? undefined,
    badges: asArray<string>(row.badges),
    strikeRisk: row.strikeRisk,
    strikeIssued: row.strikeIssued,
  };
}

function mapRankingEntry(
  row: Parameters<typeof mapParticipant>[0] & { movement: string },
  maxValue: number
): RankingEntry {
  const p = mapParticipant(row);
  return {
    ...p,
    hypeProgress: maxValue === 0 ? 0 : Math.round((p.selfReportedValue / maxValue) * 100),
    auditScore: undefined,
    movement: ["up", "down", "flat", "new"].includes(row.movement)
      ? (row.movement as RankingEntry["movement"])
      : "flat",
  };
}

function mapFeedPost(row: {
  id: string;
  author: string;
  authorRole: string | null;
  authorType: string;
  content: string;
  createdAt: Date;
  reactions: Prisma.JsonValue;
  comments: Prisma.JsonValue | null;
  pinned: boolean;
  ctaLabel: string | null;
  ctaHref: string | null;
}): FeedPost {
  const cta = row.ctaLabel && row.ctaHref ? { label: row.ctaLabel, href: row.ctaHref } : undefined;
  return {
    id: row.id,
    author: row.author,
    authorRole: row.authorRole ?? undefined,
    authorType: row.authorType as FeedPost["authorType"],
    content: row.content,
    createdAt: iso(row.createdAt),
    reactions: asRecord(row.reactions) as FeedPost["reactions"],
    comments: row.comments ? asArray(row.comments) : undefined,
    pinned: row.pinned,
    cta,
  };
}

function mapEvidenceSubmission(row: {
  id: string;
  participantId: string;
  challengeId: string;
  submittedAt: Date;
  files: Prisma.JsonValue;
  clientName: string | null;
  clientCompany: string | null;
  clientRole: string | null;
  permissionToUse: boolean;
  businessImpactSummary: string;
}): EvidenceSubmission {
  return {
    id: row.id,
    participantId: row.participantId,
    challengeId: row.challengeId,
    submittedAt: iso(row.submittedAt),
    files: asArray(row.files),
    clientName: row.clientName ?? undefined,
    clientCompany: row.clientCompany ?? undefined,
    clientRole: row.clientRole ?? undefined,
    permissionToUse: row.permissionToUse,
    businessImpactSummary: row.businessImpactSummary,
  };
}

function mapAuditResult(row: {
  participantId: string;
  declaredMetric: number;
  validatedItems: number;
  rejectedItems: number;
  qualityScore: number;
  qualityMultiplier: number | null;
  suggestedFinalScore: number;
  overrideScore: number | null;
  flags: Prisma.JsonValue;
  recommendation: string;
  adminStatus: string;
  rubricBreakdown: Prisma.JsonValue | null;
  trace: Prisma.JsonValue | null;
}): AuditResult {
  return {
    participantId: row.participantId,
    declaredMetric: row.declaredMetric,
    validatedItems: row.validatedItems,
    rejectedItems: row.rejectedItems,
    qualityScore: row.qualityScore,
    qualityMultiplier: row.qualityMultiplier ?? undefined,
    suggestedFinalScore: row.suggestedFinalScore,
    overrideScore: row.overrideScore ?? undefined,
    flags: asArray<string>(row.flags),
    recommendation: row.recommendation,
    adminStatus: row.adminStatus as AuditResult["adminStatus"],
    rubricBreakdown: row.rubricBreakdown
      ? asArray<NonNullable<AuditResult["rubricBreakdown"]>[number]>(row.rubricBreakdown)
      : undefined,
    trace: row.trace ? asArray<string>(row.trace) : undefined,
  };
}

function mapEvidencePacket(row: {
  participantId: string;
  declaredMetric: number;
  items: Array<{
    id: string;
    clientName: string;
    clientCompany: string;
    clientRole: string;
    lengthSeconds: number;
    hasPermission: boolean;
    hasBusinessImpact: boolean;
    hasMetric: boolean;
    snippet: string;
    impactSummary: string;
  }>;
}): EvidencePacket {
  return {
    participantId: row.participantId,
    declaredMetric: row.declaredMetric,
    items: row.items.map((item): EvidenceItem => ({
      id: item.id,
      clientName: item.clientName,
      clientCompany: item.clientCompany,
      clientRole: item.clientRole,
      lengthSeconds: item.lengthSeconds,
      hasPermission: item.hasPermission,
      hasBusinessImpact: item.hasBusinessImpact,
      hasMetric: item.hasMetric,
      snippet: item.snippet,
      impactSummary: item.impactSummary,
    })),
  };
}

async function getChallengeOrThrow(id: string = CHALLENGE_ID) {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new Error("DYD database is not seeded. Run `npm run db:setup` or visit a ?act= URL.");
  }
  return challenge;
}

async function getStateOrThrow(challengeId: string = CHALLENGE_ID) {
  const state = await prisma.challengeState.findUnique({ where: { challengeId } });
  if (!state) {
    throw new Error("DYD challenge state is missing. Run `npm run db:setup` or visit a ?act= URL.");
  }
  return state;
}

async function recomputeRanking(challengeId: string = CHALLENGE_ID): Promise<void> {
  const participants = await prisma.participant.findMany({ where: { challengeId } });
  const registered = participants
    .filter((p) => p.registered)
    .sort((a, b) => b.selfReportedValue - a.selfReportedValue || a.name.localeCompare(b.name));

  await prisma.$transaction(
    registered.map((p, idx) =>
      prisma.participant.update({
        where: { id: p.id },
        data: { hypeRank: idx + 1, movement: "flat" },
      })
    )
  );
}

async function upsertAuditResult(
  challengeId: string,
  result: AuditResult | AuditFindings
): Promise<AuditResult> {
  const row = await prisma.auditResult.upsert({
    where: { participantId: result.participantId },
    create: {
      id: `audit-${result.participantId}`,
      participantId: result.participantId,
      challengeId,
      declaredMetric: result.declaredMetric,
      validatedItems: result.validatedItems,
      rejectedItems: result.rejectedItems,
      qualityScore: result.qualityScore,
      qualityMultiplier: result.qualityMultiplier ?? null,
      suggestedFinalScore: result.suggestedFinalScore,
      overrideScore: result.overrideScore ?? null,
      flags: toInputJson(result.flags),
      recommendation: result.recommendation,
      adminStatus: result.adminStatus,
      rubricBreakdown: toInputJson(result.rubricBreakdown ?? []),
      trace: toInputJson(result.trace ?? []),
    },
    update: {
      declaredMetric: result.declaredMetric,
      validatedItems: result.validatedItems,
      rejectedItems: result.rejectedItems,
      qualityScore: result.qualityScore,
      qualityMultiplier: result.qualityMultiplier ?? null,
      suggestedFinalScore: result.suggestedFinalScore,
      overrideScore: result.overrideScore ?? null,
      flags: toInputJson(result.flags),
      recommendation: result.recommendation,
      adminStatus: result.adminStatus,
      rubricBreakdown: toInputJson(result.rubricBreakdown ?? []),
      trace: toInputJson(result.trace ?? []),
    },
  });
  return mapAuditResult(row);
}

export async function truncateWorld(): Promise<void> {
  await prisma.$executeRaw(TRUNCATE_WORLD_SQL);
}

export async function getChallengeDb(id: string = CHALLENGE_ID): Promise<Challenge> {
  return mapChallenge(await getChallengeOrThrow(id));
}

export async function getParticipantsDb(challengeId: string = CHALLENGE_ID): Promise<Participant[]> {
  const rows = await prisma.participant.findMany({
    where: { challengeId },
    orderBy: [{ hypeRank: "asc" }, { name: "asc" }],
  });
  return rows.map(mapParticipant);
}

export async function getHypeRankingDb(challengeId: string = CHALLENGE_ID): Promise<RankingEntry[]> {
  const rows = await prisma.participant.findMany({
    where: { challengeId, registered: true },
    orderBy: [{ hypeRank: "asc" }, { name: "asc" }],
  });
  const maxValue = Math.max(1, ...rows.map((p) => p.selfReportedValue));
  return rows.map((row) => mapRankingEntry(row, maxValue));
}

export async function getFeedDb(challengeId: string = CHALLENGE_ID): Promise<FeedPage> {
  const rows = await prisma.feedPost.findMany({
    where: { challengeId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
  return { posts: rows.map(mapFeedPost), nextCursor: undefined };
}

export async function getMySubmissionDb(
  challengeId: string,
  userId: string
): Promise<EvidenceSubmission | null> {
  const participant = await prisma.participant.findFirst({ where: { challengeId, userId } });
  if (!participant) return null;
  const row = await prisma.evidenceSubmission.findUnique({
    where: { participantId: participant.id },
  });
  return row ? mapEvidenceSubmission(row) : null;
}

export async function getAuditQueueDb(challengeId: string = CHALLENGE_ID): Promise<AuditResult[]> {
  const rows = await prisma.auditResult.findMany({
    where: { challengeId },
    orderBy: [{ declaredMetric: "desc" }, { participantId: "asc" }],
  });
  return rows.map(mapAuditResult);
}

export async function getAuditResultDb(participantId: string): Promise<AuditResult | null> {
  const row = await prisma.auditResult.findUnique({ where: { participantId } });
  return row ? mapAuditResult(row) : null;
}

export async function getAgentsDb(): Promise<AgentSnapshot[]> {
  return clone(agentSnapshots);
}

export async function getCurrentUserDb(): Promise<User> {
  const state = await getStateOrThrow();
  const row = await prisma.user.findUnique({ where: { id: state.currentUserId } });
  if (!row) return clone(seedUsers["u-sofia"]);
  return mapUser(row);
}

export async function setRoleDb(role: Role): Promise<User> {
  const userId = roleToUserId(role);
  await prisma.challengeState.update({
    where: { challengeId: CHALLENGE_ID },
    data: { currentUserId: userId },
  });
  const row = await prisma.user.findUnique({ where: { id: userId } });
  if (!row) return clone(seedUsers[userId] ?? seedUsers["u-sofia"]);
  return mapUser(row);
}

export async function getNotificationsDb(): Promise<Notification[]> {
  const [state, challenge] = await Promise.all([getStateOrThrow(), getChallengeOrThrow()]);
  const stage = currentStageLabel(state.currentStage);
  const isAdmin = state.currentUserId === "u-admin";
  if (stage === "launch") return [];
  if (isAdmin && stage === "completed") {
    const auditReady: Notification = {
      id: "n-audit-ready",
      title: "AI Audit Assistant ready for final assessments.",
      body: "All submissions are in. Open the Admin Review page to confirm the final board.",
      cta: "Open Admin Review",
      href: "/admin",
      unread: true,
      createdAt: "2026-06-29T18:05:00-03:00",
    };
    if (!challenge.winnerId) return [auditReady];
    if (state.growthInsightSent) return [auditReady];
    return [
      {
        id: "n-insight-available",
        title: "Growth Insight Extractor available.",
        body: "Patrick was declared the winner. The Insight Extractor can now mine the approved corpus.",
        cta: "Open AI Agents",
        href: "/agents",
        unread: true,
        createdAt: "2026-07-01T09:55:00-03:00",
      },
      auditReady,
    ];
  }
  return clone(seedNotifications);
}

export async function registerDb(challengeId: string, userId: string): Promise<void> {
  const existing = await prisma.participant.findFirst({ where: { challengeId, userId } });
  if (existing) {
    await prisma.participant.update({
      where: { id: existing.id },
      data: { registered: true },
    });
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    await prisma.participant.create({
      data: {
        id: `p-${userId}`,
        userId,
        challengeId,
        name: user.name,
        role: user.jobTitle,
        avatarInitials: user.avatarInitials ?? initials(user.name),
        registered: true,
        selfReportedValue: 0,
        evidenceStatus: "not_submitted",
        hypeRank: 99,
        badges: [],
      },
    });
  }
  await recomputeRanking(challengeId);
}

export async function updateSelfReportDb(
  challengeId: string,
  userId: string,
  value: number
): Promise<Participant> {
  const participant = await prisma.participant.findFirst({ where: { challengeId, userId } });
  if (!participant) throw new Error("Not registered");
  const row = await prisma.participant.update({
    where: { id: participant.id },
    data: { selfReportedValue: Math.max(0, Math.round(value)) },
  });
  await recomputeRanking(challengeId);
  return mapParticipant(row);
}

export async function submitEvidenceDb(
  challengeId: string,
  userId: string,
  draft: EvidenceDraft
): Promise<EvidenceSubmission> {
  const participant = await prisma.participant.findFirst({ where: { challengeId, userId } });
  if (!participant) throw new Error("Not registered");
  const row = await prisma.evidenceSubmission.upsert({
    where: { participantId: participant.id },
    create: {
      id: `ev-${userId}-${Date.now()}`,
      participantId: participant.id,
      challengeId,
      submittedAt: new Date(),
      files: toInputJson(draft.files),
      clientName: draft.clientName ?? null,
      clientCompany: draft.clientCompany ?? null,
      clientRole: draft.clientRole ?? null,
      permissionToUse: draft.permissionToUse,
      businessImpactSummary: draft.businessImpactSummary,
    },
    update: {
      submittedAt: new Date(),
      files: toInputJson(draft.files),
      clientName: draft.clientName ?? null,
      clientCompany: draft.clientCompany ?? null,
      clientRole: draft.clientRole ?? null,
      permissionToUse: draft.permissionToUse,
      businessImpactSummary: draft.businessImpactSummary,
    },
  });
  await prisma.participant.update({
    where: { id: participant.id },
    data: {
      evidenceStatus: "uploaded",
      selfReportedValue: { increment: 1 },
    },
  });
  await recomputeRanking(challengeId);
  return mapEvidenceSubmission(row);
}

export async function postFeedCommentDb(challengeId: string, content: string): Promise<FeedPost> {
  const [state, user] = await Promise.all([getStateOrThrow(challengeId), getCurrentUserDb()]);
  const stage = currentStageLabel(state.currentStage);
  const row = await prisma.feedPost.create({
    data: {
      id: `fp-${Date.now()}`,
      challengeId,
      author: user.name,
      authorRole: user.jobTitle,
      authorType: user.role === "admin" ? "admin" : user.role === "participant" ? "participant" : "employee",
      content,
      createdAt: new Date(STAGE_NOW[stage]),
      reactions: toInputJson(EMPTY_REACTIONS),
      pinned: false,
    },
  });
  return mapFeedPost(row);
}

export async function reactDb(postId: string, kind: ReactionKind): Promise<FeedPost> {
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Not found");
  const reactions = { ...EMPTY_REACTIONS, ...asRecord(post.reactions) };
  reactions[kind] = (reactions[kind] ?? 0) + 1;
  const row = await prisma.feedPost.update({
    where: { id: postId },
    data: { reactions: toInputJson(reactions) },
  });
  return mapFeedPost(row);
}

export async function adminApproveDb(participantId: string): Promise<AuditResult> {
  const row = await prisma.auditResult.update({
    where: { participantId },
    data: { adminStatus: "approved" },
  });
  await prisma.participant.update({
    where: { id: participantId },
    data: { evidenceStatus: "approved" },
  });
  return mapAuditResult(row);
}

export async function adminRejectDb(participantId: string, reason: string): Promise<AuditResult> {
  const current = await prisma.auditResult.findUnique({ where: { participantId } });
  if (!current) throw new Error("Not in queue");
  const flags = [...asArray<string>(current.flags), `Admin reason: ${reason}`];
  const row = await prisma.auditResult.update({
    where: { participantId },
    data: { adminStatus: "rejected", flags: toInputJson(flags) },
  });
  await prisma.participant.update({
    where: { id: participantId },
    data: { evidenceStatus: "rejected" },
  });
  return mapAuditResult(row);
}

export async function adminOverrideScoreDb(participantId: string, score: number): Promise<AuditResult> {
  const row = await prisma.auditResult.update({
    where: { participantId },
    data: {
      overrideScore: Math.max(0, Math.min(10, Math.round(score * 10) / 10)),
      adminStatus: "overridden",
    },
  });
  return mapAuditResult(row);
}

export async function adminIssueStrikeDb(participantId: string): Promise<Participant> {
  const row = await prisma.participant.update({
    where: { id: participantId },
    data: { strikeIssued: true },
  });
  return mapParticipant(row);
}

export async function adminDeclareWinnerDb(participantId: string): Promise<Challenge> {
  await prisma.participant.update({
    where: { id: participantId },
    data: { finalRank: 1 },
  });
  const row = await prisma.challenge.update({
    where: { id: CHALLENGE_ID },
    data: { winnerId: participantId, status: "completed" },
  });
  return mapChallenge(row);
}

export async function getDaremasterInsightSentDb(): Promise<boolean> {
  const state = await getStateOrThrow();
  return state.daremasterInsightSent;
}

export async function sendDaremasterSnapshotDb(): Promise<void> {
  await prisma.challengeState.update({
    where: { challengeId: CHALLENGE_ID },
    data: { daremasterInsightSent: true },
  });
}

export async function getGrowthInsightSentDb(): Promise<boolean> {
  const state = await getStateOrThrow();
  return state.growthInsightSent;
}

export async function sendGrowthInsightSnapshotDb(): Promise<void> {
  await prisma.challengeState.update({
    where: { challengeId: CHALLENGE_ID },
    data: { growthInsightSent: true },
  });
}

export async function setFeedPostPinnedDb(postId: string, pinned: boolean): Promise<void> {
  if (pinned) {
    await prisma.feedPost.updateMany({
      where: { challengeId: CHALLENGE_ID, pinned: true },
      data: { pinned: false },
    });
  }
  await prisma.feedPost.update({ where: { id: postId }, data: { pinned } });
}

export async function buildDaremasterSnapshotDb(): Promise<DaremasterSnapshot> {
  const [challenge, ranking, participants] = await Promise.all([
    getChallengeDb(CHALLENGE_ID),
    getHypeRankingDb(CHALLENGE_ID),
    getParticipantsDb(CHALLENGE_ID),
  ]);
  const now = Date.now();
  const days = (isoString: string) =>
    Math.round((new Date(isoString).getTime() - now) / 86_400_000);
  return {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      registrationDeadline: challenge.registrationDeadline,
      submissionDeadline: challenge.submissionDeadline,
      status: challenge.status,
    },
    ranking,
    participantCount: participants.length,
    registeredCount: participants.filter((p) => p.registered).length,
    daysToRegistrationDeadline: days(challenge.registrationDeadline),
    daysToSubmissionDeadline: days(challenge.submissionDeadline),
  };
}

export async function buildDaremasterSnapshotWithAuditDb(): Promise<DaremasterSnapshot> {
  const snapshot = await buildDaremasterSnapshotDb();
  const audits = await prisma.auditResult.findMany({ where: { challengeId: CHALLENGE_ID } });
  const auditMap = new Map(audits.map((a) => [a.participantId, a.qualityScore]));
  return {
    ...snapshot,
    ranking: snapshot.ranking.map((entry) => {
      const auditScore = auditMap.get(entry.id);
      return typeof auditScore === "number" ? { ...entry, auditScore } : entry;
    }),
  };
}

export async function getDaremasterFallbackFactsDb(): Promise<{
  bobLead: number;
  charlieValidated: number;
  patrickValidated: number;
}> {
  const [bob, charlie, patrick] = await Promise.all([
    prisma.participant.findUnique({ where: { id: "p-bob" } }),
    prisma.auditResult.findUnique({ where: { participantId: "p-charlie" } }),
    prisma.auditResult.findUnique({ where: { participantId: "p-patrick" } }),
  ]);
  return {
    bobLead: bob?.selfReportedValue ?? 0,
    charlieValidated: charlie?.validatedItems ?? 0,
    patrickValidated: patrick?.validatedItems ?? 0,
  };
}

export async function postDaremasterMessageDb(
  post: DaremasterPost,
  pinned: boolean = false,
  cta?: FeedPost["cta"]
): Promise<FeedPost> {
  const state = await getStateOrThrow();
  const stage = currentStageLabel(state.currentStage);
  if (pinned) {
    await prisma.feedPost.updateMany({
      where: { challengeId: CHALLENGE_ID, pinned: true },
      data: { pinned: false },
    });
  }
  const row = await prisma.feedPost.create({
    data: {
      id: `fp-bot-${Date.now()}`,
      challengeId: CHALLENGE_ID,
      author: "Daremaster",
      authorRole: "DYD Bot",
      authorType: "bot",
      content: post.content,
      createdAt: new Date(STAGE_NOW[stage]),
      reactions: toInputJson(post.reactions),
      pinned,
      ctaLabel: cta?.label ?? null,
      ctaHref: cta?.href ?? null,
    },
  });
  return mapFeedPost(row);
}

export async function runAuditDb(participantId: string): Promise<AuditResult | null> {
  const packetRow = await prisma.evidencePacket.findUnique({
    where: { participantId },
    include: { items: true },
  });
  if (!packetRow) return null;
  const challenge = await getChallengeDb(CHALLENGE_ID);
  const findings = audit({
    packet: mapEvidencePacket(packetRow),
    contract: challenge.auditContract,
  });
  return upsertAuditResult(CHALLENGE_ID, findings);
}

export async function getInsightInputDb(): Promise<{
  approvedPackets: EvidencePacket[];
  rejectedCount: number;
}> {
  const audits = await prisma.auditResult.findMany({ where: { challengeId: CHALLENGE_ID } });
  const approvedIds = new Set(
    audits
      .filter((a) => a.adminStatus === "approved" || a.adminStatus === "overridden")
      .map((a) => a.participantId)
  );
  const fallbackIds = new Set(
    audits
      .filter((a) => a.recommendation !== "Needs manual review")
      .map((a) => a.participantId)
  );
  const idsToUse = approvedIds.size > 0 ? approvedIds : fallbackIds;
  const packets = await prisma.evidencePacket.findMany({
    where: { participantId: { in: [...idsToUse] } },
    include: { items: true },
    orderBy: { participantId: "asc" },
  });
  return {
    approvedPackets: packets.map(mapEvidencePacket),
    rejectedCount: audits.filter((a) => a.adminStatus === "rejected").length,
  };
}

export async function getAuditTraceInputDb(participantId: string): Promise<{
  packet: EvidencePacket;
  contract: Challenge["auditContract"];
  findings: AuditFindings;
} | null> {
  const [packetRow, challenge, auditRow] = await Promise.all([
    prisma.evidencePacket.findUnique({ where: { participantId }, include: { items: true } }),
    getChallengeOrThrow(CHALLENGE_ID),
    prisma.auditResult.findUnique({ where: { participantId } }),
  ]);
  if (!packetRow || !auditRow) return null;
  const findings = mapAuditResult(auditRow) as AuditFindings;
  return {
    packet: mapEvidencePacket(packetRow),
    contract: mapChallenge(challenge).auditContract,
    findings,
  };
}

export async function seedAllDb(stage: DemoStage, role: Role): Promise<void> {
  const currentUserId = roleToUserId(role);
  const snapshot = buildSnapshot(stage, currentUserId);
  const challenge = clone(snapshot.challenge);
  if (stage === "completed") {
    challenge.winnerId = undefined;
  }
  const movementByParticipant = new Map(snapshot.ranking.map((entry) => [entry.id, entry.movement]));

  const userRows = new Map<string, User>();
  for (const user of Object.values(seedUsers)) userRows.set(user.id, clone(user));
  for (const participant of snapshot.participants) {
    if (!userRows.has(participant.userId)) {
      userRows.set(participant.userId, {
        id: participant.userId,
        name: participant.name,
        role: "participant",
        jobTitle: participant.role,
      });
    }
  }

  await truncateWorld();
  await prisma.user.createMany({
    data: [...userRows.values()].map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      jobTitle: user.jobTitle,
      avatarInitials: initials(user.name),
    })),
  });

  await prisma.challenge.create({
    data: {
      id: challenge.id,
      number: challenge.number,
      title: challenge.title,
      subtitle: challenge.subtitle,
      description: challenge.description,
      sponsor: challenge.sponsor,
      reward: challenge.reward,
      rewardSubtitle: challenge.rewardSubtitle,
      registrationDeadline: parseDate(challenge.registrationDeadline),
      submissionDeadline: parseDate(challenge.submissionDeadline),
      status: challenge.status,
      primaryMetricLabel: challenge.primaryMetricLabel,
      primaryMetricKey: challenge.primaryMetricKey,
      hypeRankingDisclaimer: challenge.hypeRankingDisclaimer,
      rules: toInputJson(challenge.rules),
      evidenceRequirements: toInputJson(challenge.evidenceRequirements),
      auditContract: toInputJson(challenge.auditContract),
      winnerId: challenge.winnerId ?? null,
    },
  });

  await prisma.challengeState.create({
    data: {
      challengeId: challenge.id,
      currentStage: stage,
      currentUserId,
      daremasterInsightSent: !!snapshot.daremasterInsightSent,
      growthInsightSent: false,
    },
  });

  await prisma.participant.createMany({
    data: snapshot.participants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      challengeId: challenge.id,
      name: participant.name,
      role: participant.role,
      avatarInitials: participant.avatarInitials,
      registered: participant.registered,
      selfReportedValue: participant.selfReportedValue,
      evidenceStatus: participant.evidenceStatus,
      hypeRank: participant.hypeRank,
      finalRank: participant.finalRank ?? null,
      badges: toInputJson(participant.badges),
      strikeRisk: !!participant.strikeRisk,
      strikeIssued: !!participant.strikeIssued,
      movement: movementByParticipant.get(participant.id) ?? "flat",
    })),
  });

  if (stage === "day_14" || stage === "completed") {
    const selfReport = new Map(snapshot.participants.map((p) => [p.id, p.selfReportedValue]));
    for (const packet of Object.values(seedEvidencePackets)) {
      const declaredMetric =
        stage === "day_14"
          ? Math.min(packet.declaredMetric, Math.max(0, selfReport.get(packet.participantId) ?? 0))
          : packet.declaredMetric;
      const items = stage === "day_14" ? packet.items.slice(0, declaredMetric) : packet.items;
      await prisma.evidencePacket.create({
        data: {
          id: `packet-${packet.participantId}`,
          participantId: packet.participantId,
          declaredMetric,
          items: {
            create: items.map((item) => ({
              id: item.id,
              clientName: item.clientName,
              clientCompany: item.clientCompany,
              clientRole: item.clientRole,
              lengthSeconds: item.lengthSeconds,
              hasPermission: item.hasPermission,
              hasBusinessImpact: item.hasBusinessImpact,
              hasMetric: item.hasMetric,
              snippet: item.snippet,
              impactSummary: item.impactSummary,
            })),
          },
        },
      });
    }
  }

  if (snapshot.evidence.length > 0) {
    await prisma.evidenceSubmission.createMany({
      data: snapshot.evidence.map((submission) => ({
        id: submission.id,
        participantId: submission.participantId,
        challengeId: submission.challengeId,
        submittedAt: parseDate(submission.submittedAt),
        files: toInputJson(submission.files),
        clientName: submission.clientName ?? null,
        clientCompany: submission.clientCompany ?? null,
        clientRole: submission.clientRole ?? null,
        permissionToUse: submission.permissionToUse,
        businessImpactSummary: submission.businessImpactSummary,
      })),
    });
  }

  for (const auditResult of Object.values(snapshot.audits)) {
    await upsertAuditResult(challenge.id, auditResult);
  }

  if (snapshot.feed.length > 0) {
    await prisma.feedPost.createMany({
      data: snapshot.feed.map((post) => ({
        id: post.id,
        challengeId: challenge.id,
        author: post.author,
        authorRole: post.authorRole ?? null,
        authorType: post.authorType,
        content: post.content,
        createdAt: parseDate(post.createdAt),
        reactions: toInputJson(post.reactions),
        comments: post.comments ? toInputJson(post.comments) : Prisma.JsonNull,
        pinned: !!post.pinned,
        ctaLabel: post.cta?.label ?? null,
        ctaHref: post.cta?.href ?? null,
      })),
    });
  }
}

export async function seedLaunchDb(role: Role = "participant"): Promise<void> {
  await seedAllDb("launch", role);
}

export async function seedDay3Db(role: Role = "participant"): Promise<void> {
  await seedAllDb("day_3", role);
}

export async function seedDay14Db(role: Role = "admin"): Promise<void> {
  await seedAllDb("day_14", role);
}

export async function seedCompletedDb(role: Role = "admin"): Promise<void> {
  await seedAllDb("completed", role);
}

export type InsightInputFromDb = Awaited<ReturnType<typeof getInsightInputDb>>;
export type AuditTraceInputFromDb = Awaited<ReturnType<typeof getAuditTraceInputDb>>;
export type GrowthAssetBundleFromDb = GrowthAssetBundle;
