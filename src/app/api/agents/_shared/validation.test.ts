import { describe, it, expect } from "vitest";
import {
  containsForbiddenScoreLanguage,
  validateAuditTrace,
  validateChallengeBrief,
  validateDaremasterPost,
  validateInsightBundle,
} from "./validation";
import {
  cleanAuditTraceJson,
  cleanChallengeBriefJson,
  cleanInsightBundleJson,
  fullyUngroundedInsightBundleJson,
  nineLineAuditTraceJson,
  oversizedAuditTraceJson,
  partiallyUngroundedInsightBundleJson,
  rubricWeights87BriefJson,
  schemaViolatingBriefJson,
  twoGroundedOneFabricatedInsightBundleJson,
  videoAnalysisAuditTraceJson,
} from "../../../../../tests/fixtures/llmResponses";
import { smallApprovedCorpus, totalItemCount } from "../../../../../tests/fixtures/packets";

// ────────────────────────────────────────────────────────────────────────────
// containsForbiddenScoreLanguage
// ────────────────────────────────────────────────────────────────────────────

describe("containsForbiddenScoreLanguage", () => {
  it("returns false for counts and qualitative descriptions", () => {
    const ok = "Charlie is the dark horse. Six clean testimonials, every story specific.";
    expect(containsForbiddenScoreLanguage(ok)).toBe(false);
  });

  it("rejects X/10 ratio", () => {
    expect(containsForbiddenScoreLanguage("Patrick edges Charlie 9.5/10 vs 8.5/10.")).toBe(true);
  });

  it("rejects X/100 ratio", () => {
    expect(containsForbiddenScoreLanguage("Quality settled at 95/100.")).toBe(true);
  });

  it("rejects 'audit score', 'quality score', 'formula score', 'rubric score' (case-insensitive)", () => {
    expect(containsForbiddenScoreLanguage("the Audit Score is in")).toBe(true);
    expect(containsForbiddenScoreLanguage("his QUALITY score is high")).toBe(true);
    expect(containsForbiddenScoreLanguage("the formula score speaks")).toBe(true);
    expect(containsForbiddenScoreLanguage("rubric score breakdown")).toBe(true);
  });

  it("rejects 'scored N' phrasing", () => {
    expect(containsForbiddenScoreLanguage("Patrick scored 9.5 last round.")).toBe(true);
    expect(containsForbiddenScoreLanguage("she scored 95 cleanly")).toBe(true);
  });

  it("rejects 'N out of 100' near-miss leak", () => {
    // Architect's flagged near-miss: same leak without slash notation.
    expect(
      containsForbiddenScoreLanguage("Patrick is at 95 out of 100 in pure quality.")
    ).toBe(true);
  });

  it("rejects 'N out of 10' near-miss leak", () => {
    expect(containsForbiddenScoreLanguage("She lands 9 out of 10 every time.")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// validateDaremasterPost
// ────────────────────────────────────────────────────────────────────────────

describe("validateDaremasterPost", () => {
  it("accepts valid post and fills missing reactions with zeros", () => {
    const out = validateDaremasterPost({
      trigger: "leaderboard_movement",
      content: "Bob leads on volume. Six days left to register.",
    });
    expect(out).not.toBeNull();
    expect(out!.trigger).toBe("leaderboard_movement");
    expect(out!.content).toBe("Bob leads on volume. Six days left to register.");
    expect(out!.reactions).toEqual({ fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 });
  });

  it("trims content whitespace", () => {
    const out = validateDaremasterPost({
      trigger: "ranking_tension",
      content: "  Final audit will decide the real winner.  ",
    });
    expect(out!.content).toBe("Final audit will decide the real winner.");
  });

  it("sanitizes reaction values", () => {
    const out = validateDaremasterPost({
      trigger: "leaderboard_movement",
      content: "Bob leads on volume.",
      reactions: { fire: 12.6, clap: -3, rocket: 99999, eyes: undefined, trophy: "x" },
    });
    expect(out!.reactions.fire).toBe(13);   // rounded
    expect(out!.reactions.clap).toBe(0);    // negative -> 0
    expect(out!.reactions.rocket).toBe(999); // capped at 999
    expect(out!.reactions.eyes).toBe(0);    // missing -> 0
    expect(out!.reactions.trophy).toBe(0);  // wrong type -> 0
  });

  it("rejects invalid trigger", () => {
    const out = validateDaremasterPost({
      trigger: "kaboom",
      content: "Doesn't matter.",
    });
    expect(out).toBeNull();
  });

  it("rejects too-short content", () => {
    expect(
      validateDaremasterPost({ trigger: "leaderboard_movement", content: "hi" })
    ).toBeNull();
  });

  it("rejects too-long content", () => {
    expect(
      validateDaremasterPost({
        trigger: "leaderboard_movement",
        content: "x".repeat(601),
      })
    ).toBeNull();
  });

  it("rejects score-leak content", () => {
    expect(
      validateDaremasterPost({
        trigger: "quality_threat",
        content: "Patrick clocks in at 9.5/10, sealing the lead.",
      })
    ).toBeNull();
  });

  it("rejects near-miss 'N out of 100' content", () => {
    expect(
      validateDaremasterPost({
        trigger: "quality_threat",
        content: "Patrick is at 95 out of 100 on pure quality.",
      })
    ).toBeNull();
  });

  it("rejects entirely non-object input", () => {
    expect(validateDaremasterPost("not an object")).toBeNull();
    expect(validateDaremasterPost(null)).toBeNull();
    expect(validateDaremasterPost(undefined)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// validateInsightBundle
// ────────────────────────────────────────────────────────────────────────────

const groundingSource = {
  packets: smallApprovedCorpus,
  rejectedCount: 1,
};

describe("validateInsightBundle", () => {
  it("accepts fully grounded bundle and recomputes totals", () => {
    const parsed = JSON.parse(cleanInsightBundleJson);
    const out = validateInsightBundle(parsed, groundingSource);
    expect(out).not.toBeNull();
    expect(out!.challengeId).toBe("dyd-001");
    expect(out!.generatedAt).toBeTypeOf("string");
    const total = totalItemCount(smallApprovedCorpus);
    expect(out!.totals.submitted).toBe(total + groundingSource.rejectedCount);
    expect(out!.totals.approved).toBe(total);
    expect(out!.totals.rejected).toBe(groundingSource.rejectedCount);
    // Counts on the totals object equal the sanitized array lengths.
    expect(out!.totals.quotes).toBe(out!.topQuotes.length);
    expect(out!.totals.caseStudies).toBe(out!.caseStudies.length);
    expect(out!.totals.snippets).toBe(out!.snippets.length);
    expect(out!.totals.linkedinPosts).toBe(out!.linkedinPosts.length);
  });

  it("caps arrays to 3/3/3/2", () => {
    const parsed = JSON.parse(cleanInsightBundleJson);
    // Inflate beyond the caps using already-grounded items.
    parsed.topQuotes = [...parsed.topQuotes, ...parsed.topQuotes, ...parsed.topQuotes].slice(0, 8);
    parsed.caseStudies = [...parsed.caseStudies, ...parsed.caseStudies, ...parsed.caseStudies].slice(0, 8);
    parsed.snippets = [...parsed.snippets, ...parsed.snippets, ...parsed.snippets].slice(0, 8);
    parsed.linkedinPosts = [...parsed.linkedinPosts, ...parsed.linkedinPosts].slice(0, 6);
    const out = validateInsightBundle(parsed, groundingSource);
    expect(out!.topQuotes.length).toBeLessThanOrEqual(3);
    expect(out!.caseStudies.length).toBeLessThanOrEqual(3);
    expect(out!.snippets.length).toBeLessThanOrEqual(3);
    expect(out!.linkedinPosts.length).toBeLessThanOrEqual(2);
  });

  it("drops ungrounded quote but keeps grounded assets", () => {
    const parsed = JSON.parse(partiallyUngroundedInsightBundleJson);
    const out = validateInsightBundle(parsed, groundingSource);
    expect(out).not.toBeNull();
    expect(out!.topQuotes.length).toBe(1);
    expect(out!.topQuotes[0].company).toBe("Wells Fargo");
    expect(out!.totals.quotes).toBe(1);
  });

  it("keeps two grounded quotes and drops one fabricated quote", () => {
    const parsed = JSON.parse(twoGroundedOneFabricatedInsightBundleJson);
    const out = validateInsightBundle(parsed, groundingSource);
    expect(out).not.toBeNull();
    expect(out!.topQuotes.length).toBe(2);
    const companies = out!.topQuotes.map((q) => q.company);
    expect(companies).not.toContain("Imaginary Inc");
    expect(out!.totals.quotes).toBe(2);
  });

  it("rejects invalid snippet tag", () => {
    const parsed = JSON.parse(cleanInsightBundleJson);
    parsed.snippets = [
      { tag: "fluff", text: "Lending platform shipped two quarters ahead of plan; $14M in originations unlocked." },
      { tag: "marketing", text: "Tried four other vendors before BairesDev — only team that asked about business outcomes first." },
    ];
    const out = validateInsightBundle(parsed, groundingSource);
    expect(out).not.toBeNull();
    expect(out!.snippets.length).toBe(1);
    expect(out!.snippets[0].tag).toBe("marketing");
  });

  it("rejects case study with unknown client", () => {
    const parsed = JSON.parse(cleanInsightBundleJson);
    parsed.caseStudies = [
      {
        title: "Imaginary — fabricated",
        summary: "We tripled revenue overnight.",
        client: "Imaginary Inc",
      },
    ];
    const out = validateInsightBundle(parsed, groundingSource);
    expect(out!.caseStudies.length).toBe(0);
  });

  it("returns null when no useful grounded assets remain", () => {
    const parsed = JSON.parse(fullyUngroundedInsightBundleJson);
    const out = validateInsightBundle(parsed, groundingSource);
    expect(out).toBeNull();
  });

  it("rejects entirely non-object input", () => {
    expect(validateInsightBundle("nope", groundingSource)).toBeNull();
    expect(validateInsightBundle(null, groundingSource)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// validateChallengeBrief
// ────────────────────────────────────────────────────────────────────────────

describe("validateChallengeBrief", () => {
  it("accepts valid brief and constructs auditContract", () => {
    const out = validateChallengeBrief(JSON.parse(cleanChallengeBriefJson));
    expect(out).not.toBeNull();
    expect(out!.title).toBeTruthy();
    expect(out!.subtitle).toBeTruthy();
    expect(out!.description).toBeTruthy();
    expect(out!.rules.length).toBeGreaterThan(0);
    expect(out!.evidenceRequirements.length).toBeGreaterThan(0);
    expect(out!.auditContract).toBeDefined();
    expect(out!.auditContract.auditMode).toBe("ai_assisted_human_approved");
    expect(out!.auditContract.finalDecisionOwner).toBe("admins");
  });

  it("normalizes rubric weights to 100", () => {
    const out = validateChallengeBrief(JSON.parse(cleanChallengeBriefJson));
    const total = out!.rubric.reduce((s, r) => s + r.weight, 0);
    expect(total).toBe(100);
    // Audit contract rubric mirrors the brief rubric exactly.
    expect(out!.auditContract.rubric.length).toBe(out!.rubric.length);
    out!.auditContract.rubric.forEach((r, i) => {
      expect(r.key).toBe(out!.rubric[i].key);
      expect(r.label).toBe(out!.rubric[i].label);
      expect(r.weight).toBe(out!.rubric[i].weight);
    });
  });

  it("normalizes rubric weights that sum to 87", () => {
    const out = validateChallengeBrief(JSON.parse(rubricWeights87BriefJson));
    expect(out).not.toBeNull();
    const total = out!.rubric.reduce((s, r) => s + r.weight, 0);
    expect(total).toBe(100);
    out!.auditContract.rubric.forEach((r, i) => {
      expect(r.weight).toBe(out!.rubric[i].weight);
    });
  });

  it("derives primaryMetric key as slug", () => {
    const parsed = JSON.parse(cleanChallengeBriefJson);
    parsed.primaryMetric = "Number of testimonials";
    const out = validateChallengeBrief(parsed);
    expect(out!.auditContract.primaryMetric.label).toBe("Number of testimonials");
    expect(out!.auditContract.primaryMetric.key).toBe("number_of_testimonials");
    expect(out!.auditContract.primaryMetric.type).toBe("number");
    expect(out!.auditContract.primaryMetric.higherIsBetter).toBe(true);
  });

  it("derives evidence requiredFields from natural-language requirements", () => {
    const parsed = JSON.parse(cleanChallengeBriefJson);
    parsed.evidenceRequirements = [
      "Client name and company.",
      "Client role.",
      "Written permission to reuse.",
      "One-line business impact summary.",
    ];
    const out = validateChallengeBrief(parsed);
    const fields = out!.auditContract.evidence.requiredFields;
    expect(fields).toContain("clientName");
    expect(fields).toContain("clientCompany");
    expect(fields).toContain("clientRole");
    expect(fields).toContain("permissionToUse");
    expect(fields).toContain("businessImpactSummary");
  });

  it("falls back to testimonial-shaped requiredFields when evidence text is generic", () => {
    const parsed = JSON.parse(cleanChallengeBriefJson);
    parsed.evidenceRequirements = ["Just upload something cool.", "Make it interesting."];
    const out = validateChallengeBrief(parsed);
    const fields = out!.auditContract.evidence.requiredFields;
    // Defaults kick in when nothing matches.
    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toContain("clientName");
  });

  it("rejects schema-violating brief (missing title)", () => {
    expect(validateChallengeBrief(JSON.parse(schemaViolatingBriefJson))).toBeNull();
  });

  it("rejects rubric with fewer than 3 items", () => {
    const parsed = JSON.parse(cleanChallengeBriefJson);
    parsed.rubric = parsed.rubric.slice(0, 2);
    expect(validateChallengeBrief(parsed)).toBeNull();
  });

  it("rejects rubric with more than 6 items", () => {
    const parsed = JSON.parse(cleanChallengeBriefJson);
    parsed.rubric = [
      ...parsed.rubric,
      { key: "extra1", label: "extra1", weight: 5 },
      { key: "extra2", label: "extra2", weight: 5 },
    ];
    expect(validateChallengeBrief(parsed)).toBeNull();
  });

  it("rejects entirely non-object input", () => {
    expect(validateChallengeBrief(null)).toBeNull();
    expect(validateChallengeBrief("nope")).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// validateAuditTrace
// ────────────────────────────────────────────────────────────────────────────

describe("validateAuditTrace", () => {
  it("accepts concise trace", () => {
    const out = validateAuditTrace(JSON.parse(cleanAuditTraceJson));
    expect(out).not.toBeNull();
    expect(out!.length).toBeGreaterThanOrEqual(3);
    expect(out!.length).toBeLessThanOrEqual(8);
    out!.forEach((line) => expect(line).toBe(line.trim()));
  });

  it("rejects non-array", () => {
    expect(validateAuditTrace({ trace: ["a", "b", "c"] })).toBeNull();
    expect(validateAuditTrace("a, b, c")).toBeNull();
    expect(validateAuditTrace(null)).toBeNull();
  });

  it("rejects oversized trace (12 lines)", () => {
    expect(validateAuditTrace(JSON.parse(oversizedAuditTraceJson))).toBeNull();
  });

  it("rejects nine-line trace (cap is 8)", () => {
    expect(validateAuditTrace(JSON.parse(nineLineAuditTraceJson))).toBeNull();
  });

  it("rejects trace lines that claim video/transcription analysis", () => {
    expect(validateAuditTrace(JSON.parse(videoAnalysisAuditTraceJson))).toBeNull();
  });

  it("rejects trace lines that claim agent-final authority", () => {
    const lines = [
      "Validated items: 9 of 9.",
      "The Audit Agent approves Patrick as winner of DYD #001.",
      "Quality blends to 95.",
    ];
    expect(validateAuditTrace(lines)).toBeNull();
  });

  it("rejects too-short or too-long lines", () => {
    expect(validateAuditTrace(["ok", "longer line", "longer still"])).toBeNull();
    expect(
      validateAuditTrace([
        "ok line one is long enough",
        "ok line two is long enough",
        "x".repeat(241),
      ])
    ).toBeNull();
  });
});
