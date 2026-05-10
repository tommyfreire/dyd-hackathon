// POST /api/agents/audit-assistant/trace
//
// Partial-live audit assistant: deterministic scoring stays authoritative.
// This route receives the already-computed findings plus the source packet
// and returns a friendlier, LLM-rewritten `trace: string[]` that explains
// what the deterministic scorers found. It cannot change scores, flags, or
// admin authority.

import { NextResponse } from "next/server";
import {
  callAnthropic,
  MissingKeyError,
  ProviderError,
} from "../../_shared/anthropic";
import { extractJson } from "../../_shared/json";
import { validateAuditTrace } from "../../_shared/validation";
import { hashInput, withCache } from "../../_shared/cache";
import type {
  AuditFindings,
  EvidencePacket,
} from "@/agents/types";
import type { AuditContract } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  packet: EvidencePacket;
  contract: AuditContract;
  findings: AuditFindings;
}

const SYSTEM_PROMPT = `You explain pre-computed DYD audit findings to an admin reviewer. The deterministic scoring is authoritative — you cannot change scores, flags, counts, or recommendations. You produce a tight, human-readable trace that helps the admin understand why the audit landed where it did.

Constraints:
- Output MUST be a JSON array of 3 to 8 short strings. No prose, no code fences, no object wrapper.
- Each line should be one observation, ideally under 140 characters.
- Refer ONLY to the structured evidence fields you receive (lengthSeconds, hasPermission, hasBusinessImpact, hasMetric, snippet, impactSummary, clientCompany, clientRole). Do NOT pretend to have transcribed video, watched footage, or analyzed tone.
- Do NOT contradict the deterministic findings — if the input says validatedItems = 9, your trace must reflect 9 validated items.
- Do NOT claim the agent approves, rejects, or finalizes anything. The admin holds the final decision.`;

function userPromptFor(body: RequestBody): string {
  // Trim packet items to lightweight summaries — the LLM doesn't need raw IDs.
  const items = body.packet.items.map((i) => ({
    clientCompany: i.clientCompany,
    clientRole: i.clientRole,
    lengthSeconds: i.lengthSeconds,
    hasPermission: i.hasPermission,
    hasBusinessImpact: i.hasBusinessImpact,
    hasMetric: i.hasMetric,
    snippet: i.snippet,
    impactSummary: i.impactSummary,
  }));
  const findingsForModel = {
    declaredMetric: body.findings.declaredMetric,
    validatedItems: body.findings.validatedItems,
    rejectedItems: body.findings.rejectedItems,
    qualityScore: body.findings.qualityScore,
    recommendation: body.findings.recommendation,
    rubricBreakdown: body.findings.rubricBreakdown,
    flags: body.findings.flags,
  };
  return [
    "Audit contract rubric:",
    JSON.stringify(body.contract.rubric, null, 2),
    "",
    "Evidence items (structured fields only):",
    JSON.stringify(items, null, 2),
    "",
    "Deterministic findings (authoritative — do not contradict):",
    JSON.stringify(findingsForModel, null, 2),
    "",
    "Return ONLY a JSON array of 3–8 concise strings.",
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
  if (!body || !body.packet || !body.contract || !body.findings) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const cacheKey = "audit-trace:" + hashInput({
    packetId: body.packet.participantId,
    qualityScore: body.findings.qualityScore,
    validatedItems: body.findings.validatedItems,
    rejectedItems: body.findings.rejectedItems,
    flags: body.findings.flags,
    recommendation: body.findings.recommendation,
  });

  try {
    const trace = await withCache<string[]>(cacheKey, TTL_MS, async () => {
      const raw = await callAnthropic({
        agent: "audit-trace",
        system: SYSTEM_PROMPT,
        user: userPromptFor(body),
        maxTokens: 600,
        temperature: 0.3,
      });
      const parsed = extractJson(raw);
      const validated = validateAuditTrace(parsed);
      if (!validated) throw new ProviderError("validation_failed");
      return validated;
    });
    return NextResponse.json({ trace });
  } catch (err) {
    const status = err instanceof MissingKeyError ? 503 : 502;
    return NextResponse.json(
      { error: err instanceof Error ? err.name : "unknown" },
      { status }
    );
  }
}
