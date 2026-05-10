// Daremaster snapshot fixtures.
//
// Three named snapshots that cover the three modes the wrapper sends to the
// route — pre-handoff (no audit signal), post-handoff (audit-aware), and
// winner (challenge completed, finalRank set).

import type { DaremasterSnapshot } from "@/agents/types";
import type { RankingEntry } from "@/lib/types";

function entry(overrides: Partial<RankingEntry> & Pick<RankingEntry, "id" | "name" | "selfReportedValue" | "hypeRank">): RankingEntry {
  return {
    userId: `u-${overrides.id.replace(/^p-/, "")}`,
    role: "Account Executive",
    avatarInitials: overrides.name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join(""),
    registered: true,
    evidenceStatus: "uploaded",
    badges: [],
    hypeProgress: 50,
    movement: "flat",
    ...overrides,
  } as RankingEntry;
}

/** Day-14-shaped: Bob leads on volume, no audit signal exposed yet. */
export const preHandoffDaremasterSnapshot: DaremasterSnapshot = {
  challenge: {
    id: "dyd-001",
    title: "The Testimonial Hunt",
    registrationDeadline: "2026-05-18T00:00:00-03:00",
    submissionDeadline: "2026-06-29T00:00:00-03:00",
    status: "review",
  },
  ranking: [
    entry({ id: "p-bob", name: "Bob Martinez", selfReportedValue: 13, hypeRank: 1, hypeProgress: 100, movement: "up" }),
    entry({ id: "p-patrick", name: "Patrick Olawale", selfReportedValue: 9, hypeRank: 2, hypeProgress: 69, movement: "up" }),
    entry({ id: "p-charlie", name: "Charlie Okonkwo", selfReportedValue: 6, hypeRank: 3, hypeProgress: 46, movement: "up" }),
  ],
  participantCount: 3,
  registeredCount: 3,
  daysToRegistrationDeadline: -1,
  daysToSubmissionDeadline: 14,
};

/** Same Day-14-shaped board but audit signal stitched in for `mode === "insight"`. */
export const postHandoffDaremasterSnapshot: DaremasterSnapshot = {
  ...preHandoffDaremasterSnapshot,
  ranking: [
    entry({ id: "p-bob", name: "Bob Martinez", selfReportedValue: 13, hypeRank: 1, hypeProgress: 100, movement: "up", auditScore: 51 }),
    entry({ id: "p-patrick", name: "Patrick Olawale", selfReportedValue: 9, hypeRank: 2, hypeProgress: 69, movement: "up", auditScore: 95 }),
    entry({ id: "p-charlie", name: "Charlie Okonkwo", selfReportedValue: 6, hypeRank: 3, hypeProgress: 46, movement: "up", auditScore: 100 }),
  ],
};

/** Completed-shaped: Patrick has finalRank = 1. */
export const winnerDaremasterSnapshot: DaremasterSnapshot = {
  challenge: {
    id: "dyd-001",
    title: "The Testimonial Hunt",
    registrationDeadline: "2026-05-18T00:00:00-03:00",
    submissionDeadline: "2026-06-29T00:00:00-03:00",
    status: "completed",
  },
  ranking: [
    entry({ id: "p-patrick", name: "Patrick Olawale", selfReportedValue: 9, hypeRank: 1, hypeProgress: 100, movement: "up", finalRank: 1, auditScore: 95 }),
    entry({ id: "p-charlie", name: "Charlie Okonkwo", selfReportedValue: 6, hypeRank: 2, hypeProgress: 67, movement: "up", finalRank: 2, auditScore: 100 }),
    entry({ id: "p-bob", name: "Bob Martinez", selfReportedValue: 18, hypeRank: 3, hypeProgress: 30, movement: "down", finalRank: 4, auditScore: 51 }),
  ],
  participantCount: 3,
  registeredCount: 3,
  daysToRegistrationDeadline: -42,
  daysToSubmissionDeadline: -3,
};
