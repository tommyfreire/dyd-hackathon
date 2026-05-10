// Realistic LLM output fixtures.
//
// These cover the spectrum of model drift the validator and JSON extractor
// have to absorb: clean output, output wrapped in code fences, output with a
// prose preamble, output with trailing commentary, near-misses on the
// no-scores invariant, partial fabrication, schema drift on the brief, and
// over-/under-sized audit traces.
//
// Per the architect's plan: the implementer chooses exact strings; keep them
// short and readable. They are the proof surface for provider readiness.

/** Shape of an Anthropic Messages response with a single text content block. */
export function anthropicEnvelope(text: string): {
  content: { type: "text"; text: string }[];
} {
  return { content: [{ type: "text", text }] };
}

// ─── Daremaster ────────────────────────────────────────────────────────────

const validDaremasterPostObj = {
  trigger: "quality_threat",
  content:
    "Charlie is the dark horse. Six clean testimonials, every story specific. Bob's volume is loud, but quality is rewriting the leaderboard.",
  reactions: { fire: 12, clap: 8, rocket: 4, eyes: 21, trophy: 1 },
};

export const cleanDaremasterPostJson = JSON.stringify(validDaremasterPostObj);

export const fencedDaremasterPostJson =
  "```json\n" + JSON.stringify(validDaremasterPostObj, null, 2) + "\n```";

export const proseWrappedDaremasterPostJson =
  "Here is the post you asked for:\n\n" +
  JSON.stringify(validDaremasterPostObj, null, 2);

export const trailingCommentaryDaremasterPostJson =
  JSON.stringify(validDaremasterPostObj, null, 2) +
  "\n\nLet me know if you want a punchier tone.";

export const scoreLeakDaremasterPostJson = JSON.stringify({
  trigger: "quality_threat",
  content:
    "Charlie is rewriting the board. Patrick sits at 9.5/10 on quality, Bob at 5.1/10. The audit weighs quality.",
  reactions: { fire: 10, clap: 6, rocket: 3, eyes: 14, trophy: 1 },
});

/** Score leakage that AVOIDS slash notation — the architect's "95 out of 100" pattern. */
export const nearMissScoreLeakDaremasterPostJson = JSON.stringify({
  trigger: "quality_threat",
  content:
    "Charlie is at 100 out of 100 on pure quality. Patrick sits at 95 out of 100. Bob's volume cannot recover from that.",
  reactions: { fire: 8, clap: 5, rocket: 2, eyes: 11, trophy: 0 },
});

// ─── Insight Extractor ─────────────────────────────────────────────────────

/** Quotes are exact substrings of approvedPacketA / approvedPacketB snippets. */
const groundedQuotes = [
  {
    quote: "Lending platform shipped two quarters ahead of plan; $14M in originations unlocked.",
    client: "Marcus Lee",
    company: "Wells Fargo",
  },
  {
    quote: "Asked us about the business outcome before writing any code — that was the differentiator.",
    client: "Tobias Engle",
    company: "Northwind Logistics",
  },
];

const fabricatedQuote = {
  quote: "We tripled revenue overnight after BairesDev rebuilt our entire stack from scratch.",
  client: "Jane Doe",
  company: "Imaginary Inc",
};

const groundedCaseStudies = [
  {
    title: "Wells Fargo — $14M in originations unlocked",
    summary:
      "Lending platform shipped two quarters ahead of plan — $14M in originations unlocked in the first 90 days.",
    client: "Wells Fargo",
  },
  {
    title: "Northwind — embedded engineers behave like in-house",
    summary:
      "Embedded engineers behave like in-house staff; pushed back on three flawed specs in the first month.",
    client: "Northwind Logistics",
  },
];

const groundedSnippets = [
  {
    tag: "sales",
    text: "Lending platform shipped two quarters ahead of plan — $14M in originations unlocked in the first 90 days.",
  },
  {
    tag: "marketing",
    text: "Tried four other vendors before BairesDev — only team that asked about business outcomes first.",
  },
];

const groundedLinkedinPosts = [
  {
    title: "Two quarters early, $14M unlocked",
    body: "Wells Fargo's VP Engineering on the work: \"Lending platform shipped two quarters ahead of plan; $14M in originations unlocked.\"",
  },
  {
    title: "Vendors that ask about outcomes first",
    body: "Northwind tried four others before BairesDev. Their VP Engineering said only one team asked about business outcomes before writing code.",
  },
];

export const cleanInsightBundleJson = JSON.stringify({
  topQuotes: groundedQuotes,
  caseStudies: groundedCaseStudies,
  snippets: groundedSnippets,
  linkedinPosts: groundedLinkedinPosts,
});

export const partiallyUngroundedInsightBundleJson = JSON.stringify({
  topQuotes: [groundedQuotes[0], fabricatedQuote],
  caseStudies: groundedCaseStudies,
  snippets: groundedSnippets,
  linkedinPosts: groundedLinkedinPosts,
});

/** Exactly three quotes: two grounded, one fabricated — exercises per-item drop. */
export const twoGroundedOneFabricatedInsightBundleJson = JSON.stringify({
  topQuotes: [groundedQuotes[0], groundedQuotes[1], fabricatedQuote],
  caseStudies: groundedCaseStudies,
  snippets: groundedSnippets,
  linkedinPosts: groundedLinkedinPosts,
});

