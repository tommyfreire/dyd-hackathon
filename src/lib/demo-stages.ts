// DYD — Demo stage system
//
// Four canonical demo stages. Each one produces a complete state snapshot;
// switching stages overwrites localStorage so the demo can jump cleanly
// between scenes for recording. Resetting (or selecting Launch) returns the
// world to its pristine pre-registration state.

import {
  currentChallenge,
  participants as seedParticipants,
  feedPosts as seedFeed,
  evidencePackets,
  evidenceSubmissions as seedEvidence,
  notifications as seedNotifications,
} from "./mock-data";
import { audit } from "@/agents/audit-assistant";
import type {
  Challenge,
  Participant,
  RankingEntry,
  FeedPost,
  EvidenceSubmission,
  AuditResult,
  Notification,
} from "./types";

export const DEMO_STAGES = [
  "launch",
  "day_3",
  "day_14",
  "completed",
] as const;

export type DemoStage = (typeof DEMO_STAGES)[number];

export const STAGE_LABEL: Record<DemoStage, string> = {
  launch:    "Launch — The Dare drops",
  day_3:     "Day 3 — First moves",
  day_14:    "Day 14 — Competition heats up",
  completed: "Challenge finished — Final review",
};

/** Coerce any legacy stage value (older demo snapshots) to the new 4-stage set. */
export function coerceStage(raw: string | null | undefined): DemoStage {
  if (!raw) return "launch";
  if ((DEMO_STAGES as readonly string[]).includes(raw)) return raw as DemoStage;
  // Legacy → new mapping
  switch (raw) {
    case "registered":
    case "early_hype":
      return "launch";
    case "participant_progress":
      return "day_3";
    case "competition_heats_up":
    case "admin_review":
      return "day_14";
    default:
      return "launch";
  }
}

export interface StageStateSnapshot {
  participants: Participant[];
  ranking: RankingEntry[];
  feed: FeedPost[];
  evidence: EvidenceSubmission[];
  audits: Record<string, AuditResult>;
  challenge: Challenge;
  currentUserId: string;
  notifications: Notification[];
  /**
   * Has the admin sent the latest audit snapshot to the Hype Bot? Used by the
   * AI Agents page to flip Hype Bot output between trivial and insightful.
   */
  hypeBotInsightSent?: boolean;
}

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

// ─── Participant shaping ───────────────────────────────────────────────────

function shapeParticipants(stage: DemoStage): Participant[] {
  const ps = clone(seedParticipants);

  const patches: Record<DemoStage, Record<string, Partial<Participant>>> = {
    // Launch: nobody is registered yet. Tomi will flip via "I Dare".
    launch: Object.fromEntries(
      ps.map((p) => [
        p.id,
        {
          registered: false,
          selfReportedValue: 0,
          evidenceStatus: "not_submitted" as const,
          badges: [] as string[],
          finalRank: undefined,
          strikeIssued: false,
          strikeRisk: false,
        },
      ])
    ),
    // Day 3: a handful registered, low numbers, Tomi has uploaded one.
    day_3: {
      "p-sofia":   { registered: true, selfReportedValue: 1, evidenceStatus: "uploaded",        badges: ["First mover"] },
      "p-bob":     { registered: true, selfReportedValue: 2, evidenceStatus: "uploaded",        badges: [] },
      "p-patrick": { registered: true, selfReportedValue: 1, evidenceStatus: "uploaded",        badges: [] },
      "p-alice":   { registered: true, selfReportedValue: 1, evidenceStatus: "uploaded",        badges: [] },
      "p-charlie": { registered: true, selfReportedValue: 0, evidenceStatus: "not_submitted",   badges: [] },
      ...Object.fromEntries(
        ps
          .filter((p) => !["p-sofia", "p-bob", "p-patrick", "p-alice", "p-charlie"].includes(p.id))
          .map((p) => [p.id, { registered: false, selfReportedValue: 0, evidenceStatus: "not_submitted" as const, badges: [] as string[] }])
      ),
    },
    // Day 14: leaderboard is heated but Bob hasn't reached his final 18 yet.
    // Self-reported counts at this snapshot drive the audit (see buildAudits).
    day_14: {
      "p-bob": { selfReportedValue: 13 },
    },
    // Completed: final results.
    completed: {
      "p-bob":     { evidenceStatus: "rejected", finalRank: 4 },
      "p-patrick": { evidenceStatus: "approved", finalRank: 1 },
      "p-alice":   { evidenceStatus: "approved", finalRank: 3 },
      "p-charlie": { evidenceStatus: "approved", finalRank: 2 },
    },
  };

  const patch = patches[stage];
  return ps.map((p) => (patch[p.id] ? { ...p, ...patch[p.id] } : p));
}

