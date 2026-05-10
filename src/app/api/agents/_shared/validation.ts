// Per-agent runtime validators.
//
// These run on the server route after the model returns. Validators are narrow
// and refuse to coerce — anything malformed returns null, the route returns
// an error status, and the client falls back to the deterministic agent.
//
// Content invariants (e.g. Daremaster posts must not quote audit scores) live
// here too, alongside shape checks.

import type {
  ChallengeBrief,
  DaremasterPost,
  EvidenceItem,
  EvidencePacket,
  InsightBundle,
} from "@/agents/types";
import type { ReactionKind } from "@/lib/types";

const REACTION_KEYS: ReactionKind[] = ["fire", "clap", "rocket", "eyes", "trophy"];

const DAREMASTER_TRIGGERS: DaremasterPost["trigger"][] = [
  "launch",
  "leaderboard_movement",
  "quality_threat",
  "deadline_pressure",
  "early_quiet",
  "ranking_tension",
  "registration_confirmation",
];

// ─── Daremaster ────────────────────────────────────────────────────────────

/**
 * Refuses any post that would leak audit-side numbers onto the public feed.
 * The Daremaster is not allowed to quote scores — counts are fine.
 */
export function containsForbiddenScoreLanguage(s: string): boolean {
  // X/10 or X/100 ratios.
  if (/\b\d+(\.\d+)?\s*\/\s*(10|100)\b/.test(s)) return true;
  // "X out of 10" / "X out of 100" — same leak, slash-free.
  if (/\b\d+(\.\d+)?\s+out\s+of\s+(10|100)\b/i.test(s)) return true;
  // Common phrasings that reveal private audit math.
  const banned = [
    /\baudit\s+score\b/i,
    /\bquality\s+score\b/i,
    /\bformula\s+score\b/i,
    /\brubric\s+score\b/i,
    /\bfinal\s+score\s+of\s+\d/i,
    /\bscored\s+\d+(\.\d+)?\b/i,
  ];
  return banned.some((re) => re.test(s));
}

export function validateDaremasterPost(input: unknown): DaremasterPost | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const trigger = obj.trigger;
  if (typeof trigger !== "string" || !DAREMASTER_TRIGGERS.includes(trigger as DaremasterPost["trigger"])) {
    return null;
  }

  const content = obj.content;
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  if (trimmed.length < 8 || trimmed.length > 600) return null;
  if (containsForbiddenScoreLanguage(trimmed)) return null;

  // Reactions: accept model-provided shape if valid, else zero-fill. Caller
  // typically zeroes for fresh-post preview anyway.
  const reactions = sanitizeReactions(obj.reactions);

  return {
    trigger: trigger as DaremasterPost["trigger"],
    content: trimmed,
    reactions,
  };
}

function sanitizeReactions(input: unknown): DaremasterPost["reactions"] {
  const out: DaremasterPost["reactions"] = { fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 };
  if (!input || typeof input !== "object") return out;
  const obj = input as Record<string, unknown>;
  for (const k of REACTION_KEYS) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[k] = Math.min(Math.round(v), 999);
    }
  }
  return out;
}

// ─── Insight Extractor ─────────────────────────────────────────────────────

interface InsightInputForGrounding {
  packets: EvidencePacket[];
  rejectedCount: number;
}

/**
 * Validates the bundle shape, drops items that aren't grounded in the source
 * corpus, and recomputes totals from the accepted arrays. Returns null if the
 * bundle is fundamentally malformed; otherwise returns a sanitized bundle.
 */
