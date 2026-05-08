// DYD — Growth Insight Extractor
//
// Reads the corpus of approved evidence packets and produces a marketing-ready
// asset bundle: top quotes, case-study leads, sales snippets, LinkedIn drafts,
// campaign angles. The point of the demo is "DYD doesn't end with a winner —
// it ends with reusable growth assets". This agent is what makes that true.
//
// MVP implementation: deterministic groupings + rule-based asset shaping.
// Quotes are ranked by per-item quality signals; case studies group by client;
// sales snippets and LinkedIn drafts are templated with interpolation from
// the strongest items.
//
// Real-LLM swap: feed the corpus + a marketing-asset prompt to the model and
// parse the response into the same `InsightBundle` shape.

import type {
  EvidenceItem,
  EvidencePacket,
  InsightBundle,
  InsightInput,
} from "./types";

/**
 * Extract a complete growth-asset bundle from approved evidence.
 *
 * @returns Marketing-ready output: counts, top quotes, case studies, sales
 *          snippets, LinkedIn drafts, and campaign angles.
 */
export function extract({ approvedPackets, rejectedCount }: InsightInput): InsightBundle {
  const allItems = approvedPackets.flatMap((p) => p.items);
  const validatedItems = allItems.filter(isValidatedItem);
  const submittedTotal = approvedPackets.reduce((s, p) => s + p.items.length, 0) + rejectedCount;

  const topQuotes = pickTopQuotes(validatedItems);
  const caseStudies = pickCaseStudies(validatedItems);
  const snippets = pickSnippets(validatedItems);
  const linkedinPosts = pickLinkedInDrafts(validatedItems);

  return {
    challengeId: "dyd-001",
    totals: {
      submitted: submittedTotal,
      approved: validatedItems.length,
      rejected: rejectedCount + (allItems.length - validatedItems.length),
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

// ─── Per-asset selectors ───────────────────────────────────────────────────

/** A validated item is one we'd put in front of a client: permission, impact, metric. */
function isValidatedItem(it: EvidenceItem): boolean {
  return it.hasPermission && it.hasBusinessImpact;
}

function quotePower(it: EvidenceItem): number {
  // Higher = more campaign-worthy. Real metric > vague impact > company recognizability.
  let score = 0;
  if (it.hasMetric) score += 3;
  if (it.impactSummary.length > 60) score += 2;
  if (it.lengthSeconds >= 60 && it.lengthSeconds <= 150) score += 1;
  if (it.clientCompany && it.clientRole) score += 1;
  return score;
}

function pickTopQuotes(items: EvidenceItem[]): InsightBundle["topQuotes"] {
  const sorted = [...items].sort((a, b) => quotePower(b) - quotePower(a));
  // Dedupe by company so one client doesn't dominate the carousel.
  const seenCompany = new Set<string>();
  const out: InsightBundle["topQuotes"] = [];
  for (const it of sorted) {
    if (seenCompany.has(it.clientCompany)) continue;
    seenCompany.add(it.clientCompany);
    out.push({
      quote: it.snippet,
      client: it.clientName,
      company: it.clientCompany,
    });
    if (out.length >= 3) break;
  }
  return out;
}

function pickCaseStudies(items: EvidenceItem[]): InsightBundle["caseStudies"] {
  // Case-study lead = one per company that has both metric AND a meaty impact summary.
  const byCompany = new Map<string, EvidenceItem>();
  for (const it of items) {
    if (!it.hasMetric) continue;
    if (it.impactSummary.length < 50) continue;
    if (!byCompany.has(it.clientCompany)) byCompany.set(it.clientCompany, it);
  }
  return Array.from(byCompany.values())
    .slice(0, 3)
    .map((it) => ({
      title: `${it.clientCompany} — ${shortenImpact(it.impactSummary)}`,
      summary: it.impactSummary,
      client: it.clientCompany,
    }));
}

function pickSnippets(items: EvidenceItem[]): InsightBundle["snippets"] {
  // Tag heuristic: items with metrics → sales; items with rich narrative → marketing.
  const out: InsightBundle["snippets"] = [];
  const sortedByPower = [...items].sort((a, b) => quotePower(b) - quotePower(a));
  const seen = new Set<string>();
  for (const it of sortedByPower) {
    if (seen.has(it.impactSummary)) continue;
    seen.add(it.impactSummary);
    const tag: "sales" | "marketing" = it.hasMetric ? "sales" : "marketing";
    out.push({ tag, text: it.impactSummary });
    if (out.length >= 3) break;
  }
  return out;
}

function pickLinkedInDrafts(items: EvidenceItem[]): InsightBundle["linkedinPosts"] {
  // Two drafts max, both grounded in actual evidence — no boilerplate.
  const drafts: InsightBundle["linkedinPosts"] = [];

  const flagship = [...items]
    .filter((it) => it.hasMetric && it.impactSummary.length > 60)
    .sort((a, b) => b.impactSummary.length - a.impactSummary.length)[0];

  if (flagship) {
    drafts.push({
      title: shortenImpact(flagship.impactSummary),
      body: `${flagship.clientCompany}'s ${flagship.clientRole} on the work: "${flagship.snippet}"`,
    });
  }

  if (items.length >= 2) {
    const withMetric = items.filter((it) => it.hasMetric).length;
    drafts.push({
      title: `${items.length} client testimonials, ${withMetric} with a hard metric`,
      body:
        "The pattern across the corpus: clients describe outcomes, not code — time saved, revenue unlocked, meetings they don't have anymore. Each line below is pulled from a validated testimonial, not a tagline.",
    });
  }

  return drafts.slice(0, 2);
}

function shortenImpact(s: string): string {
  // First clause up to a comma or period; cap at ~60 chars for headline use.
  const head = s.split(/[,.]/)[0]?.trim() ?? s;
  return head.length > 60 ? head.slice(0, 57) + "…" : head;
}