// ─── Ranking projection ────────────────────────────────────────────────────

/** Movement keyed by participant id, per stage. Used for the Hype Ranking column. */
const STAGE_MOVEMENT: Record<DemoStage, Record<string, RankingEntry["movement"]>> = {
  launch: {},
  day_3: {
    "p-sofia": "new", "p-bob": "new", "p-patrick": "new", "p-alice": "new", "p-charlie": "new",
  },
  day_14: {
    "p-bob": "up", "p-patrick": "up", "p-alice": "flat", "p-charlie": "up",
    "p-rena": "up", "p-diego": "up", "p-julia": "down", "p-sofia": "down",
  },
  completed: {
    "p-patrick": "up", "p-charlie": "up", "p-alice": "flat", "p-bob": "down",
  },
};

function buildRanking(stage: DemoStage, participants: Participant[]): RankingEntry[] {
  // Hype Ranking only shows registered participants.
  const visible = participants.filter((p) => p.registered);
  const sorted = [...visible].sort((a, b) => b.selfReportedValue - a.selfReportedValue);
  sorted.forEach((p, idx) => (p.hypeRank = idx + 1));
  const max = Math.max(1, sorted[0]?.selfReportedValue ?? 1);
  const movements = STAGE_MOVEMENT[stage] ?? {};
  return sorted.map((p) => ({
    ...p,
    hypeProgress: max === 0 ? 0 : Math.round((p.selfReportedValue / max) * 100),
    auditScore: undefined, // ranking page no longer surfaces audit scores
    movement: movements[p.id] ?? "flat",
  }));
}

// ─── Feed slices ───────────────────────────────────────────────────────────

const LAUNCH_OPENER: FeedPost = {
  id: "fp-launch-opener",
  author: "Daremaster",
  authorType: "bot",
  authorRole: "DYD Bot",
  pinned: true,
  content:
    "A new DYD has been unlocked. DYD #001 — The Testimonial Hunt is now open. Trip for 2 to the Bahamas + dinner with leadership goes to the participant whose evidence holds up under audit. Registration closes May 18. Submissions close June 29. Do you dare?",
  createdAt: "2026-04-28T09:00:00-03:00",
  reactions: { fire: 11, clap: 8, rocket: 4, eyes: 11, trophy: 2 },
};

const DAY_3_PINNED: FeedPost = {
  id: "fp-day3-pinned",
  author: "Daremaster",
  authorType: "bot",
  authorRole: "DYD Bot",
  pinned: true,
  content:
    "The first moves are being made. 48 hours left to register before the gates close on May 18. The Hype Ranking is starting to fill — quality is going to decide the final board.",
  createdAt: "2026-05-01T09:00:00-03:00",
  reactions: { fire: 10, clap: 6, rocket: 3, eyes: 11, trophy: 0 },
};

const DAY_3_COMMENT_1: FeedPost = {
  id: "fp-day3-mateo",
  author: "Mateo Vega",
  authorRole: "Engineering Manager",
  authorType: "employee",
  content: "Love this one. Friendly competition, real impact. Let's go.",
  createdAt: "2026-04-30T11:14:00-03:00",
  reactions: { fire: 6, clap: 8, rocket: 2, eyes: 4, trophy: 1 },
};

const DAY_3_COMMENT_2: FeedPost = {
  id: "fp-day3-elena",
  author: "Elena Cabrera",
  authorRole: "Account Executive",
  authorType: "employee",
  content: "Three of my clients already said yes on camera. This one's going to be fun to watch.",
  createdAt: "2026-04-30T16:48:00-03:00",
  reactions: { fire: 6, clap: 9, rocket: 2, eyes: 4, trophy: 0 },
};

const DAY_14_PINNED_TRIVIAL: FeedPost = {
  id: "fp-day14-pinned-trivial",
  author: "Daremaster",
  authorType: "bot",
  authorRole: "DYD Bot",
  pinned: true,
  content:
    "The Hype Ranking is heating up. Keep going — the deadline is approaching.",
  createdAt: "2026-05-11T09:00:00-03:00",
  reactions: { fire: 6, clap: 4, rocket: 2, eyes: 8, trophy: 0 },
};

