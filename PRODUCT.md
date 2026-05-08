# DYD — Product spec

This is the canonical product description. If anything in this file conflicts with the running code, **the code wins** and this file should be corrected.

---

## What it is

**DYD ("Do You Dare")** is an internal growth-challenge platform for BairesDev employees. The company runs time-boxed Dares (e.g. "collect client testimonials in 14 days"); employees register, self-report progress on a public Hype Ranking, submit evidence, and the winner is decided by an admin-supervised AI audit. The whole loop is wrapped in social mechanics (a feed, a leaderboard, reactions) and the operational work is handled by four AI agents.

The pitch: most hackathon entries are automation-first. DYD flips it — the **game** is what makes employees show up; the **AI** is what makes the game scale to the whole company. Every credible mock-to-real swap on the agentic side strengthens that thesis.

## Audience

Internal BairesDev. Two roles in the demo:

- **Tomi (Participant)** — a regular employee. Registers, uploads testimonials, watches the leaderboard.
- **Gabo (Admin)** — Growth Operations. Orchestrates agents, tunes the scoring formula, reviews submissions, declares the winner.

Sponsor and Spectator roles existed in earlier iterations and have been removed. There is no auth flow; the active account is selected via a hidden URL parameter (see ARCHITECTURE.md).

## The core loop

```
Challenge designed →
  Employees register →
    Self-report progress on the Hype Ranking →
      Submit evidence (one testimonial at a time) →
        Audit agent scores against the rubric →
          Admin tunes formula, sends snapshot to the Daremaster →
            Daremaster posts contextual feed updates →
              Challenge ends →
                Admin reviews, overrides where needed, declares winner →
                  Growth Insight Extractor mines the approved corpus →
                    Daremaster announces the winner with a link to the asset library →
                      Challenge Designer drafts the next Dare.
```

