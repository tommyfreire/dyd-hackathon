// DYD — Hype Bot
//
// Reads the current world (challenge state, ranking, deadlines) and emits a
// single contextual feed post. The bot's job is social momentum — it should
// feel like an in-the-moment broadcaster, not a scheduled cron.
//
// The set of triggers below is intentionally small. Each one is a template
// keyed off a clear narrative beat. The trigger we pick depends on which
// signals fire hardest in the snapshot — see `pickTrigger()`. That makes the
// agent's behavior easy to explain in code review.
//
// Real-LLM swap: replace `pickTrigger()` + `renderTemplate()` with one call
// to the model that takes the snapshot and returns `{trigger, content}` in
// the same shape.

import type { HypeBotPost, HypeBotSnapshot } from "./types";

const TEMPLATES: Record<HypeBotPost["trigger"], (snap: HypeBotSnapshot) => string> = {
  launch: (s) =>
    `A new DYD has been unlocked. ${formatTitle(s)}. The Dare is open for ` +
    `${Math.max(s.daysToSubmissionDeadline, 0)} days.`,

  registration_confirmation: (s) =>
    `${s.registeredCount} Daredevils have already accepted. Registration closes in ` +
    `${formatDays(s.daysToRegistrationDeadline)}.`,

  early_quiet: () =>
    "The board is quiet… for now. First updates will shape the chase.",

  leaderboard_movement: (s) => {
    const leader = s.ranking[0];
    return `${firstName(leader?.name)} is leading with ${leader?.selfReportedValue ?? 0} ` +
      `testimonials. But remember: quality can flip the board.`;
  },

  quality_threat: (s) => {
    const leader = s.ranking[0];
    const threat = findQualityThreat(s);
    if (!leader || !threat) return TEMPLATES.leaderboard_movement(s);
    return `${firstName(leader.name)} is leading the Hype Ranking, but ${firstName(threat.name)} ` +
      `is becoming a serious quality threat. The final board belongs to the evidence.`;
  },

  ranking_tension: () =>
    "The Hype Ranking is heating up. Final audit will decide the real winner.",

  deadline_pressure: (s) =>
    `${formatDays(s.daysToSubmissionDeadline)} left. The Dare is still open.`,
};

const TRIGGER_REACTIONS: Record<HypeBotPost["trigger"], HypeBotPost["reactions"]> = {
  launch:                    { fire: 124, clap: 87, rocket: 54, eyes: 211, trophy: 18 },
  registration_confirmation: { fire: 22,  clap: 14, rocket: 6,  eyes: 71,  trophy: 0  },
  early_quiet:               { fire: 8,   clap: 3,  rocket: 2,  eyes: 41,  trophy: 0  },
  leaderboard_movement:      { fire: 41,  clap: 12, rocket: 4,  eyes: 89,  trophy: 0  },
  quality_threat:            { fire: 67,  clap: 92, rocket: 34, eyes: 12,  trophy: 11 },
  ranking_tension:           { fire: 33,  clap: 11, rocket: 7,  eyes: 56,  trophy: 0  },
  deadline_pressure:         { fire: 14,  clap: 6,  rocket: 3,  eyes: 31,  trophy: 0  },
};

/**
 * Pick the trigger that best matches the current snapshot. Order matters —
 * earlier checks win when multiple conditions could fire.
 *
 * The goal: given the snapshot, pick the most narratively-interesting beat,
 * not just the first matching one. Audit signals (quality threats) trump
 * generic ranking noise; deadline pressure trumps a quiet board.
 */
export function pickTrigger(s: HypeBotSnapshot): HypeBotPost["trigger"] {
  if (s.challenge.status === "draft") return "launch";

  const noProgress = s.ranking.every((r) => r.selfReportedValue === 0);
  if (noProgress && s.registeredCount > 0) return "early_quiet";
  if (noProgress) return "launch";

  // Deadline pressure cuts in when ≤ 2 days remain.
  if (s.daysToSubmissionDeadline >= 0 && s.daysToSubmissionDeadline <= 2) {
    return "deadline_pressure";
  }

  // Quality threat: the leader has high count, but someone behind has a
  // markedly higher audit score. This is the bot's sharpest narrative.
  if (findQualityThreat(s)) return "quality_threat";

  // Generic momentum: there's a leader and the board has motion.
  const leader = s.ranking[0];
  if (leader && leader.selfReportedValue > 0) return "leaderboard_movement";

  return "ranking_tension";
}

/**
 * Generate a feed post from the current snapshot. Pure function — no I/O.
 *
 * @returns A `HypeBotPost` ready to be added to the feed. The caller decides
 *          whether to post it (e.g. the admin clicking "Generate next post"
 *          on the agents page).
 */
export function generate(snapshot: HypeBotSnapshot): HypeBotPost {
  const trigger = pickTrigger(snapshot);
  return {
    trigger,
    content: TEMPLATES[trigger](snapshot),
    reactions: TRIGGER_REACTIONS[trigger],
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function firstName(full?: string): string {
  return (full ?? "Someone").split(" ")[0];
}

function formatTitle(s: HypeBotSnapshot): string {
  return s.challenge.title;
}

function formatDays(d: number): string {
  if (d <= 0) return "less than a day";
  if (d === 1) return "24 hours";
  if (d <= 3) return `${d * 24} hours`;
  return `${d} days`;
}

/**
 * Identify the top-ranked participant whose audit score is at least 25 points
 * higher than the leader's (or whose audit ≥ 80 when the leader's < 60). That's
 * the "quality threat" signal Patrick triggers against Bob.
 */
function findQualityThreat(s: HypeBotSnapshot) {
  const leader = s.ranking[0];
  if (!leader) return null;
  const leaderAudit = leader.auditScore ?? 0;
  for (const r of s.ranking.slice(1)) {
    const audit = r.auditScore ?? 0;
    if (audit >= leaderAudit + 25) return r;
    if (leaderAudit < 60 && audit >= 80) return r;
  }
  return null;
}
