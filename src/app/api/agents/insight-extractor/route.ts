// POST /api/agents/insight-extractor
//
// Live Growth Insight Extractor. Receives the approved evidence corpus and
// returns a validated InsightBundle. Code recomputes totals and generatedAt
// after grounding-checking every model-proposed item.

import { NextResponse } from "next/server";
import {
  callAnthropic,
  MissingKeyError,
  ProviderError,
} from "../_shared/anthropic";
import { extractJsonObject } from "../_shared/json";
import { validateInsightBundle } from "../_shared/validation";
import { hashInput, withCache } from "../_shared/cache";
import type { EvidencePacket, InsightBundle } from "@/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  approvedPackets: EvidencePacket[];
  rejectedCount: number;
}

const SYSTEM_PROMPT = `You are a BairesDev growth marketer mining approved testimonial evidence for reusable marketing assets. You are given an array of evidence packets — each packet contains items with fields like clientName, clientCompany, clientRole, snippet, impactSummary, hasMetric, hasPermission, lengthSeconds.

Constraints:
- Output MUST be a single JSON object with keys "topQuotes", "caseStudies", "snippets", "linkedinPosts". No prose. No code fences.
- Do NOT invent clients, companies, roles, metrics, permissions, or outcomes that don't appear in the input.
- Every quote must be drawn from a provided snippet or impactSummary (verbatim or close paraphrase that preserves the same words).
- Every case study client must be a clientCompany that appears in the input.
- Snippet text must be grounded in some impactSummary or snippet.
- LinkedIn drafts may synthesize, but any specific client name or metric in the body must be present in the input.

Asset bounds:
- topQuotes: at most 3, deduped by company. Each: { quote, client, company }.
- caseStudies: at most 3, one per company. Each: { title, summary, client }.
- snippets: at most 3. Each: { tag: "sales" | "marketing", text }.
- linkedinPosts: at most 2. Each: { title, body }.`;

function userPromptFor(body: RequestBody): string {
  return [
    `Approved packets (${body.approvedPackets.length}). Rejected count: ${body.rejectedCount}.`,
    "",
    "Corpus (JSON):",
    JSON.stringify(body.approvedPackets, null, 2),
    "",
    'Return only the JSON object: {"topQuotes": [...], "caseStudies": [...], "snippets": [...], "linkedinPosts": [...]}',
  ].join("\n");
}

const TTL_MS = 10 * 60_000;

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body || !Array.isArray(body.approvedPackets) || typeof body.rejectedCount !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (body.approvedPackets.length === 0) {
    return NextResponse.json({ error: "empty_corpus" }, { status: 400 });
  }

  const cacheKey = "insights:" + hashInput(body);

  try {
    const bundle = await withCache<InsightBundle>(cacheKey, TTL_MS, async () => {
      const raw = await callAnthropic({
        agent: "insight-extractor",
        system: SYSTEM_PROMPT,
        user: userPromptFor(body),
        maxTokens: 1600,
        temperature: 0.5,
      });
      const parsed = extractJsonObject(raw);
      if (!parsed) throw new ProviderError("parse_failed");
      const validated = validateInsightBundle(parsed, {
        packets: body.approvedPackets,
        rejectedCount: body.rejectedCount,
      });
      if (!validated) throw new ProviderError("validation_failed");
      return validated;
    });
    return NextResponse.json(bundle);
  } catch (err) {
    const status = err instanceof MissingKeyError ? 503 : 502;
    return NextResponse.json(
      { error: err instanceof Error ? err.name : "unknown" },
      { status }
    );
  }
}