The platform is built as **a single repeatable engine**. The current challenge (DYD #001 — *The Testimonial Hunt*) is the demo's instance; nothing about the architecture is testimonial-specific.

---

## The four AI agents

Each agent is currently a **pure deterministic function** in `src/agents/*.ts` — no I/O, no LLM call. They are the canonical swap targets for Step 2.

### 1. Challenge Designer

| | |
|---|---|
| **Purpose** | Turn a one-line growth idea into a full challenge brief: title, rules, deadlines, scoring rubric, audit contract, bot scripts. |
| **Trigger** | Admin types into a one-line input on `/agents` (Challenge Designer card) or in the Designer modal. |
| **Input** | `{ idea: string }` |
| **Output** | `ChallengeBrief` — title, subtitle, reward, rules, primary metric, scoring formula, rubric, red flags, notification copy, hype-ranking disclaimer. |
| **Current implementation** | Keyword match against a small set of hand-authored templates (testimonials, public demos, LinkedIn posts, recruiting referrals, hiring referrals, generic). |
| **File** | `src/agents/challenge-designer.ts` |
| **UI surface** | `/agents` Challenge Designer card; `DesignerModal.tsx` |

### 2. Daremaster (the bot persona)

This is the **unified bot voice** of DYD. The same persona narrates the launch video and posts contextual commentary in the feed. Earlier iterations split these into two ("Daremaster" for the video, "Hype Bot" for the feed); they're now one agent.

| | |
|---|---|
| **Purpose** | Compose contextual feed posts that reflect the current state of the challenge. |
| **Trigger** | Admin clicks **Generate next post** on the Daremaster card on `/agents`. |
| **Input** | `DaremasterSnapshot` — challenge id/title/deadlines/status, ranking, participant counts, days-to-deadlines, and signal flags from the audit handoff. |
| **Output** | `DaremasterPost` — content (string), pre-seeded reaction counts, a `trigger` enum identifying which scenario fired. |
| **Current implementation** | Trigger-based template selection (`pickTrigger`) plus three pre-baked content variants per stage: trivial / insight / winner. The post variant is gated on whether the admin has shipped the audit snapshot to the Daremaster. |
| **File** | `src/agents/daremaster.ts` (renamed from `hype-bot.ts` during the Step-2 cleanup) |
| **UI surface** | `/agents` Daremaster card; the post lands in `/feed` after Accept + Pin. |

The Day-14 narrative beat lives here: the admin generates a post, gets a flat trivial variant; opens Admin Review, tunes the formula, sends the snapshot to the Daremaster; a 4-second loader plays; the next generation produces the strong "Charlie's the dark horse" post. That sequence is the agent-to-agent handoff at the heart of the demo.

### 3. AI Audit Assistant

| | |
|---|---|
| **Purpose** | Score each evidence packet against the audit contract; flag issues; recommend approve / reject / needs-clarification. The admin keeps final-decision authority. |
| **Trigger** | Runs once per stage build (`buildSnapshot` → `buildAudits`). At Day 14 it audits a *trimmed* packet (first N items, where N = participant's current self-reported count). At Completed it audits the full packet. |
| **Input** | `AuditInput { packet: EvidencePacket; contract: AuditContract }` |
| **Output** | `AuditFindings { qualityScore, validatedItems, rejectedItems, flags, recommendation, suggestedFinalScore, rubricBreakdown, trace, ... }` |
| **Current implementation** | Per-criterion rule-based scorers (clarity, businessImpact, clientRelevance, specificity, permissionCompleteness) operating on **structured signals** already present on each `EvidenceItem` (`hasMetric`, `hasPermission`, `lengthSeconds`, etc.). Red-flag detector runs separately. The audit doesn't read raw video; it reads pre-extracted booleans. |
| **File** | `src/agents/audit-assistant.ts` |
| **UI surface** | `/admin` — score breakdowns, per-criterion bars, the formula panel and rubric editor, the override flow, the All-Submissions queue, the per-row detail modal. |

The Audit Assistant is the hardest agent to make "fully real": real evidence would arrive as raw video, and structured signals would need to be extracted upstream (transcription + LLM signal extraction). The cheaper option is to keep structured signals mocked and replace only the `trace` narrative with LLM output.

### 4. Growth Insight Extractor

| | |
|---|---|
| **Purpose** | Mine the approved corpus into reusable marketing assets — pull-quotes, case-study leads, sales snippets, LinkedIn drafts. |
| **Trigger** | Admin clicks **Run Growth Insight Extractor** on `/insights` after the challenge is over and a winner is declared. |
| **Input** | `InsightInput { approvedPackets: EvidencePacket[]; rejectedCount: number }` |
| **Output** | `InsightBundle { topQuotes, caseStudies, snippets, linkedinPosts, totals, generatedAt }` |
| **Current implementation** | Heuristic ranking via `quotePower` (metric + impact-summary length + length-seconds + role-presence), grouped by company for case studies, two LinkedIn drafts grounded in the flagship item + a corpus-retrospective. |
| **File** | `src/agents/insight-extractor.ts` |
| **UI surface** | `/insights` — empty state with trigger button → 5-second loader → renders the bundle. |

After the bundle is generated, the admin can ship it back to the Daremaster (`Send insights to Daremaster`), which unlocks the winner-announcement post on the feed (with a `See the growth report` CTA back to `/insights`).

---

## The two personas

- **Tomi (Participant)** — internal user-id `u-sofia`, participant id `p-sofia`. Demo protagonist.
- **Gabo (Admin)** — internal user-id `u-admin`. Growth operations lead.

Sponsor / Spectator: **gone**. Any legacy code references collapse to participant.

The TopBar shows a static badge (`Tomi · Participant` or `Gabo · Admin`) — no in-product role switcher. Account/stage are set via the URL `?act=` mechanism described in ARCHITECTURE.md.

---

## The four demo stages

| Stage | Account | What's true at this snapshot |
|---|---|---|
| `launch` | Tomi · Participant | Challenge just dropped. Nobody is registered yet. The participant lands on the Challenge page with the Daremaster video idle; the three follow-on tabs (Hype Ranking, Feed, Dashboard) are locked until they accept. |
| `day_3` | Tomi · Participant | A handful of participants have registered. Tomi has 1 testimonial in. The dashboard form is the live focus; submitting auto-bumps the count and reorders the Hype Ranking. |
| `day_14` | Gabo · Admin | Mid-challenge. Bob leads on volume but quality hasn't been weighed in. Audit Assistant has scored every participant's *trimmed* packet (current self-reported count). Admin can tune the formula and send a snapshot to the Daremaster, unlocking a sharper feed post. |
| `completed` | Gabo · Admin | Submissions closed. Audit Assistant has done its full pass. Admin reviews submissions, overrides where needed, accepts scores, declares Patrick the winner, runs the Growth Insight Extractor, and ships the bundle back to the Daremaster for the winner announcement. |

Stages are a **recording-time abstraction**: in production, state would advance organically as the challenge runs. In the demo, the snapshot for each stage is rebuilt atomically from `mock-data.ts` via `src/lib/demo-stages.ts` so each take starts from a deterministic state.

Two "handoff flags" travel inside the snapshot and gate Daremaster behavior:

- `daremasterInsightSent` — admin has shipped the Day-14 audit snapshot to the Daremaster. Unlocks the Charlie-dark-horse variant.
- `growthInsightSent` — admin has shipped the Growth Insight Extractor bundle to the Daremaster. Unlocks the winner-announcement variant.

---

## Scoring formula

```
Final score = Quality × W%  +  Quantity × (100 − W)%   on a 0–10 scale
```

- **Quality** = `qualityScore / 10`, where `qualityScore` is a 0–100 sum across the rubric criteria. Per-criterion weights are admin-tunable via the rubric editor inside the formula panel.
- **Quantity** = `min(validatedItems / targetItems, 1) × 10`. `targetItems` is hidden from the UI and defaults to 12.
- **Override**: admin can set an explicit `overrideScore` per participant; that value bypasses the formula.
- **Persistence**: the formula config (qualityWeight, targetItems, optional rubricWeights override) lives in `localStorage` at `dyd:formula:v1`.

The displayed final score across the app is always `effectiveFinalScore(audit, formula)` — single source of truth in `src/lib/formula.ts`.

### Trimmed audits at Day 14

At Day 14 the Audit Assistant audits a participant's evidence packet sliced to their current self-reported count: `items.slice(0, selfReportedValue)`. The intent is to reflect "where the participant stands mid-challenge" rather than projecting their final-state packet. Completed stage audits the full packet.

---

## Hype Ranking

Public leaderboard. Sorted by `selfReportedValue` desc. Auto-bumps when a participant submits a testimonial (the count is tied to the upload — there's no manual self-report counter anymore). Movement indicators (↑/↓/flat/new) are seeded per stage in `demo-stages.ts`.

---

## Design constraints (carry into Step 2)

- **No "mock" / "mocked" / "simulated" wording in the user-visible UI.** The fact that a backend is mocked is implementation detail.
- **The recorded demo is the product surface.** Wording in the videos is canonical for the recording. Live LLM outputs may diverge in tone, wording, or specific numbers, but the structural beats (admin sends snapshot → next post is sharper, etc.) must hold.
- **No scores in Daremaster posts.** Numerical scores from the audit are admin-private; Daremaster posts on the public feed never quote them. (Counts and qualitative descriptions are fine.)
- **Auth stays mocked.** Tomi/Gabo are the only accounts. Out of scope to make real per NEXT_STEPS.md.
- **One challenge live at a time** (DYD #001). Multi-challenge concurrency is out of scope.
- **Default to no comments in code.** Only annotate non-obvious *why*.
- **Brief end-of-turn summaries from any future Claude sessions.** Don't section-header simple tasks.

---

## What's intentionally out of product scope

- Multi-tenant / multi-org
- Real authentication (OAuth, SSO, password reset)
- Persistent backend / multi-device sync (currently localStorage only)
- Real video transcription / vision analysis upstream of the Audit Assistant
- Real-time collaboration / multi-admin
- Mobile UI / responsive below desktop widths
- Internationalization
- Production deployment, monitoring, billing

Some of these will appear on a "What's needed to take this to production" TODO in NEXT_STEPS.md Step 3. None of them block Step 2.