export const fullyUngroundedInsightBundleJson = JSON.stringify({
  topQuotes: [fabricatedQuote, fabricatedQuote, fabricatedQuote],
  caseStudies: [
    {
      title: "Imaginary Inc — fabricated win",
      summary: "We tripled revenue overnight after BairesDev rebuilt our entire stack from scratch.",
      client: "Imaginary Inc",
    },
  ],
  snippets: [
    { tag: "sales", text: "Made up unverifiable revenue claim." },
    { tag: "fluff", text: "Invalid tag." },
  ],
  linkedinPosts: [
    { title: "Generic", body: "We helped a client somewhere with something." },
  ],
});

// ─── Challenge Designer ────────────────────────────────────────────────────

const validBriefBase = {
  title: "DYD #002 — The Strategic Account Hunt",
  subtitle: "Collect on-camera testimonials from your top three strategic accounts in 21 days.",
  description:
    "Every employee captures structured testimonials from strategic clients. The audit weighs quality of evidence over volume. Marketing turns the corpus into reusable assets.",
  growthObjective: "Collect on-camera testimonials from strategic accounts.",
  reward: "Trip for 2 to Bahamas + dinner with leadership",
  rules: [
    "One testimonial at a time, uploaded with full client metadata.",
    "Written permission to reuse must accompany each submission.",
    "Audit reviews each clip against the rubric before final scoring.",
    "Final results are decided by admins after AI-assisted review.",
  ],
  evidenceRequirements: [
    "Client name and company.",
    "Client role or title.",
    "Written permission to reuse.",
    "One-line business impact summary.",
  ],
  primaryMetric: "Number of testimonials",
  registrationDays: 5,
  submissionDays: 21,
  hypeRankingDisclaimer:
    "Ranks are based on self-reported counts; final results belong to the audit.",
  notificationCopy: "A new DYD just dropped. Do you dare?",
  botLaunchScript:
    "A new DYD has been unlocked. The Strategic Account Hunt is now open. Register before May 18. Submissions close June 29.",
};

export const cleanChallengeBriefJson = JSON.stringify({
  ...validBriefBase,
  rubric: [
    { key: "clarity", label: "Clarity of testimonial", weight: 20 },
    { key: "businessImpact", label: "Business impact", weight: 30 },
    { key: "clientRelevance", label: "Client relevance", weight: 20 },
    { key: "specificity", label: "Specificity of the result", weight: 20 },
    { key: "permissionCompleteness", label: "Permission and usage readiness", weight: 10 },
  ],
});

/** Rubric weights sum to 87, exercises validator normalization to 100. */
export const rubricWeights87BriefJson = JSON.stringify({
  ...validBriefBase,
  rubric: [
    { key: "clarity", label: "Clarity of testimonial", weight: 17 },
    { key: "businessImpact", label: "Business impact", weight: 25 },
    { key: "clientRelevance", label: "Client relevance", weight: 17 },
    { key: "specificity", label: "Specificity of the result", weight: 19 },
    { key: "permissionCompleteness", label: "Permission and usage readiness", weight: 9 },
  ],
});

/** Missing required field (`title`) — should fail schema validation. */
export const schemaViolatingBriefJson = (() => {
  const obj = JSON.parse(cleanChallengeBriefJson);
  delete obj.title;
  return JSON.stringify(obj);
})();

// ─── Audit trace ───────────────────────────────────────────────────────────

export const cleanAuditTraceJson = JSON.stringify([
  "9 of 9 items pass validation against the contract's red flags.",
  "Clarity criterion: 18/20 — eight clips run between 30 and 180 seconds.",
  "Business impact: 29/30 — every clip names an outcome; one without a hard metric.",
  "Specificity: 18/20 — eight items pair a metric with a meaty impact line.",
  "Quality blends to 95; admin-side formula computes the final score.",
  "Recommendation is 'Strong candidate for winner' — admin holds the final call.",
]);

/** Eight is the cap; nine should be rejected. */
export const nineLineAuditTraceJson = JSON.stringify([
  "9 of 9 items pass validation.",
  "Clarity criterion held at 18/20.",
  "Business impact held at 29/30.",
  "Specificity held at 18/20.",
  "Permission completeness perfect.",
  "Client relevance perfect.",
  "Quality score 95/100.",
  "Recommendation: Strong candidate for winner.",
  "Admin holds the final call.",
]);

/** Twelve lines — too long. */
export const oversizedAuditTraceJson = JSON.stringify(
  Array.from({ length: 12 }, (_, i) => `Line ${i + 1} of an over-long trace.`)
);

export const videoAnalysisAuditTraceJson = JSON.stringify([
  "Transcribed all nine clips and analyzed spoken cadence.",
  "Examined the on-camera tone and facial cues for credibility.",
  "Audit Agent decides the clip is approved based on voice intonation.",
  "Validated items: 9.",
]);

/** Trace line claiming agent authority — should be rejected. */
export const authorityClaimAuditTraceJson = JSON.stringify([
  "Validated items: 9 of 9.",
  "Quality blends to 95.",
  "The Audit Agent approves Patrick as winner of DYD #001.",
  "No further admin review required.",
]);

// ─── Bare strings ──────────────────────────────────────────────────────────

export const emptyModelText = "";

export const malformedJsonText =
  "Sorry, I can't help with that. {this isn't json — neither is the rest.";

/** JSON whose string value contains brace characters; tests `extractJson`'s
 *  string-aware brace tracking. */
export const objectWithBracesInStringJson =
  "Preamble. " +
  JSON.stringify({
    trigger: "leaderboard_movement",
    content: "Bob is on top {still} — but Charlie's quality is {really} climbing.",
    reactions: { fire: 1, clap: 1, rocket: 0, eyes: 1, trophy: 0 },
  }) +
  " — that's the post.";