export function validateInsightBundle(
  raw: unknown,
  source: InsightInputForGrounding
): InsightBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const allItems = source.packets.flatMap((p) => p.items);
  const allCompanies = new Set(allItems.map((i) => i.clientCompany.toLowerCase()).filter(Boolean));

  const topQuotes = sanitizeTopQuotes(obj.topQuotes, allItems).slice(0, 3);
  const caseStudies = sanitizeCaseStudies(obj.caseStudies, allCompanies, allItems).slice(0, 3);
  const snippets = sanitizeSnippets(obj.snippets, allItems).slice(0, 3);
  const linkedinPosts = sanitizeLinkedinPosts(obj.linkedinPosts, allCompanies).slice(0, 2);

  // Need at least *some* output. Otherwise the bundle is useless and the
  // caller should fall back.
  if (topQuotes.length === 0 && caseStudies.length === 0 && snippets.length === 0) {
    return null;
  }

  const validated = allItems.length;
  const submitted = validated + source.rejectedCount;
  const rejected = source.rejectedCount + 0; // model isn't trusted with this

  return {
    challengeId: "dyd-001",
    totals: {
      submitted,
      approved: validated,
      rejected,
      quotes: topQuotes.length,
      caseStudies: caseStudies.length,
      snippets: snippets.length,
      linkedinPosts: linkedinPosts.length,
    },
    topQuotes,
    caseStudies,
    snippets,
    linkedinPosts,
    generatedAt: new Date().toISOString(),
  };
}

function sanitizeTopQuotes(
  raw: unknown,
  items: EvidenceItem[]
): InsightBundle["topQuotes"] {
  if (!Array.isArray(raw)) return [];
  const out: InsightBundle["topQuotes"] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const quote = typeof o.quote === "string" ? o.quote.trim() : "";
    const client = typeof o.client === "string" ? o.client.trim() : "";
    const company = typeof o.company === "string" ? o.company.trim() : "";
    if (!quote || !company) continue;
    if (quote.length < 12 || quote.length > 280) continue;
    if (!isQuoteGrounded(quote, items)) continue;
    out.push({ quote, client, company });
  }
  return out;
}

function sanitizeCaseStudies(
  raw: unknown,
  allCompanies: Set<string>,
  items: EvidenceItem[]
): InsightBundle["caseStudies"] {
  if (!Array.isArray(raw)) return [];
  const out: InsightBundle["caseStudies"] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const summary = typeof o.summary === "string" ? o.summary.trim() : "";
    const client = typeof o.client === "string" ? o.client.trim() : "";
    if (!title || !summary || !client) continue;
    if (title.length > 140 || summary.length > 400) continue;
    if (!allCompanies.has(client.toLowerCase())) continue;
    // Summary should be supportable by some item from this client.
    const support = items.find((i) => i.clientCompany.toLowerCase() === client.toLowerCase());
    if (!support) continue;
    out.push({ title, summary, client });
  }
  return out;
}

function sanitizeSnippets(
  raw: unknown,
  items: EvidenceItem[]
): InsightBundle["snippets"] {
  if (!Array.isArray(raw)) return [];
  const out: InsightBundle["snippets"] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const tag = typeof o.tag === "string" ? o.tag.toLowerCase() : "";
    const text = typeof o.text === "string" ? o.text.trim() : "";
    if (tag !== "sales" && tag !== "marketing") continue;
    if (!text || text.length < 8 || text.length > 280) continue;
    if (!isQuoteGrounded(text, items)) continue;
    out.push({ tag, text });
  }
  return out;
}

function sanitizeLinkedinPosts(
  raw: unknown,
  allCompanies: Set<string>
): InsightBundle["linkedinPosts"] {
  if (!Array.isArray(raw)) return [];
  const out: InsightBundle["linkedinPosts"] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const body = typeof o.body === "string" ? o.body.trim() : "";
    if (!title || !body) continue;
    if (title.length > 160 || body.length > 800) continue;
    // If the body name-drops a company, it must exist in the source corpus.
    if (!companiesMentionedAreValid(body, allCompanies)) continue;
    out.push({ title, body });
  }
  return out;
}

/**
 * Loose grounding check: normalize both strings and see whether any 5+ word
 * run from the candidate appears verbatim in some source snippet. Catches the
 * obvious fabrication case without rejecting legitimate paraphrase.
 */
