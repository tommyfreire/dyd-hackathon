// POST /api/agents/daremaster
//
// Live Daremaster post generation. Accepts a DaremasterSnapshot plus a "mode"
// hint (trivial | insight | winner) and returns a validated DaremasterPost.
// Returns 502 on any failure — the client falls back to the deterministic
// agent.

import { NextResponse } from "next/server";
import {
  callAnthropic,
  MissingKeyError,
  ProviderError,
} from "../_shared/anthropic";
import { extractJsonObject } from "../_shared/json";
import { validateDaremasterPost } from "../_shared/validation";
import { hashInput, withCache } from "../_shared/cache";
import type { DaremasterPost, DaremasterSnapshot } from "@/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Mode = "trivial" | "insight" | "winner";

interface RequestBody {
  snapshot: DaremasterSnapshot;
  mode: Mode;
}

const SYSTEM_PROMPT = `You are the Daremaster, the public broadcaster for "DYD" (Do You Dare), an internal BairesDev growth-challenge platform. You write short, energetic feed posts that show up on the company's social leaderboard.

Constraints:
- Output MUST be a single JSON object with keys "trigger" and "content". No prose around it. No code fences.
- "trigger" is one of: "launch", "leaderboard_movement", "quality_threat", "deadline_pressure", "early_quiet", "ranking_tension", "registration_confirmation".
- "content" is one short paragraph (40–280 characters), no markdown, no emojis, no hashtags.
- Ground every claim in the snapshot you receive. Do not invent counts, names, or facts.
- You may describe quality tension qualitatively (e.g. "Charlie is the dark horse — every story is specific").
- You MUST NOT reveal numeric audit scores, formula scores, or rubric scores. Never say "X/10" or "X/100". Never say "audit score", "quality score", "formula score", or "rubric score".
- Use first names only when naming participants.
- Do not address the reader as "you".`;

function userPromptFor(body: RequestBody): string {
  const { snapshot, mode } = body;
  const guidance = MODE_GUIDANCE[mode];
  return [
    `Mode: ${mode}`,
    `Guidance: ${guidance}`,
    "",
    "Snapshot:",
    JSON.stringify(snapshot, null, 2),
    "",
    'Return only the JSON object: {"trigger": "...", "content": "..."}',
  ].join("\n");
}

const MODE_GUIDANCE: Record<Mode, string> = {
  trivial:
    'Pre-handoff state: write a generic leaderboard or deadline observation. Do not name any participant as the dark horse or quality threat. Pick "leaderboard_movement", "ranking_tension", or "deadline_pressure" depending on the snapshot.',
  insight:
    'Mid-challenge audit handoff: the leader has volume but quality is shifting the picture. If you can identify a credible quality contender from auditScore on the ranking, name them qualitatively — without exposing the numeric score. Prefer trigger "quality_threat".',
  winner:
    'Final stage: a winner has been declared (look at finalRank === 1 on the ranking). Announce the winner by first name, mention validated testimonials qualitatively, do not quote scores. Prefer trigger "leaderboard_movement" or "quality_threat" depending on the angle.',
};

const TTL_MS = 60_000;

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body || !body.snapshot || !body.mode) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const cacheKey = "daremaster:" + hashInput(body);

  try {
    const post = await withCache<DaremasterPost>(cacheKey, TTL_MS, async () => {
      const raw = await callAnthropic({
        agent: "daremaster",
        system: SYSTEM_PROMPT,
        user: userPromptFor(body),
        maxTokens: 400,
        temperature: 0.6,
      });
      const parsed = extractJsonObject(raw);
      if (!parsed) throw new ProviderError("parse_failed");
      const validated = validateDaremasterPost(parsed);
      if (!validated) throw new ProviderError("validation_failed");
      return validated;
    });
    return NextResponse.json(post);
  } catch (err) {
    const status = err instanceof MissingKeyError ? 503 : 502;
    return NextResponse.json(
      { error: err instanceof Error ? err.name : "unknown" },
      { status }
    );
  }
}
