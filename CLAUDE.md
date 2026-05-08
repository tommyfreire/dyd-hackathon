# DYD — Claude orientation

This file is loaded automatically by Claude Code. It exists so any Claude
session — including a fresh one on a different account — can pick up where
the last one left off without the user having to re-explain anything.

## What this project is

DYD ("Do You Dare") is an internal hackathon prototype for a BairesDev
growth-challenge platform. Employees register for time-boxed dares (e.g.
"collect client testimonials"), self-report progress on a public Hype
Ranking, and submit evidence. AI agents run in the background:

- **Challenge Designer** turns a one-line idea into a full challenge brief.
- **Hype Bot** posts contextual commentary in the social feed.
- **AI Audit Assistant** scores evidence against a rubric and surfaces a
  recommendation; the admin keeps the final call and can override scores.
- **Growth Insight Extractor** mines approved testimonials into reusable
  marketing assets (quotes, case studies, snippets, LinkedIn drafts).

The demo is the front door. **The plan is in `NEXT_STEPS.md`.** Read that
before starting any work.

## Status

We are at **Step 1** of `NEXT_STEPS.md` — preparing to record the demo. The
next concrete tasks are listed under "Status" in that file. Update them as
work completes.

## Demo state model

Four stages live in `src/lib/demo-stages.ts`:

- `launch` — Tomi lands on the Challenge page, hasn't yet accepted.
- `day_3` — early moves, Tomi uploads his first testimonial.
- `day_14` — leaderboard heats up, admin sends snapshot to Hype Bot.
- `completed` — final review, growth insights, winner announcement.

Selecting a stage rebuilds the entire snapshot atomically (participants,
ranking, feed, audits, evidence, notifications). This happens via
`setDemoStage()` in `src/lib/api.ts`.

Two flags travel inside the snapshot and drive the agent handoff demo
beats:

- `hypeBotInsightSent` — set by the admin's "Send snapshot to Hype Bot"
  button on `/admin` at Day 14. Unlocks the Charlie-dark-horse post.
- `growthInsightSent` — set by the admin's "Send insights to Hype Bot"
  button on `/insights` at Completed. Unlocks the winner post.

The world dispatches a `dyd:state-changed` window event after every
mutation so subscribers (e.g. the sidebar's locked-tab logic, the agent
handoff loaders) refresh without waiting for navigation.

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

Sponsor and Spectator are gone. The role switcher lives in `TopBar.tsx`,
the demo-stage switcher in `DemoStageSwitcher.tsx`, and the Restart-demo
button in `TopBar.tsx`. **All three are scheduled for removal during
Step 1** — see `NEXT_STEPS.md`.

## Conventions to keep

- **No "mock" / "mocked" / "simulated" wording in user-visible UI.** The
  fact that the backend is mocked is implementation detail.
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
│   ├── shell/                    TopBar, Sidebar, AppShell, etc.
│   ├── ui/                       Modal, Avatar, Toast, Icon (lucide-style SVGs)
│   └── screens/                  One file per page: ChallengePage,
│                                 DashboardPage, RankingPage, FeedPage,
│                                 AdminPage, AgentsPage, InsightsPage,
│                                 FinalRankingPage, DesignerModal,
│                                 RegisterModal
├── agents/
│   ├── audit-assistant.ts        Pure function: rubric scoring + flags
│   ├── hype-bot.ts               Pure function: snapshot → post
│   ├── insight-extractor.ts      Pure function: corpus → asset bundle
│   ├── challenge-designer.ts     Templates keyed off the one-line prompt
│   └── types.ts                  Agent I/O contracts
├── lib/
│   ├── types.ts                  Shared product types (Challenge, Audit, etc.)
│   ├── api.ts                    Fake API layer; localStorage-backed
│   ├── mock-data.ts              Seed data (participants, evidence, posts)
│   ├── demo-stages.ts            Stage shaping (the single source of truth
│                                 for what the world looks like at each scene)
│   ├── formula.ts                Scoring formula + persistence
│   ├── format.ts                 Stage-anchored `ago()` and date helpers
│   ├── role-context.tsx          Role provider (Tomi/Gabo)
│   └── stage-context.tsx         Stage provider
└── styles/
    ├── globals.css
    ├── components.css            All bespoke component classes
    └── tokens.css                Color/space/font tokens
```

## Auxiliary docs (will be reorganized in Step 3)

- `DEMO_IMPLEMENTATION_PLAN.md` — the spec we just executed against. Useful
  reference for *intent* per stage and per page.
- `DEMO_STEPS.md`, `DYD_PRODUCT_CONTEXT.md`, `FIRST_DRAFT_DECISIONS.md`,
  `AGENTS.md`, `SETUP.md` — historical scaffolding. Some will be deleted,
  some folded into the README during Step 3. Don't treat them as canonical.

## Quick smoke test

After any structural change, this should still work:

1. `npm run dev`
2. `npx tsc --noEmit`
3. Click "Restart demo" in the top bar (until removed) — drops you onto
   `launch` with Tomi unregistered and the right three nav tabs locked.
4. Click "I Dare" → tabs unlock instantly (powered by the
   `dyd:state-changed` event).
5. Switch through `day_3` / `day_14` / `completed` and check that each
   page reflects the stage.

If anything in this file conflicts with reality, fix the file.