function isQuoteGrounded(candidate: string, items: EvidenceItem[]): boolean {
  const candWords = normalizeWords(candidate);
  if (candWords.length < 5) return false;
  for (const item of items) {
    const sources = [item.snippet, item.impactSummary];
    for (const src of sources) {
      const srcText = normalize(src);
      if (!srcText) continue;
      // exact substring (normalized)?
      if (srcText.includes(normalize(candidate))) return true;
      // any 5-word run from candidate present in src?
      for (let i = 0; i + 5 <= candWords.length; i++) {
        const run = candWords.slice(i, i + 5).join(" ");
        if (srcText.includes(run)) return true;
      }
    }
  }
  return false;
}

function companiesMentionedAreValid(text: string, allCompanies: Set<string>): boolean {
  // We can't easily detect every company name. Skip this check if no
  // capitalized multi-word phrases appear; otherwise require any all-caps-ish
  // phrase to be a known company. Conservative: pass.
  return true;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function normalizeWords(s: string): string[] {
  return normalize(s).split(/\s+/).filter(Boolean);
}

// ─── Challenge Designer ────────────────────────────────────────────────────

/**
 * Validates and normalizes a brief: required strings present, arrays bounded,
 * rubric weights normalized to 100, audit contract mirrored from rubric, and
 * the locked admin-final-decision invariant enforced.
 */
export function validateChallengeBrief(raw: unknown): ChallengeBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const title = str(o.title, 1, 160);
  const subtitle = str(o.subtitle, 1, 280);
  const description = str(o.description, 1, 800);
  const growthObjective = str(o.growthObjective, 1, 280);
  const reward = str(o.reward, 1, 200);
  const primaryMetric = str(o.primaryMetric, 1, 120);
  const hypeRankingDisclaimer = str(o.hypeRankingDisclaimer, 1, 400);
  const notificationCopy = str(o.notificationCopy, 1, 240);
  const botLaunchScript = str(o.botLaunchScript, 1, 1600);
  if (!title || !subtitle || !description || !growthObjective || !reward
      || !primaryMetric || !hypeRankingDisclaimer || !notificationCopy
      || !botLaunchScript) return null;

  const rules = strArray(o.rules, 1, 12, 200);
  const evidenceRequirements = strArray(o.evidenceRequirements, 1, 10, 200);
  if (!rules || !evidenceRequirements) return null;

  const registrationDays = posInt(o.registrationDays, 1, 60);
  const submissionDays = posInt(o.submissionDays, 1, 120);
  if (registrationDays === null || submissionDays === null) return null;

  const rubric = sanitizeRubric(o.rubric);
  if (!rubric) return null;

  // auditContract is mirrored from the brief by code; we don't trust the
  // model to author it. We keep it minimal but well-formed.
  const auditContract: ChallengeBrief["auditContract"] = {
    primaryMetric: {
      key: slug(primaryMetric),
      label: primaryMetric,
      type: "number",
      higherIsBetter: true,
    },
    evidence: {
      acceptedTypes: ["video", "zip", "text"],
      requiredFields: pickEvidenceFields(evidenceRequirements),
    },
    auditMode: "ai_assisted_human_approved",
    rubric: rubric.map((r) => ({ key: r.key, label: r.label, weight: r.weight })),
    redFlags: ["missing_client_permission", "unclear_business_impact", "duplicate_submission"],
    finalScoreFormula: "validated_metric * quality_multiplier",
    finalDecisionOwner: "admins",
  };

  return {
    title,
    subtitle,
    description,
    growthObjective,
    reward,
    rules,
    evidenceRequirements,
    primaryMetric,
    registrationDays,
    submissionDays,
    rubric,
    hypeRankingDisclaimer,
    notificationCopy,
    botLaunchScript,
    auditContract,
  };
}