const DAY_14_PINNED_INSIGHT: FeedPost = {
  id: "fp-day14-pinned-insight",
  author: "Daremaster",
  authorType: "bot",
  authorRole: "DYD Bot",
  pinned: true,
  content:
    "Charlie is the dark horse. Six clean testimonials, perfect permissions, every story specific. Bob leads the Hype Ranking but the audit will weigh quality just as hard — quality is rewriting the leaderboard.",
  createdAt: "2026-05-11T10:30:00-03:00",
  reactions: { fire: 12, clap: 8, rocket: 4, eyes: 13, trophy: 1 },
};

const DAY_14_DAREMASTER_MIDPOINT: FeedPost = {
  id: "fp-day14-mid-daremaster",
  author: "Daremaster",
  authorType: "bot",
  authorRole: "DYD Bot",
  content:
    "Halfway through the run. Numbers are climbing fast — but remember the audit will weigh quality just as hard. Submit your strongest testimonials, not your fastest ones.",
  createdAt: "2026-05-06T09:00:00-03:00",
  reactions: { fire: 9, clap: 5, rocket: 3, eyes: 13, trophy: 0 },
};

const DAY_14_HYPE_POST_1: FeedPost = {
  id: "fp-day14-hype-1",
  author: "Mira Ostrowski",
  authorRole: "Partner Manager",
  authorType: "employee",
  content:
    "First testimonial in the books. Three more lined up for next week — cameras and calendars are aligned.",
  createdAt: "2026-05-01T16:30:00-03:00",
  reactions: { fire: 7, clap: 8, rocket: 2, eyes: 4, trophy: 0 },
};

const DAY_14_HYPE_POST_2: FeedPost = {
  id: "fp-day14-hype-2",
  author: "Rena Singh",
  authorRole: "Sales Engineer",
  authorType: "employee",
  content:
    "Sales floor is electric. Half the team is already racing to lock in client cameos this weekend.",
  createdAt: "2026-04-30T12:14:00-03:00",
  reactions: { fire: 10, clap: 6, rocket: 3, eyes: 8, trophy: 1 },
};

const DAY_14_HYPE_POST_3: FeedPost = {
  id: "fp-day14-hype-3",
  author: "Leonardo Vega",
  authorRole: "Delivery Manager",
  authorType: "employee",
  content:
    "Got my first 'yes, on camera, no problem' from a client. Hooked. The Bahamas trip is mine.",
  createdAt: "2026-04-29T18:48:00-03:00",
  reactions: { fire: 9, clap: 6, rocket: 2, eyes: 10, trophy: 1 },
};

const COMPLETED_HOLD_TIGHT: FeedPost = {
  id: "fp-completed-hold",
  author: "Daremaster",
  authorType: "bot",
  authorRole: "DYD Bot",
  pinned: true,
  content:
    "The challenge is closed. All evidence is now being reviewed by the admin team with help from the AI Audit Assistant. Hold tight — the final board is coming.",
  createdAt: "2026-06-29T18:00:00-03:00",
  reactions: { fire: 10, clap: 7, rocket: 3, eyes: 14, trophy: 1 },
};

function buildFeed(stage: DemoStage, hypeBotInsightSent: boolean): FeedPost[] {
  switch (stage) {
    case "launch":
      return [LAUNCH_OPENER];
    case "day_3":
      return [DAY_3_PINNED, DAY_3_COMMENT_1, DAY_3_COMMENT_2, LAUNCH_OPENER];
    case "day_14": {
      const top = hypeBotInsightSent ? DAY_14_PINNED_INSIGHT : DAY_14_PINNED_TRIVIAL;
      const seedById = (id: string) => clone(seedFeed).find((p) => p.id === id);
      const bob = seedById("fp-12");
      const alice = seedById("fp-7");
      const patrick = seedById("fp-3");
      const maya = seedById("fp-5");
      const diego = seedById("fp-10");
      // Reshape Bob's post for Day 14 — he's mid-run, not done yet.
      const bobDay14 = bob && {
        ...bob,
        content: "13 testimonials in. Going for 18.",
        createdAt: "2026-05-11T14:12:00-03:00",
      };
      const aliceDay14 = alice && { ...alice, createdAt: "2026-05-10T11:20:00-03:00" };
      const patrickDay14 = patrick && { ...patrick, createdAt: "2026-05-09T14:17:00-03:00" };
      const mayaDay14 = maya && { ...maya, createdAt: "2026-05-08T16:02:00-03:00" };
      const diegoDay14 = diego && { ...diego, createdAt: "2026-05-02T15:33:00-03:00" };
      return [
        top,
        bobDay14,
        aliceDay14,
        patrickDay14,
        mayaDay14,
        DAY_14_DAREMASTER_MIDPOINT,
        diegoDay14,
        DAY_14_HYPE_POST_1,
        DAY_14_HYPE_POST_2,
        DAY_14_HYPE_POST_3,
        LAUNCH_OPENER,
      ].filter(Boolean) as FeedPost[];
    }
    case "completed":
      // Only the "hold tight" Daremaster post is pinned at the start of the
      // final stage. The launch opener (seed fp-1) is kept but unpinned. The
      // winner announcement is created by the admin's Hype Bot flow.
      return [
        COMPLETED_HOLD_TIGHT,
        ...clone(seedFeed).map((p) => (p.id === "fp-1" ? { ...p, pinned: false } : p)),
      ];
  }
}

