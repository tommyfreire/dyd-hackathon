// DYD — Mock data
// Single source for the first draft. Every screen reads from here via /lib/api.ts.
// When the backend is built, replace api.ts function bodies with real fetches —
// do NOT delete this file; it stays as the seed for migrations / tests / Storybook.

import type {
  Challenge,
  Participant,
  RankingEntry,
  EvidenceSubmission,
  FeedPost,
  AgentSnapshot,
  Notification,
  User,
} from "./types";
import type { EvidenceItem, EvidencePacket } from "@/agents/types";

// ─────────────────────────────────────────────────────────────────────────────
// Challenge
// ─────────────────────────────────────────────────────────────────────────────

export const currentChallenge: Challenge = {
  id: "dyd-001",
  number: "DYD #001",
  title: "The Testimonial Hunt",
  subtitle: "Collect client stories. Create marketing impact. Climb the Hype Ranking.",
  description:
    "Leadership has unlocked the first DYD. Your mission: collect valuable client testimonials that prove BairesDev's real business impact. The catch — quantity alone won't win this. Final results are decided after human review of evidence quality.",
  sponsor: "Office of the CEO",
  reward: "Trip for 2 to Bahamas",
  rewardSubtitle: "+ dinner with leadership",
  registrationDeadline: "2026-05-18T23:59:00-03:00",
  submissionDeadline: "2026-06-29T23:59:00-03:00",
  status: "open",
  primaryMetricLabel: "Number of testimonials",
  primaryMetricKey: "testimonial_count",
  hypeRankingDisclaimer:
    "This ranking is based on self-reported progress. Final results may change after human review.",
  rules: [
    "Register before the registration deadline. Late entries are not accepted.",
    "Once registered, you can self-report your progress at any time. The Hype Ranking updates live based on self-reported progress.",
    "Submit your evidence before the submission deadline.",
    "The Hype Ranking is not the final ranking. It is only a live, self-reported board designed to create friendly competition.",
    "Quality matters more than quantity. Final results are decided after human admin review, assisted by the AI Audit Assistant.",
    "If you register and submit no valid evidence, admins may issue a DYD Strike that can affect your eligibility for future challenges.",
  ],
  evidenceRequirements: [
    "Client name",
    "Client company",
    "Client role",
    "Testimonial format: video, written quote, ZIP file, or text note",
    "Permission to use the testimonial",
    "Short business impact summary",
  ],
  auditContract: {
    challengeId: "dyd-001",
    name: "The Testimonial Hunt",
    primaryMetric: {
      key: "testimonial_count",
      label: "Number of testimonials",
      type: "number",
      higherIsBetter: true,
    },
    evidence: {
      acceptedTypes: ["video", "zip", "text"],
      requiredFields: [
        "clientName",
        "clientCompany",
        "clientRole",
        "permissionToUse",
        "businessImpactSummary",
      ],
    },
    auditMode: "ai_assisted_human_approved",
    rubric: [
      { key: "clarity", label: "Clarity of testimonial", weight: 20 },
      { key: "businessImpact", label: "Business impact", weight: 30 },
      { key: "clientRelevance", label: "Client relevance", weight: 20 },
      { key: "specificity", label: "Specificity of the result", weight: 20 },
      { key: "permissionCompleteness", label: "Permission and usage readiness", weight: 10 },
    ],
    redFlags: [
      "testimonial_under_10_seconds",
      "missing_client_permission",
      "unclear_business_impact",
      "duplicate_submission",
      "not_related_to_bairesdev",
    ],
    finalScoreFormula: "validated_metric * quality_multiplier",
    finalDecisionOwner: "admins",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Users (for the role switcher)
// ─────────────────────────────────────────────────────────────────────────────

// The role-switcher in the top bar maps each role to one of these users.
// "participant" → Tomi (demo protagonist)
// "admin"       → Gabo (admin)
// Bob, Patrick, Alice, Charlie are competitors in the ranking — not viewer identities.
export const users: Record<string, User> = {
  "u-sofia":     { id: "u-sofia",     name: "Tomi",            role: "participant", jobTitle: "Customer Success Manager" },
  "u-admin":     { id: "u-admin",     name: "Gabo",            role: "admin",       jobTitle: "Growth Operations Lead" },
  // Competitors — referenced from `participants` but never swapped to via the role switcher.
  "u-bob":       { id: "u-bob",       name: "Bob Martinez",    role: "participant", jobTitle: "Account Executive" },
  "u-patrick":   { id: "u-patrick",   name: "Patrick Olawale", role: "participant", jobTitle: "Delivery Manager" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Participants
// ─────────────────────────────────────────────────────────────────────────────

export const participants: Participant[] = [
  {
    id: "p-bob",
    userId: "u-bob",
    name: "Bob Martinez",
    role: "Account Executive",
    avatarInitials: "BM",
    registered: true,
    selfReportedValue: 18,
    evidenceStatus: "pending_review",
    hypeRank: 1,
    badges: ["On fire", "Needs review"],
  },
  {
    id: "p-sofia",
    userId: "u-sofia",
    name: "Tomi",
    role: "Customer Success Manager",
    avatarInitials: "TM",
    registered: true,
    selfReportedValue: 3,
    evidenceStatus: "uploaded",
    hypeRank: 5,
    badges: ["First mover"],
  },
  {
    id: "p-patrick",
    userId: "u-patrick",
    name: "Patrick Olawale",
    role: "Delivery Manager",
    avatarInitials: "PO",
    registered: true,
    selfReportedValue: 9,
    evidenceStatus: "uploaded",
    hypeRank: 2,
    badges: ["Quality threat"],
  },
  {
    id: "p-alice",
    userId: "u-alice",
    name: "Alice Chen",
    role: "Customer Success Manager",
    avatarInitials: "AC",
    registered: true,
    selfReportedValue: 7,
    evidenceStatus: "pending_review",
    hypeRank: 3,
    badges: ["Rising"],
  },
  {
    id: "p-charlie",
    userId: "u-charlie",
    name: "Charlie Okonkwo",
    role: "Engineering Manager",
    avatarInitials: "CO",
    registered: true,
    selfReportedValue: 6,
    evidenceStatus: "uploaded",
    hypeRank: 4,
    badges: ["Dark horse"],
  },
  // Padding ranks 5–12 — make the leaderboard feel inhabited
  {
    id: "p-rena", userId: "u-rena", name: "Rena Singh", role: "Sales Engineer",
    avatarInitials: "RS", registered: true, selfReportedValue: 5,
    evidenceStatus: "uploaded", hypeRank: 5, badges: ["Rising"],
  },
  {
    id: "p-diego", userId: "u-diego", name: "Diego Salinas", role: "Account Executive",
    avatarInitials: "DS", registered: true, selfReportedValue: 4,
    evidenceStatus: "uploaded", hypeRank: 6, badges: [],
  },
  {
    id: "p-mira", userId: "u-mira", name: "Mira Ostrowski", role: "Partner Manager",
    avatarInitials: "MO", registered: true, selfReportedValue: 4,
    evidenceStatus: "pending_review", hypeRank: 7, badges: [],
  },
  {
    id: "p-leo", userId: "u-leo", name: "Leonardo Vega", role: "Delivery Manager",
    avatarInitials: "LV", registered: true, selfReportedValue: 3,
    evidenceStatus: "uploaded", hypeRank: 8, badges: [],
  },
  {
    id: "p-julia", userId: "u-julia", name: "Julia Park", role: "Marketing PM",
    avatarInitials: "JP", registered: true, selfReportedValue: 3,
    evidenceStatus: "needs_clarification", hypeRank: 9, badges: ["Needs evidence"],
  },
  {
    id: "p-omar", userId: "u-omar", name: "Omar Haddad", role: "Customer Success Manager",
    avatarInitials: "OH", registered: true, selfReportedValue: 2,
    evidenceStatus: "uploaded", hypeRank: 10, badges: [],
  },
  {
    id: "p-tina", userId: "u-tina", name: "Tina Bianchi", role: "Account Executive",
    avatarInitials: "TB", registered: true, selfReportedValue: 2,
    evidenceStatus: "not_submitted", hypeRank: 11, badges: ["Awaiting review"],
    strikeRisk: true,
  },
  {
    id: "p-noah", userId: "u-noah", name: "Noah Bennett", role: "Engineering Manager",
    avatarInitials: "NB", registered: true, selfReportedValue: 1,
    evidenceStatus: "uploaded", hypeRank: 12, badges: [],
  },
];

// Hype-ranking projection: includes audit % so the twin meters can render
export const rankingEntries: RankingEntry[] = participants.map((p) => {
  const hypeMaxValue = 18; // Bob's value defines 100%
  const hypeProgress = Math.round((p.selfReportedValue / hypeMaxValue) * 100);
  const auditMap: Record<string, number> = {
    "p-bob": 46,
    "p-patrick": 91,
    "p-alice": 78,
    "p-charlie": 88,
    "p-rena": 65,
    "p-diego": 58,
    "p-mira": 52,
    "p-leo": 70,
  };
  const auditScore = auditMap[p.id];
  const movement: RankingEntry["movement"] =
    p.id === "p-bob" || p.id === "p-rena" ? "up"
    : p.id === "p-patrick" ? "flat"
    : p.id === "p-charlie" ? "up"
    : p.id === "p-julia" ? "down"
    : "flat";
  return { ...p, hypeProgress, auditScore, movement };
});

// ─────────────────────────────────────────────────────────────────────────────
// Evidence packets — STRUCTURED INPUT to the AI Audit Assistant
//
// These are the only "audit-relevant" facts about each participant's
// submission. The Audit Assistant agent (src/agents/audit-assistant.ts) reads
// these packets, applies the challenge's Audit Contract, and computes the
// quality score, validated count, multiplier, final score, flags, and
// recommendation. Nothing audit-related is hardcoded — the math falls out of
// these inputs.
//
// The demo invariant — Bob declares 18 but Patrick wins after review — is
// shaped by the field values below. See src/agents/audit-assistant.ts for the
// scoring functions; see AGENTS.md for the full picture.
// ─────────────────────────────────────────────────────────────────────────────

/** Build N items with shared properties. Used to keep the seed compact. */
function makeItems(
  prefix: string,
  count: number,
  template: Omit<EvidenceItem, "id">
): EvidenceItem[] {
  return Array.from({ length: count }, (_, i) => ({
    ...template,
    id: `${prefix}-${i + 1}`,
  }));
}

const BOB_ITEMS: EvidenceItem[] = [
  // 3 items too short — flagged for testimonial_under_10_seconds
  ...makeItems("ev-bob-short", 3, {
    clientName: "Various", clientCompany: "Acme Co", clientRole: "Buyer",
    lengthSeconds: 8,
    hasPermission: true, hasBusinessImpact: false, hasMetric: false,
    snippet: "Quick clip — no real content.",
    impactSummary: "Quick mention.",
  }),
  // 4 items missing permission — flagged for missing_client_permission
  ...makeItems("ev-bob-noperm", 4, {
    clientName: "Anonymous", clientCompany: "Various Clients", clientRole: "VP",
    lengthSeconds: 80,
    hasPermission: false, hasBusinessImpact: true, hasMetric: false,
    snippet: "Client said the team was great but never confirmed in writing.",
    impactSummary: "They were happy with the team.",
  }),
  // 5 items rambly — over 180s, lose clarity points but still validate.
  // (They have business impact, so they don't trip the unclear-impact red flag.)
  ...makeItems("ev-bob-rambly", 5, {
    clientName: "Several speakers", clientCompany: "Northwind", clientRole: "",
    lengthSeconds: 240,
    hasPermission: true, hasBusinessImpact: true, hasMetric: false,
    snippet: "Long meandering testimonial covering several topics without a clear point.",
    impactSummary: "They liked working with us overall.",
  }),
  // 4 items missing the business-outcome statement — flagged unclear_business_impact
  // but still NOT discarded if you also count them as validated... wait, they ARE
  // discarded by red-flag logic. So this group is the "vague outcomes in 6 of 18"
  // notes: the 5 rambly + these 4 vague items lose specificity but only the 4
  // here lose validation.
  // To keep validated=11, the only flagged groups are short (3) + no-perm (4).
  // These 4 items keep impact=true so they stay validated.
  ...makeItems("ev-bob-decent", 4, {
    clientName: "Marcus Lee", clientCompany: "Wells Fargo", clientRole: "VP Engineering",
    lengthSeconds: 90,
    hasPermission: true, hasBusinessImpact: true, hasMetric: false,
    snippet: "BairesDev shipped well and we were satisfied.",
    impactSummary: "Helped us ship faster.",
  }),
  // 2 items polished — has metric AND full impact summary (drives specificity)
  ...makeItems("ev-bob-polished", 2, {
    clientName: "Hannah Voss", clientCompany: "Monolith Pharma", clientRole: "CTO",
    lengthSeconds: 120,
    hasPermission: true, hasBusinessImpact: true, hasMetric: true,
    snippet: "BairesDev rationalized 4 years of tech debt in 6 months and we're shipping weekly now.",
    impactSummary: "4 years of tech debt cleaned up in 6 months — shipping weekly across three product lines.",
  }),
];

const PATRICK_ITEMS: EvidenceItem[] = [
  // 7 polished items — the bulk of Patrick's submission.
  ...makeItems("ev-pat", 7, {
    clientName: "Marcus Lee", clientCompany: "Wells Fargo", clientRole: "VP Engineering",
    lengthSeconds: 110,
    hasPermission: true, hasBusinessImpact: true, hasMetric: true,
    snippet: "Lending platform shipped two quarters ahead of plan; $14M in originations unlocked.",
    impactSummary: "Lending platform shipped two quarters ahead of plan — $14M in originations unlocked in the first 90 days.",
  }),
  // 1 short clip — under the clarity sweet spot, still validates (>10s).
  ...makeItems("ev-pat-short", 1, {
    clientName: "Marcus Lee", clientCompany: "Wells Fargo", clientRole: "VP Engineering",
    lengthSeconds: 22,
    hasPermission: true, hasBusinessImpact: true, hasMetric: true,
    snippet: "Quick clip — lending platform shipped early, $14M unlocked.",
    impactSummary: "Lending platform shipped early — $14M in originations unlocked in 90 days.",
  }),
  // 1 item without a hard metric — softens specificity and trims businessImpact.
  ...makeItems("ev-pat-soft", 1, {
    clientName: "Marcus Lee", clientCompany: "Wells Fargo", clientRole: "VP Engineering",
    lengthSeconds: 110,
    hasPermission: true, hasBusinessImpact: true, hasMetric: false,
    snippet: "Working with BairesDev was the difference between shipping and not shipping.",
    impactSummary: "They shipped faster than expected — hard to put one clean number on it.",
  }),
];

const ALICE_ITEMS: EvidenceItem[] = [
  ...makeItems("ev-alice-clean", 6, {
    clientName: "Priya Banerjee", clientCompany: "Helio Health", clientRole: "VP Product",
    lengthSeconds: 95,
    hasPermission: true, hasBusinessImpact: true, hasMetric: true,
    snippet: "Embedded engineering across 30-person product org, zero attrition over 18 months.",
    impactSummary: "Five engineers embedded across our 30-person product org with zero attrition over 18 months.",
  }),
  // 1 item missing permission — flagged
  ...makeItems("ev-alice-noperm", 1, {
    clientName: "Anonymous", clientCompany: "Healthcare Co", clientRole: "Director",
    lengthSeconds: 100,
    hasPermission: false, hasBusinessImpact: true, hasMetric: true,
    snippet: "Reduced onboarding time by 60% but client never signed off.",
    impactSummary: "60% reduction in customer onboarding time, attributed to BairesDev's platform work.",
  }),
];

const CHARLIE_ITEMS: EvidenceItem[] = makeItems("ev-charlie", 6, {
  clientName: "Tobias Engle", clientCompany: "Northwind Logistics", clientRole: "VP Engineering",
  lengthSeconds: 100,
  hasPermission: true, hasBusinessImpact: true, hasMetric: true,
  snippet: "Asked us about the business outcome before writing any code — that was the differentiator.",
  impactSummary: "Tried four other vendors before BairesDev — only team that asked about business outcomes first.",
});

export const evidencePackets: Record<string, EvidencePacket> = {
  "p-bob":     { participantId: "p-bob",     declaredMetric: 18, items: BOB_ITEMS },
  "p-patrick": { participantId: "p-patrick", declaredMetric: 9,  items: PATRICK_ITEMS },
  "p-alice":   { participantId: "p-alice",   declaredMetric: 7,  items: ALICE_ITEMS },
  "p-charlie": { participantId: "p-charlie", declaredMetric: 6,  items: CHARLIE_ITEMS },
};

// ─────────────────────────────────────────────────────────────────────────────
// Evidence submissions — sample drafts for the dashboard view
// ─────────────────────────────────────────────────────────────────────────────

export const evidenceSubmissions: EvidenceSubmission[] = [
  {
    id: "ev-bob-001",
    participantId: "p-bob",
    challengeId: "dyd-001",
    submittedAt: "2026-05-04T15:24:00-03:00",
    files: [
      { id: "f1", name: "wells-fargo-testimonial.mp4", sizeKb: 18420, kind: "video", uploadedAt: "2026-05-04T15:21:00-03:00" },
      { id: "f2", name: "monolith-testimonial-pack.zip", sizeKb: 92301, kind: "zip", uploadedAt: "2026-05-04T15:23:00-03:00" },
    ],
    clientName: "Marcus Lee",
    clientCompany: "Wells Fargo",
    clientRole: "VP of Engineering",
    permissionToUse: false,
    businessImpactSummary: "Helped them ship the new lending platform two quarters ahead of schedule.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Feed posts
// ─────────────────────────────────────────────────────────────────────────────

export const feedPosts: FeedPost[] = [
  {
    id: "fp-1",
    author: "Daremaster",
    authorType: "bot",
    authorRole: "DYD Bot",
    pinned: true,
    content:
      "A new DYD has been unlocked. DYD #001 — The Testimonial Hunt is now open. Trip for 2 to Bahamas + dinner with leadership goes to the participant whose evidence holds up under audit. The Dare is open for 14 days.",
    createdAt: "2026-04-28T09:00:00-03:00",
    reactions: { fire: 11, clap: 8, rocket: 4, eyes: 11, trophy: 2 },
  },
  {
    id: "fp-2",
    author: "Daremaster",
    authorType: "bot",
    authorRole: "DYD Bot",
    content:
      "Bob is leading with 18 testimonials. But remember: quality can flip the board. The audit hasn't started yet.",
    createdAt: "2026-05-05T11:42:00-03:00",
    reactions: { fire: 9, clap: 4, rocket: 2, eyes: 10, trophy: 0 },
  },
  {
    id: "fp-3",
    author: "Patrick Olawale",
    authorRole: "Delivery Manager",
    authorType: "participant",
    content:
      "Just uploaded 9 testimonials. Each one has the client on camera, with explicit permission, naming the dollar impact. I'd rather submit fewer that hold up than chase a number.",
    createdAt: "2026-05-05T14:17:00-03:00",
    reactions: { fire: 10, clap: 13, rocket: 5, eyes: 5, trophy: 2 },
  },
  {
    id: "fp-4",
    author: "Daremaster",
    authorType: "bot",
    authorRole: "DYD Bot",
    content:
      "Patrick just uploaded new evidence. The leaderboard may not tell the full story.",
    createdAt: "2026-05-05T14:31:00-03:00",
    reactions: { fire: 8, clap: 3, rocket: 1, eyes: 13, trophy: 0 },
  },
  {
    id: "fp-5",
    author: "Maya Iverson",
    authorRole: "Software Engineer II",
    authorType: "employee",
    content:
      "Watching this from the sidelines and the Bob vs Patrick situation is the best thing internal comms has shipped in two years.",
    createdAt: "2026-05-05T16:02:00-03:00",
    reactions: { fire: 9, clap: 11, rocket: 2, eyes: 5, trophy: 1 },
  },
  {
    id: "fp-6",
    author: "Daremaster",
    authorType: "bot",
    authorRole: "DYD Bot",
    content:
      "Charlie is a dark horse. Fewer testimonials, but the ones uploaded so far are clean. Quality multiplier looks favorable.",
    createdAt: "2026-05-06T08:55:00-03:00",
    reactions: { fire: 9, clap: 5, rocket: 3, eyes: 10, trophy: 1 },
  },
  {
    id: "fp-7",
    author: "Alice Chen",
    authorRole: "Customer Success Manager",
    authorType: "participant",
    content:
      "Got two CSMs from healthcare on video this morning. Permissions in writing. Slow and steady.",
    createdAt: "2026-05-06T11:20:00-03:00",
    reactions: { fire: 7, clap: 9, rocket: 2, eyes: 6, trophy: 1 },
  },
  {
    id: "fp-8",
    author: "Sofia Reyes",
    authorRole: "Growth Lead",
    authorType: "admin",
    content:
      "Reminder: the audit contract scores Specificity and Business Impact at 50 points combined. \"They were great\" doesn't move the needle — name the outcome, the metric, and the timeframe.",
    createdAt: "2026-05-07T10:00:00-03:00",
    reactions: { fire: 10, clap: 13, rocket: 3, eyes: 4, trophy: 0 },
  },
  {
    id: "fp-9",
    author: "Daremaster",
    authorType: "bot",
    authorRole: "DYD Bot",
    content:
      "48 hours left to register. The Dare is still open.",
    createdAt: "2026-05-10T09:00:00-03:00",
    reactions: { fire: 6, clap: 4, rocket: 2, eyes: 10, trophy: 0 },
  },
  {
    id: "fp-10",
    author: "Diego Salinas",
    authorRole: "Account Executive",
    authorType: "participant",
    content:
      "I dare. Going for 5 high-quality testimonials, no padding.",
    createdAt: "2026-05-10T15:33:00-03:00",
    reactions: { fire: 12, clap: 18, rocket: 2, eyes: 4, trophy: 0 },
  },
  {
    id: "fp-11",
    author: "Daremaster",
    authorType: "bot",
    authorRole: "DYD Bot",
    content:
      "The Hype Ranking is heating up. Final audit will decide the real winner.",
    createdAt: "2026-05-11T09:00:00-03:00",
    reactions: { fire: 8, clap: 5, rocket: 3, eyes: 12, trophy: 0 },
  },
  {
    id: "fp-12",
    author: "Bob Martinez",
    authorRole: "Account Executive",
    authorType: "participant",
    content:
      "18 testimonials in. Going for 25.",
    createdAt: "2026-05-11T14:12:00-03:00",
    reactions: { fire: 11, clap: 7, rocket: 4, eyes: 9, trophy: 1 },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AI agents
// ─────────────────────────────────────────────────────────────────────────────

export const agentSnapshots: AgentSnapshot[] = [
  {
    id: "challenge_designer",
    name: "Challenge Designer",
    purpose:
      "Turns a one-line growth goal from leadership into a complete DYD challenge: title, rules, deadlines, scoring rubric, evidence requirements, and bot scripts.",
    sampleInput:
      "I want employees to collect client testimonials for marketing.",
    latestOutput:
      "Generated DYD #001 — The Testimonial Hunt. Defined 5-criteria audit contract, 14-day window, evidence requirements, and Daremaster launch script.",
    status: "ready",
    lastActionAt: "2026-04-28T08:42:00-03:00",
  },
  {
    id: "daremaster",
    name: "Daremaster",
    purpose:
      "Keeps the challenge socially alive. Posts leaderboard updates, deadline reminders, and competitive commentary in the feed — the same voice that opens every Dare.",
    sampleInput: "Trigger: Patrick uploaded new evidence.",
    latestOutput:
      "Posted: \"Patrick just uploaded new evidence. The leaderboard may not tell the full story.\"",
    status: "running",
    lastActionAt: "2026-05-05T14:31:00-03:00",
  },
  {
    id: "audit_assistant",
    name: "AI Audit Assistant",
    purpose:
      "Reviews evidence against the audit contract. Suggests quality scores, flags issues, and recommends approve / reject / needs-clarification. Final decision belongs to a human admin.",
    sampleInput: "Bob's 18 submitted testimonials + audit contract.",
    latestOutput:
      "Validated 11 of 18. 7 flagged for low quality. 4 missing permission. Suggested final score 6.05. Recommendation: needs manual review.",
    status: "ready",
    lastActionAt: "2026-05-09T18:00:00-03:00",
  },
  {
    id: "insight_extractor",
    name: "Growth Insight Extractor",
    purpose:
      "After approval, mines the testimonial corpus for reusable marketing assets: campaign quotes, case study leads, sales snippets, LinkedIn drafts, and landing page copy.",
    sampleInput: "21 approved testimonials from DYD #001.",
    latestOutput:
      "Extracted 6 strong quotes, 3 case study leads, 5 sales snippets, 4 LinkedIn drafts. Ready for marketing review.",
    status: "idle",
    lastActionAt: "2026-05-09T18:30:00-03:00",
  },
];

// NOTE: Growth assets are NOT seeded here. The Growth Insight Extractor agent
// (src/agents/insight-extractor.ts) computes the asset bundle live from the
// approved evidence packets. See `getGrowthAssets()` in src/lib/api.ts for
// the wiring.

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export const notifications: Notification[] = [
  {
    id: "n-1",
    title: "A new DYD has been unlocked.",
    body: "DYD #001 — The Testimonial Hunt. Trip for 2 to Bahamas + dinner with leadership. The Dare is open.",
    cta: "View Challenge",
    href: "/",
    unread: true,
    createdAt: "2026-04-28T09:00:00-03:00",
  },
  {
    id: "n-2",
    title: "Patrick uploaded new evidence.",
    body: "The leaderboard may not tell the full story.",
    cta: "Open Hype Ranking",
    href: "/ranking",
    unread: true,
    createdAt: "2026-05-05T14:31:00-03:00",
  },
  {
    id: "n-3",
    title: "48 hours left to register.",
    body: "The Dare is still open.",
    cta: "Accept the Dare",
    href: "/",
    unread: false,
    createdAt: "2026-05-10T09:00:00-03:00",
  },
];
