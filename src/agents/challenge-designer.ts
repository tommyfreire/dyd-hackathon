// DYD — Challenge Designer
//
// Turns a one-line growth goal from leadership into a complete DYD challenge
// brief: title, rules, rubric, deadlines, evidence requirements, bot script.
//
// MVP implementation: keyword-based template selection. Each template captures
// a different challenge archetype (testimonials, public demos, case studies,
// referrals). The user's prompt is embedded as the brief's subtitle so the
// generated output feels written for them, not pulled out of a drawer.
//
// Real-LLM swap: replace `pickTemplate()` + interpolation with one call to
// the model that returns `ChallengeBrief` JSON directly. The I/O contract in
// `types.ts` doesn't change.

import type { ChallengeBrief, ChallengeDesignerInput } from "./types";

// ─── Templates — one archetype per template, keyword-classified ────────────

interface TemplateMatch {
  /** Lowercase keywords; if any appear in the prompt, the template fires. */
  keywords: string[];
  /** Producer of the brief, given the user's exact prompt. */
  build: (prompt: string) => ChallengeBrief;
}

const TESTIMONIAL_TEMPLATE: TemplateMatch = {
  keywords: ["testimonial", "client story", "client stories", "client love", "social proof"],
  build: (prompt) => ({
    title: "The Testimonial Hunt",
    subtitle: prompt,
    description:
      "Collect valuable client testimonials that show how BairesDev created real business impact. Quantity opens the door; quality decides who wins.",
    growthObjective: "Generate marketing-ready proof: campaign quotes, case study leads, sales snippets.",
    reward: "Trip to a leadership-hosted dinner",
    rules: [
      "Register before the registration deadline.",
      "Self-report progress at any time. The Hype Ranking updates live.",
      "Submit evidence before the submission deadline.",
      "Quality matters more than quantity. Final ranking is decided after review.",
      "If you register and submit no valid evidence, admins may issue a DYD Strike.",
    ],
    evidenceRequirements: [
      "Client name, company, and role",
      "Permission to use the testimonial",
      "Business impact summary with a metric",
      "Recording or written testimonial",
    ],
    primaryMetric: "Number of testimonials",
    registrationDays: 5,
    submissionDays: 14,
    rubric: [
      { key: "clarity",                label: "Clarity of testimonial",       weight: 20 },
      { key: "businessImpact",         label: "Business impact",              weight: 30 },
      { key: "clientRelevance",        label: "Client relevance",             weight: 20 },
      { key: "specificity",            label: "Specificity of the result",    weight: 20 },
      { key: "permissionCompleteness", label: "Permission and usage readiness", weight: 10 },
    ],
    hypeRankingDisclaimer:
      "This ranking is based on self-reported progress. Final results may change after human review.",
    notificationCopy: "A new DYD has been unlocked. Collect the strongest client testimonials. Do you dare?",
    botLaunchScript:
      "BairesDev has changed the way many clients build software. Now we need their stories. Collect the strongest client testimonials. Turn client love into growth. Do you dare?",
    auditContract: {
      primaryMetric: { key: "testimonial_count", label: "Number of testimonials", type: "number", higherIsBetter: true },
      evidence: {
        acceptedTypes: ["video", "zip", "text"],
        requiredFields: ["clientName", "clientCompany", "clientRole", "permissionToUse", "businessImpactSummary"],
      },
      auditMode: "ai_assisted_human_approved",
      rubric: [
        { key: "clarity",                label: "Clarity of testimonial",       weight: 20 },
        { key: "businessImpact",         label: "Business impact",              weight: 30 },
        { key: "clientRelevance",        label: "Client relevance",             weight: 20 },
        { key: "specificity",            label: "Specificity of the result",    weight: 20 },
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
  }),
};

const PUBLIC_DEMO_TEMPLATE: TemplateMatch = {
  keywords: ["demo", "public-facing", "ship", "launch"],
  build: (prompt) => ({
    title: "The Friday Demo",
    subtitle: prompt,
    description:
      "Ship a public-facing demo every Friday for a month. Let the work speak for itself.",
    growthObjective: "Build a portfolio of small public artefacts marketing can repurpose into content.",
    reward: "Friday off + the winning demo URL printed and framed",
    rules: [
      "Demo must be live and public-facing (not a slide deck).",
      "Each demo needs a one-paragraph problem statement.",
      "Submit a screen recording + a public URL by 5pm Friday.",
      "Quality is judged on usefulness and finish, not novelty.",
    ],
    evidenceRequirements: [
      "Live URL",
      "Screen recording (≤ 90s)",
      "One-paragraph problem statement",
      "User feedback or a real metric (any)",
    ],
    primaryMetric: "Number of demos shipped",
    registrationDays: 3,
    submissionDays: 28,
    rubric: [
      { key: "usefulness", label: "Usefulness", weight: 35 },
      { key: "finish",     label: "Finish",     weight: 30 },
      { key: "clarity",    label: "Clarity",    weight: 20 },
      { key: "reach",      label: "Reach",      weight: 15 },
    ],
    hypeRankingDisclaimer:
      "This ranking is based on demos shipped. Final results may change after human review of finish and reach.",
    notificationCopy: "Ship something real this Friday. Demos only. Do you dare?",
    botLaunchScript:
      "Four Fridays. Four demos. The shipped link is the testimonial. Do you dare?",
    auditContract: {
      primaryMetric: { key: "demo_count", label: "Demos shipped", type: "number", higherIsBetter: true },
      evidence: {
        acceptedTypes: ["video", "url", "text"],
        requiredFields: ["liveUrl", "problemStatement", "screenRecording"],
      },
      auditMode: "ai_assisted_human_approved",
      rubric: [
        { key: "usefulness", label: "Usefulness", weight: 35 },
        { key: "finish",     label: "Finish",     weight: 30 },
        { key: "clarity",    label: "Clarity",    weight: 20 },
        { key: "reach",      label: "Reach",      weight: 15 },
      ],
      redFlags: ["demo_offline", "no_problem_statement", "duplicate_submission"],
      finalScoreFormula: "validated_metric * quality_multiplier",
      finalDecisionOwner: "admins",
    },
  }),
};

const CASE_STUDY_TEMPLATE: TemplateMatch = {
  keywords: ["case study", "case studies", "case-study", "writeup", "long-form"],
  build: (prompt) => ({
    title: "The Case Study Sprint",
    subtitle: prompt,
    description:
      "Bring back at least one client case study with a named outcome and a number we can put on a slide.",
    growthObjective: "Stack the sales deck and the website with three new credible case studies in one quarter.",
    reward: "Co-byline on the published case study + leadership shout-out",
    rules: [
      "Case study must include a named client (or de-identified with permission).",
      "At least one quantitative outcome metric is required.",
      "Submission must include a draft narrative, not just bullet points.",
      "Quality bar is publication-readiness; spelling and structure count.",
    ],
    evidenceRequirements: [
      "Client name (or anonymized profile)",
      "One quantitative outcome metric",
      "300-word narrative draft",
      "Quote from the client",
    ],
    primaryMetric: "Case studies submitted",
    registrationDays: 7,
    submissionDays: 60,
    rubric: [
      { key: "clarity",         label: "Narrative clarity", weight: 25 },
      { key: "quantOutcome",    label: "Quantitative outcome strength", weight: 30 },
      { key: "clientCredibility", label: "Client credibility", weight: 25 },
      { key: "publicationReady", label: "Publication-readiness", weight: 20 },
    ],
    hypeRankingDisclaimer:
      "This ranking is based on submitted drafts. Final ranking is decided after editorial review.",
    notificationCopy: "Bring back a case study. One name. One number. One paragraph. Do you dare?",
    botLaunchScript:
      "We have stories worth telling. We don't have them on paper. Bring back one this quarter. Do you dare?",
    auditContract: {
      primaryMetric: { key: "case_study_count", label: "Case studies", type: "number", higherIsBetter: true },
      evidence: {
        acceptedTypes: ["text", "doc"],
        requiredFields: ["clientName", "quantitativeOutcome", "narrativeDraft", "clientQuote"],
      },
      auditMode: "ai_assisted_human_approved",
      rubric: [
        { key: "clarity",          label: "Narrative clarity", weight: 25 },
        { key: "quantOutcome",     label: "Quantitative outcome", weight: 30 },
        { key: "clientCredibility", label: "Client credibility", weight: 25 },
        { key: "publicationReady", label: "Publication-readiness", weight: 20 },
      ],
      redFlags: ["missing_quant_outcome", "missing_client_name", "duplicate_submission"],
      finalScoreFormula: "validated_metric * quality_multiplier",
      finalDecisionOwner: "admins",
    },
  }),
};

const LINKEDIN_TEMPLATE: TemplateMatch = {
  keywords: ["linkedin", "linked in", "social post", "social posts", "engagement"],
  build: (prompt) => ({
    title: "The LinkedIn Spotlight",
    subtitle: prompt,
    description:
      "Turn your voice into a growth channel. Publish authentic LinkedIn posts about real BairesDev delivery stories and compete on qualified engagement.",
    growthObjective: "Build employee-led top-of-funnel and credible social proof through authentic engineer voices.",
    reward: "Trip for 2 + content collab feature on the BairesDev brand channel",
    rules: [
      "Posts must be published from your personal LinkedIn profile.",
      "Each post must reference a real BairesDev delivery story — no fabricated content.",
      "Self-report your post URL and engagement metrics before the submission deadline.",
      "Final ranking weighs relevance, credibility, and impact — not just reach.",
    ],
    evidenceRequirements: [
      "Public LinkedIn post URL",
      "Screenshot of engagement metrics (reactions, comments, reshares)",
      "Short note on the underlying delivery story",
      "Confirmation the client / team is OK with the public reference",
    ],
    primaryMetric: "Qualified LinkedIn posts",
    registrationDays: 5,
    submissionDays: 21,
    rubric: [
      { key: "relevance",    label: "Story relevance",      weight: 25 },
      { key: "credibility",  label: "Credibility",          weight: 25 },
      { key: "impact",       label: "Business impact",      weight: 25 },
      { key: "engagement",   label: "Qualified engagement", weight: 15 },
      { key: "authenticity", label: "Authenticity",         weight: 10 },
    ],
    hypeRankingDisclaimer:
      "This ranking is based on self-reported posts and reach. Relevance, credibility, and impact decide the final board.",
    notificationCopy: "Your voice becomes the growth channel. Post a real BairesDev delivery story. Do you dare?",
    botLaunchScript:
      "A new DYD has been unlocked.\n\nThis time, your voice becomes the growth channel.\n\nCreate authentic LinkedIn posts that share real BairesDev delivery stories.\n\nThe Hype Ranking will track engagement.\n\nBut reach alone will not win.\n\nRelevance, credibility, and impact will decide the final board.\n\nThe rules are waiting below.\n\nDo you dare?",
    auditContract: {
      primaryMetric: { key: "linkedin_post_count", label: "Qualified LinkedIn posts", type: "number", higherIsBetter: true },
      evidence: {
        acceptedTypes: ["url", "image", "text"],
        requiredFields: ["postUrl", "engagementScreenshot", "storyContext", "permission"],
      },
      auditMode: "ai_assisted_human_approved",
      rubric: [
        { key: "relevance",    label: "Story relevance",      weight: 25 },
        { key: "credibility",  label: "Credibility",          weight: 25 },
        { key: "impact",       label: "Business impact",      weight: 25 },
        { key: "engagement",   label: "Qualified engagement", weight: 15 },
        { key: "authenticity", label: "Authenticity",         weight: 10 },
      ],
      redFlags: [
        "fabricated_story",
        "private_profile_post",
        "missing_engagement_proof",
        "duplicate_submission",
      ],
      finalScoreFormula: "validated_metric * quality_multiplier",
      finalDecisionOwner: "admins",
    },
  }),
};

const REFERRAL_TEMPLATE: TemplateMatch = {
  keywords: ["referral", "referrals", "introduction", "intro", "warm lead"],
  build: (prompt) => ({
    title: "The Warm-Intro Hunt",
    subtitle: prompt,
    description:
      "Bring back qualified introductions to potential new clients — with permission to follow up.",
    growthObjective: "Top-of-funnel growth through trusted personal networks rather than cold outbound.",
    reward: "1% of first-year contract value if a referred lead converts + leadership dinner",
    rules: [
      "Referral must come with explicit permission to contact.",
      "Contact must be at a Director level or above.",
      "No existing pipeline contacts count — has to be net-new.",
      "Quality > quantity. We'd rather have 2 great intros than 20 cold ones.",
    ],
    evidenceRequirements: [
      "Referred contact's name, role, company",
      "Written permission to follow up",
      "Why this contact specifically (one paragraph)",
    ],
    primaryMetric: "Referrals introduced",
    registrationDays: 7,
    submissionDays: 30,
    rubric: [
      { key: "seniority",      label: "Contact seniority",    weight: 25 },
      { key: "icpFit",         label: "ICP fit",              weight: 30 },
      { key: "permissionStrength", label: "Permission strength", weight: 25 },
      { key: "specificity",    label: "Reasoning specificity", weight: 20 },
    ],
    hypeRankingDisclaimer:
      "This ranking is based on submitted intros. Final ranking is decided after qualification review.",
    notificationCopy: "Open your network. Bring back one warm intro. Do you dare?",
    botLaunchScript:
      "Cold outbound is loud. Warm intros are quiet — and they convert. Open your network. Do you dare?",
    auditContract: {
      primaryMetric: { key: "referral_count", label: "Referrals", type: "number", higherIsBetter: true },
      evidence: {
        acceptedTypes: ["text", "email"],
        requiredFields: ["contactName", "contactCompany", "contactRole", "permissionEvidence", "rationale"],
      },
      auditMode: "ai_assisted_human_approved",
      rubric: [
        { key: "seniority",      label: "Contact seniority",    weight: 25 },
        { key: "icpFit",         label: "ICP fit",              weight: 30 },
        { key: "permissionStrength", label: "Permission strength", weight: 25 },
        { key: "specificity",    label: "Reasoning specificity", weight: 20 },
      ],
      redFlags: ["missing_permission", "below_seniority_bar", "existing_pipeline_contact"],
      finalScoreFormula: "validated_metric * quality_multiplier",
      finalDecisionOwner: "admins",
    },
  }),
};

const GENERIC_TEMPLATE: TemplateMatch = {
  keywords: [], // fallback
  build: (prompt) => ({
    title: "A New DYD",
    subtitle: prompt,
    description:
      "Custom challenge derived from leadership input. Refine the rubric and evidence requirements with the admin team before launch.",
    growthObjective: "To be defined by the challenge owner.",
    reward: "TBD by sponsor",
    rules: [
      "Register before the registration deadline.",
      "Self-report progress at any time.",
      "Submit evidence before the submission deadline.",
      "Quality outweighs quantity. Final ranking is human-reviewed.",
    ],
    evidenceRequirements: [
      "Concrete output (link, file, or document)",
      "One-paragraph context",
      "Permission / clearance for use",
    ],
    primaryMetric: "Custom",
    registrationDays: 5,
    submissionDays: 14,
    rubric: [
      { key: "quality",     label: "Quality",     weight: 40 },
      { key: "specificity", label: "Specificity", weight: 30 },
      { key: "completeness", label: "Completeness", weight: 30 },
    ],
    hypeRankingDisclaimer:
      "This ranking is based on self-reported progress. Final results may change after human review.",
    notificationCopy: "A new DYD is open. Do you dare?",
    botLaunchScript: "A new DYD has been unlocked. The Daremaster will be watching.",
    auditContract: {
      primaryMetric: { key: "custom_metric", label: "Custom metric", type: "number", higherIsBetter: true },
      evidence: {
        acceptedTypes: ["text", "video", "url"],
        requiredFields: ["context", "output", "permission"],
      },
      auditMode: "ai_assisted_human_approved",
      rubric: [
        { key: "quality",      label: "Quality",      weight: 40 },
        { key: "specificity",  label: "Specificity",  weight: 30 },
        { key: "completeness", label: "Completeness", weight: 30 },
      ],
      redFlags: ["missing_permission", "duplicate_submission"],
      finalScoreFormula: "validated_metric * quality_multiplier",
      finalDecisionOwner: "admins",
    },
  }),
};

// Order matters — specific archetypes first; generic is fallback.
const TEMPLATES = [
  LINKEDIN_TEMPLATE,
  TESTIMONIAL_TEMPLATE,
  PUBLIC_DEMO_TEMPLATE,
  CASE_STUDY_TEMPLATE,
  REFERRAL_TEMPLATE,
  GENERIC_TEMPLATE,
];

/** Pick the first template whose keywords appear in the prompt. */
export function pickTemplate(prompt: string): TemplateMatch {
  const p = prompt.toLowerCase();
  for (const t of TEMPLATES) {
    if (t.keywords.some((kw) => p.includes(kw))) return t;
  }
  return GENERIC_TEMPLATE;
}

/**
 * Generate a complete challenge brief from a one-line prompt.
 *
 * @returns A fully-shaped `ChallengeBrief`. The admin reviews + edits it
 *          before publishing as a DYD.
 */
export function design({ prompt }: ChallengeDesignerInput): ChallengeBrief {
  return pickTemplate(prompt).build(prompt.trim());
}
