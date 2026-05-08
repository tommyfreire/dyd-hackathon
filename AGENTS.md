# DYD — The Agent Layer

> **DYD is an agentic growth-challenge platform.** Four agents power it. They live behind the admin's seat and produce everything participants experience: the challenge brief, the bot posts in the feed, the audit scores in the leaderboard, the marketing assets at the end.
>
> Participants never see the agents. They live the social/competitive UX. The admin operates the agents from `/agents`.

This file is the tour. Open it once. Read it top-to-bottom. You'll know how the layer works.

---

## Where everything lives

```
src/agents/
  types.ts                  Agent I/O contracts
  index.ts                  Barrel export
  challenge-designer.ts     run(prompt) → ChallengeBrief
  hype-bot.ts               generate(snapshot) → HypeBotPost
  audit-assistant.ts        audit(packet, contract) → AuditFindings
  insight-extractor.ts      extract(approvedPackets) → InsightBundle

src/lib/mock-data.ts        Seeds, including the structured EvidencePackets
                            that feed the Audit Assistant and Insight Extractor

src/lib/api.ts              The seam between agents and the UI:
                            buildHypeBotSnapshot(), runAudit(), getGrowthAssets(),
                            postHypeBotMessage()

src/components/screens/AgentsPage.tsx     Admin-only control panel (one card / agent)
src/components/screens/AdminPage.tsx      Live audit() output + "How this score is computed"
src/components/screens/InsightsPage.tsx   Live extract() output
src/components/screens/DesignerModal.tsx  Live design() output
```

## Design principles

1. **Pure functions.** Each agent is a deterministic function: `(input) → output`. No I/O, no React, no side effects. Runs anywhere — browser, server, test.
2. **The seed is the INPUT, the agent COMPUTES the OUTPUT.** Evidence packets are seeded; audit findings are computed. Growth assets are *never* hardcoded — they fall out of the corpus.
3. **One file per agent.** Each module is self-contained so swapping its body to a real LLM call doesn't touch the others. Inputs and outputs in `types.ts` stay stable.
4. **Admin orchestrates. Participants experience.** The `/agents` page is the admin's control panel. Participants only see *outputs* (bot posts, scores, leaderboard).

## The four agents

### 1. Challenge Designer — `src/agents/challenge-designer.ts`

**Job.** Turn a one-line growth goal from leadership into a complete challenge brief.

**Input.** `{ prompt: string }` — e.g. *"I want employees to collect client testimonials for marketing."*

**Output.** `ChallengeBrief` — title, subtitle, description, growth objective, reward, rules, evidence requirements, primary metric, registration/submission days, weighted rubric, Hype Ranking disclaimer, notification copy, DYD Bot launch script, and a full Audit Contract.

**How it works (MVP).** Keyword classifier picks one of five archetype templates (testimonial / public demo / case study / referral / generic). The prompt is interpolated into the brief's subtitle so output reads like it was written for the user.

**Entry point in code.**
```ts
import { design } from "@/agents/challenge-designer";
const brief = design({ prompt: "..." });
```

**Where it shows up in the UI.** `DesignerModal` (launched from the Challenge Designer card on `/agents`).

**Real-LLM swap.** Replace `design()` with a server route that sends the prompt to the model and parses a `ChallengeBrief` JSON response. Caller code does not change.

---

### 2. Hype Bot — `src/agents/hype-bot.ts`

**Job.** Generate context-aware feed posts. Keep the challenge socially alive.

**Input.** `HypeBotSnapshot` — the current challenge state, ranking, deadlines, and counts.

**Output.** `HypeBotPost` with one of seven `trigger` values:
- `launch` — challenge just unlocked
- `registration_confirmation` — "N Daredevils have accepted"
- `early_quiet` — board is quiet, no progress yet
- `leaderboard_movement` — leader has pulled ahead
- `quality_threat` — runner-up's audit score dwarfs the leader's (Patrick vs Bob)
- `ranking_tension` — final review is coming
- `deadline_pressure` — submission deadline within 2 days

**How it works (MVP).** `pickTrigger()` checks signals in priority order; `TEMPLATES[trigger]` produces the post body with leader/runner-up/score interpolation.

**Entry point in code.**
```ts
import * as hypeBot from "@/agents/hype-bot";
const snap = await buildHypeBotSnapshot();
const post = hypeBot.generate(snap);
await postHypeBotMessage(post);
```

**Where it shows up in the UI.** Hype Bot card on `/agents` — admin clicks "Generate next post". The post lands in the public feed at `/feed`. The participant sees the post; they don't see the trigger.

**Real-LLM swap.** Replace `pickTrigger() + TEMPLATES[trigger]()` with a model call that takes the snapshot and returns `{ trigger, content }` in the same shape.

---

### 3. AI Audit Assistant — `src/agents/audit-assistant.ts`

**Job.** Read a participant's evidence packet, apply the Audit Contract, recommend a score. **Admin still approves** — every UI surface that shows this output says so.

**Input.** `{ packet: EvidencePacket, contract: AuditContract }`.

`EvidencePacket` is the structured stand-in for video transcription: per-item fields (`lengthSeconds`, `hasPermission`, `hasBusinessImpact`, `hasMetric`, `snippet`, `impactSummary`, etc.) that the agent scores.

**Output.** `AuditFindings` — quality score, validated/rejected counts, multiplier, suggested final score, flags, recommendation, **rubric breakdown**, and a **trace** (step-by-step explanation that the admin sees when they click "How this score is computed").

