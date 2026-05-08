# DYD — Claude orientation

This file is loaded automatically by Claude Code. It exists so any Claude
session — including a fresh one on a different account — can pick up where
the last one left off without the user having to re-explain anything.

## What this project is

DYD ("Do You Dare") is an internal hackathon prototype for a BairesDev
growth-challenge platform. Employees register for time-boxed dares (e.g.
"collect client testimonials"), self-report progress on a public Hype
Ranking, and submit evidence. Four AI agents run in the background:

- **Challenge Designer** turns a one-line idea into a full challenge brief.
- **Daremaster** posts contextual commentary in the social feed and is the
  same persona as the launch-video narrator.
- **AI Audit Assistant** scores evidence against a rubric and surfaces a
  recommendation; the admin keeps the final call and can override scores.
- **Growth Insight Extractor** mines the approved corpus into reusable
  marketing assets (quotes, case studies, snippets, LinkedIn drafts).

**Canonical docs to read** (in this order):

1. `README.md` — quick start, doc map.
2. `PRODUCT.md` — what DYD is. The product spec.
3. `ARCHITECTURE.md` — code map and mock-vs-real boundaries.
4. `DEMO.md` — what the recorded demo shows + the divergence rule.
5. `NEXT_STEPS.md` — the three-step plan.
6. `STEP2_BRIEF.md` — only if you're planning Step 2.

`DEMO_SCRIPT.md` is the user's recording reference. It's not part of the
canonical product spec — skip it unless the user asks you to edit it.

## Status

Step 1 is complete: the demo is recordable. Step 2 is the active step —
replacing selected agent mocks with real LLM-driven implementations. The
user is using a separate AI tool to scope Step 2 against `STEP2_BRIEF.md`
before any implementation begins.

## Demo state model

Four stages live in `src/lib/demo-stages.ts`:

- `launch` — Tomi lands on the Challenge page, hasn't yet accepted.
- `day_3` — Tomi uploads a testimonial, count auto-bumps.
- `day_14` — Gabo tunes the formula, sends the snapshot to the Daremaster.
- `completed` — final review, accept scores, declare winner, run insights.

Selecting a stage rebuilds the entire snapshot atomically (participants,
ranking, feed, audits, evidence, notifications). This happens via
`setDemoStage()` in `src/lib/api.ts`.

Two flags travel inside the snapshot and drive the agent handoff demo
beats:

- `daremasterInsightSent` — set by the admin's "Send snapshot to Daremaster"
  button on `/admin` at Day 14. Unlocks the Charlie-dark-horse post.
- `growthInsightSent` — set by the admin's "Send insights to Daremaster"
  button on `/insights` at Completed. Unlocks the winner-announcement post.

Old localStorage from before the rename (`hypeBotInsightSent`) will be
overwritten on the next `?act=` URL — no migration logic needed.

The world dispatches a `dyd:state-changed` window event after every
mutation so subscribers (the sidebar's locked-tab logic, the agent
handoff loaders, the `winnerDeclared` gate on Growth Insights) refresh
without waiting for navigation.

## Account / stage setup — `?act=` URL

The TopBar shows a static account badge (no in-product role switcher).
Account and stage are set via a hidden URL parameter: `applyActFromUrl()`
in `src/lib/act-url.ts` parses `?act=tomi:launch`, `?act=gabo:day_14`,
`?act=gabo:completed:hype,growth`, etc. Each call resets state and
rebuilds the snapshot from seed.

## Scoring formula

`src/lib/formula.ts` owns the math:

```
Final score = Quality × W%  +  Quantity × (100 − W)%   on a 0–10 scale
```

- **Quality** = `qualityScore / 10`, where `qualityScore` is a 0–100 blend
  of rubric criteria (per-criterion weights are admin-tunable inside the
  formula panel).
- **Quantity** = `min(validatedItems / targetItems, 1) × 10`. `targetItems`
  is hidden from the UI but defaults to 12.
- **Override**: when admin enters an explicit `overrideScore` it takes
  precedence over the formula.