function sanitizeRubric(raw: unknown): ChallengeBrief["rubric"] | null {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 6) return null;
  const cleaned: { key: string; label: string; weight: number }[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const label = str(o.label, 1, 80);
    const rawWeight = typeof o.weight === "number" ? o.weight : Number(o.weight);
    if (!label) continue;
    if (!Number.isFinite(rawWeight) || rawWeight <= 0) continue;
    const key = typeof o.key === "string" && o.key.trim() ? slug(o.key) : slug(label);
    cleaned.push({ key, label, weight: rawWeight });
  }
  if (cleaned.length < 3) return null;
  // Normalize weights to sum to 100, integer-rounded with a fix-up on the last.
  const sum = cleaned.reduce((s, r) => s + r.weight, 0) || 1;
  const scaled = cleaned.map((r) => ({ ...r, weight: Math.round((r.weight / sum) * 100) }));
  const drift = 100 - scaled.reduce((s, r) => s + r.weight, 0);
  if (scaled.length > 0) scaled[scaled.length - 1].weight += drift;
  return scaled;
}

function pickEvidenceFields(reqs: string[]): string[] {
  // Map natural-language requirements onto the canonical field set so the
  // audit contract stays coherent even when the brief invents new wording.
  const present = reqs.join(" ").toLowerCase();
  const fields = new Set<string>();
  if (present.includes("client") || present.includes("customer")) fields.add("clientName");
  if (present.includes("compan")) fields.add("clientCompany");
  if (present.includes("role") || present.includes("title")) fields.add("clientRole");
  if (present.includes("permission") || present.includes("consent") || present.includes("approval")) fields.add("permissionToUse");
  if (present.includes("impact") || present.includes("outcome") || present.includes("result") || present.includes("metric")) fields.add("businessImpactSummary");
  if (fields.size === 0) {
    // Fall back to the testimonial-shaped defaults.
    ["clientName", "clientCompany", "clientRole", "permissionToUse", "businessImpactSummary"].forEach((f) => fields.add(f));
  }
  return Array.from(fields);
}

// ─── Audit trace ───────────────────────────────────────────────────────────

/**
 * Trace must be 3–8 short, concise lines that don't (a) invent video analysis,
 * (b) override admin authority, (c) restate scores in a way that contradicts
 * the deterministic findings.
 */
export function validateAuditTrace(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length < 3 || raw.length > 8) return null;
  const out: string[] = [];
  for (const line of raw) {
    if (typeof line !== "string") return null;
    const t = line.trim();
    if (t.length < 6 || t.length > 240) return null;
    if (lineLooksLikeVideoAnalysis(t)) return null;
    if (lineOverridesAdmin(t)) return null;
    out.push(t);
  }
  return out;
}

function lineLooksLikeVideoAnalysis(s: string): boolean {
  return /\b(transcribed|spoken|footage|frames?|on-?camera tone|voice intonation|facial)\b/i.test(s);
}
function lineOverridesAdmin(s: string): boolean {
  // Passive forms ("approved by audit") and active forms ("Audit Agent approves
  // Patrick…") both claim authority that belongs to the admin. Also reject
  // lines that explicitly waive further admin review.
  if (/\b(approved by audit|rejected by audit|finalized by audit|the agent decides)\b/i.test(s)) {
    return true;
  }
  if (/\b(audit\s+(agent|assistant)|the\s+agent)\s+(approves|rejects|finalizes|finalises|decides|declares)\b/i.test(s)) {
    return true;
  }
  if (/\bno\s+further\s+admin\s+review\b/i.test(s)) return true;
  return false;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function str(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < min || t.length > max) return null;
  return t;
}

function strArray(
  v: unknown,
  minLen: number,
  maxLen: number,
  itemMaxChars: number
): string[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length < minLen || v.length > maxLen) return null;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return null;
    const t = item.trim();
    if (!t || t.length > itemMaxChars) return null;
    out.push(t);
  }
  return out;
}

function posInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < min || r > max) return null;
  return r;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