// ─── Audits ────────────────────────────────────────────────────────────────

function buildAudits(stage: DemoStage, participants: Participant[]): Record<string, AuditResult> {
  // Audits become available at Day 14 (admin can configure formula + send
  // snapshot to Hype Bot) and remain through Completed.
  if (stage === "launch" || stage === "day_3") return {};
  const out: Record<string, AuditResult> = {};
  const contract = currentChallenge.auditContract;

  // At Day 14, audit only against the items each participant has actually
  // uploaded so far — i.e. the first N items of their full packet, where N
  // is their current self-reported count. Completed runs against the whole
  // packet so the final score is the real one.
  const trimmed = stage === "day_14";
  const selfReport = Object.fromEntries(participants.map((p) => [p.id, p.selfReportedValue]));

  for (const [participantId, packet] of Object.entries(evidencePackets)) {
    const declaredAtSnapshot = trimmed
      ? Math.min(packet.declaredMetric, Math.max(0, selfReport[participantId] ?? packet.declaredMetric))
      : packet.declaredMetric;
    const itemsAtSnapshot = trimmed ? packet.items.slice(0, declaredAtSnapshot) : packet.items;
    out[participantId] = audit({
      packet: { ...packet, declaredMetric: declaredAtSnapshot, items: itemsAtSnapshot },
      contract,
    });
  }
  return out;
}

function buildEvidence(stage: DemoStage): EvidenceSubmission[] {
  if (stage === "launch") return [];
  return clone(seedEvidence);
}

function buildChallenge(stage: DemoStage): Challenge {
  const c = clone(currentChallenge);
  if (stage === "completed") {
    c.status = "completed";
    c.winnerId = "p-patrick";
  } else if (stage === "day_14") {
    c.status = "review";
  } else {
    c.status = "open";
  }
  return c;
}

// ─── Notifications ─────────────────────────────────────────────────────────

const ADMIN_AUDIT_READY: Notification = {
  id: "n-audit-ready",
  title: "AI Audit Assistant ready for final assessments.",
  body: "All submissions are in. Open the Admin Review page to confirm the final board.",
  cta: "Open Admin Review",
  href: "/admin",
  unread: true,
  createdAt: "2026-06-29T18:05:00-03:00",
};

const ADMIN_INSIGHT_AVAILABLE: Notification = {
  id: "n-insight-available",
  title: "Growth Insight Extractor available.",
  body: "Patrick was declared the winner. The Insight Extractor can now mine the approved corpus.",
  cta: "Open AI Agents",
  href: "/agents",
  unread: true,
  createdAt: "2026-07-01T09:55:00-03:00",
};

function buildNotifications(stage: DemoStage, role: "admin" | "participant"): Notification[] {
  if (stage === "launch") return [];
  if (role === "admin") {
    if (stage === "completed") return [ADMIN_INSIGHT_AVAILABLE, ADMIN_AUDIT_READY];
    return clone(seedNotifications).slice(0, 2);
  }
  return clone(seedNotifications);
}

// ─── Snapshot builder ──────────────────────────────────────────────────────

export function buildSnapshot(stage: DemoStage, currentUserId: string): StageStateSnapshot {
  const participants = shapeParticipants(stage);
  const role = currentUserId === "u-admin" ? "admin" : "participant";
  const hypeBotInsightSent = stage === "completed";
  return {
    participants,
    ranking: buildRanking(stage, clone(participants)),
    feed: buildFeed(stage, hypeBotInsightSent),
    evidence: buildEvidence(stage),
    audits: buildAudits(stage, participants),
    challenge: buildChallenge(stage),
    currentUserId,
    notifications: buildNotifications(stage, role),
    hypeBotInsightSent,
  };
}