The formula is persisted in localStorage at `dyd:formula:v1`. Any UI that
displays a final score uses `effectiveFinalScore(audit, formula)` so the
numbers everywhere agree.

Day 14 audits run against **trimmed packets** — each participant's evidence
sliced to their current self-reported count — so the snapshot matches the
state of the competition mid-challenge. Completed audits use the full
packet.

## Roles and accounts

Two accounts only:

- `Tomi` (participant) — `u-sofia` / `p-sofia` under the hood.
- `Gabo` (admin) — `u-admin`.

Sponsor and Spectator are gone. The TopBar shows a static badge; there is
no role switcher and no Restart-demo button. State is reset via the
`?act=` URL.

## Conventions to keep

- **No "mock" / "mocked" / "simulated" wording in user-visible UI.** The
  fact that the backend is mocked is implementation detail.
- **No "demo" / "prototype" wording in user-visible UI either.** Demo-meta
  language was scrubbed from screens; if you see it, ask before re-adding.
- **No scores in Daremaster posts.** The Daremaster never quotes audit
  scores on the public feed. Counts and qualitative descriptions are fine.
- **Default to no comments.** Only add a comment when the *why* is
  non-obvious. Don't narrate what code does.
- **Brief end-of-turn summaries.** One or two sentences on what changed
  and what's next. No headers and sections for simple tasks.
- **Don't add features beyond what was asked.** Bug fixes don't need
  surrounding cleanup.
- **Use the dedicated tools (Read, Edit, Write).** Reserve Bash for
  shell-only operations; never use it for `cat`/`head`/`echo`.
- **Don't run `next build` to "verify" — `tsc --noEmit` is enough.**
  `next build` writes prod chunks that confuse the running dev server.

## Files at a glance

```
src/
├── app/                          Next.js routes (thin wrappers)
├── components/
│   ├── shell/                    TopBar, Sidebar, AppShell, NotificationBell
│   ├── ui/                       Modal, Avatar, Toast, Icon (lucide-style SVGs)
│   └── screens/                  One file per page: ChallengePage,
│                                 DashboardPage, RankingPage, FeedPage,
│                                 AdminPage, AgentsPage, InsightsPage,
│                                 DesignerModal, RegisterModal
├── agents/
│   ├── audit-assistant.ts        Pure function: rubric scoring + flags
│   ├── daremaster.ts             Pure function: snapshot → post
│   ├── insight-extractor.ts      Pure function: corpus → asset bundle
│   ├── challenge-designer.ts     Templates keyed off the one-line prompt
│   └── types.ts                  Agent I/O contracts
├── lib/
│   ├── types.ts                  Shared product types (Challenge, Audit, etc.)
│   ├── api.ts                    Fake API layer; localStorage-backed
│   ├── mock-data.ts              Seed data (participants, evidence, posts)
│   ├── demo-stages.ts            Stage shaping — single source of truth for
│                                 what the world looks like at each scene
│   ├── formula.ts                Scoring formula + persistence
│   ├── format.ts                 Stage-anchored `ago()` and date helpers
│   ├── act-url.ts                ?act= URL handler (recording setup)
│   ├── role-context.tsx          Role provider (Tomi/Gabo)
│   └── stage-context.tsx         Stage provider
└── styles/
    ├── globals.css
    ├── components.css            All bespoke component classes
    └── tokens.css                Color/space/font tokens
```

## Quick smoke test

After any structural change, this should still work:

1. `npm run dev`
2. `npx tsc --noEmit`
3. Visit `/?act=tomi:launch` — Tomi lands unregistered with the three
   follow-on tabs locked.
4. Click "I Dare" → tabs unlock instantly (powered by the
   `dyd:state-changed` event).
5. Visit `/?act=gabo:day_14` — admin lands; the Daremaster card is
   reachable; the formula panel is on `/admin`.
6. Visit `/?act=gabo:completed` — admin lands; "Open Final Review" CTA;
   only one notification in the bell (until winner is declared).

If anything in this file conflicts with reality, fix the file.