**How the math works.**
1. Each rubric criterion has its own scorer (`SCORERS[key]`). Scorer returns a 0..1 fraction; weight × fraction = points.
2. Sum points → `qualityScore` (0–100).
3. Detect red flags from the contract (short items, missing permissions, unclear business impact, etc.) — flagged items are excluded from the validated count.
4. `qualityMultiplier` is banded: ≥90 → 1.15, ≥80 → 1.05, ≥70 → 0.90, ≥60 → 0.75, ≥50 → 0.55, ≥40 → 0.45, else 0.30.
5. `suggestedFinalScore = validatedItems × qualityMultiplier`.

**The demo's wow moment falls out of this math:**
- Bob: 11 validated × 0.55 = **6.05** (Needs manual review)
- Patrick: 9 validated × 1.15 = **10.35** (Strong candidate for winner)

Run `npx tsx scripts/audit-check.ts` to verify against the canonical packets.

**Entry point in code.**
```ts
import { audit } from "@/agents/audit-assistant";
const findings = audit({ packet, contract });
```

**Where it shows up in the UI.**
- `/admin` Bob-vs-Patrick split: numbers, rubric bars, flags, and the expandable "How this score is computed" trace.
- `/agents` Audit Assistant card: per-participant "Audit X" buttons, output panel.

**Real-LLM swap.** Replace `audit()` with a server call that sends `packet` + `contract` to the model and parses an `AuditFindings` JSON response. The rubric, multiplier band, and trace can be model-generated.

---

### 4. Growth Insight Extractor — `src/agents/insight-extractor.ts`

**Job.** Mine the corpus of approved evidence for marketing-ready growth assets.

**Input.** `{ approvedPackets: EvidencePacket[], rejectedCount: number }`.

**Output.** `InsightBundle` — totals, top quotes, case-study leads, sales snippets, LinkedIn drafts, campaign angles, and `generatedAt`.

**How it works (MVP).**
- **Top quotes:** sort all validated items by `quotePower` (metric > narrative length > optimal duration > client recognizability), dedupe by company, take top 6.
- **Case studies:** group by company, keep one per company that has a metric AND a meaty impact summary, take top 4.
- **Sales snippets:** items with metrics → tagged "sales", rich-narrative items → "marketing"; top 5.
- **LinkedIn drafts:** four templated angles, one interpolated with the strongest case study.
- **Campaign angles:** rule-based set keyed off corpus characteristics.

**Entry point in code.**
```ts
import { extract } from "@/agents/insight-extractor";
const bundle = extract({ approvedPackets, rejectedCount });
```

**Where it shows up in the UI.**
- `/insights` runs `extract()` live on every page load. The page shows a "Generated by Growth Insight Extractor at HH:MM" banner with a "Re-run extractor" button.
- `/agents` Insight Extractor card routes the admin to `/insights`.

**Real-LLM swap.** Replace `extract()` with a server batch job that ships the corpus + a marketing-asset prompt to the model and parses an `InsightBundle` JSON response.

---

## What's seeded vs. what's computed

| Data | Status | Source |
|---|---|---|
| Challenge metadata (DYD #001) | seeded | `currentChallenge` in `mock-data.ts` |
| Participants + ranking | seeded per stage | `demo-stages.ts` builders |
| Feed posts | seeded per stage; can be augmented by Hype Bot live | `demo-stages.ts` + `postHypeBotMessage()` |
| Evidence packets (per participant, per item) | seeded | `evidencePackets` in `mock-data.ts` |
| **Audit findings** | **computed** | `audit-assistant.ts` |
| **Bot posts on demand** | **computed** | `hype-bot.ts` |
| **Challenge briefs from prompts** | **computed** | `challenge-designer.ts` |
| **Growth asset bundle** | **computed** | `insight-extractor.ts` |

The four "computed" rows are why DYD is agentic and not a brochure.

---

## Visibility model — admin orchestrates, participant experiences

```
                ┌─────────────────────────────────────────────────┐
                │ Admin (Valentina Ruiz)                          │
                │ ─────────────────────────────────────────────── │
                │ /agents      ← control panel for all 4 agents   │
                │ /admin       ← live audit findings + approval   │
                │ /insights    ← growth asset bundle               │
                │ + /         /ranking  /feed                      │
                └─────────────────────────────────────────────────┘
                                        │
                                Triggers agents
                                        │
                                        ▼
                ┌─────────────────────────────────────────────────┐
                │ Participant (Sofía Rodríguez)                    │
                │ ─────────────────────────────────────────────── │
                │ /            ← challenge landing                 │
                │ /ranking     ← Hype + Audit meters               │
                │ /feed        ← bot posts + comments              │
                │ /dashboard   ← self-report + evidence            │
                │ /final-ranking (when stage = completed)          │
                │                                                  │
                │ Never sees /agents, /admin, /insights.           │
                └─────────────────────────────────────────────────┘
```

The participant gets the Hype-Bot's posts in their feed and sees the audit numbers move through the leaderboard — but they don't see *who* is running these. From their seat, it's just a vibrant social challenge. From the admin's seat, it's a control room.

---

## Adding a new agent

1. Create `src/agents/<your-agent>.ts`. Export a single function that takes a typed input and returns a typed output.
2. Add the I/O types to `src/agents/types.ts`.
3. Register the export in `src/agents/index.ts`.
4. Add an API helper in `src/lib/api.ts` if the agent needs world state or persists output.
5. Surface it on `/agents` as another card with its own action button.
6. Document it here, in the same shape as the four above.

## Verifying agent math

```bash
npx tsx scripts/audit-check.ts
```

Prints validated/quality/multiplier/final and the rubric breakdown for every seeded participant. If you change `audit-assistant.ts` or the canonical `evidencePackets`, run this to confirm the demo invariants still hold (Bob 6.05, Patrick 10.35).
