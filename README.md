# DYD — Do You Dare

Internal hackathon prototype for a BairesDev growth-challenge platform. Employees register for time-boxed Dares (e.g. *"collect client testimonials in 14 days"*), self-report progress on a public Hype Ranking, and submit evidence. Four AI agents run in the background — **Challenge Designer**, **Daremaster**, **AI Audit Assistant**, **Growth Insight Extractor** — and an admin orchestrates them.

The pitch: most hackathon entries are automation-first. DYD flips it — the **game** is what makes employees show up, and the **AI** is what makes the game scale to the whole company.

---

## Quick start

Requirements: Node 20+, npm, and Docker Desktop (or another Docker engine) running.

```bash
npm install
npm run db:setup
npm run dev
```

Then open the URL Next prints, usually <http://localhost:3000>. The setup script starts Postgres 16 in Docker, applies Prisma migrations, creates the `dyd_test` database, and seeds the launch state.

Useful DB commands:

```bash
npm run db:studio     # inspect Postgres rows in Prisma Studio
npm run db:reset      # wipe Docker volume, re-apply migrations, re-seed
npm run docker:logs   # inspect Postgres container logs
```

```bash
npm test              # automated tests
npx tsc --noEmit     # type-check
```

Don't run `next build` to verify changes locally — it writes prod chunks under `.next/` that confuse the running dev server. Use `tsc --noEmit`.

---

## How to navigate the demo

The demo runs across four stages. Set the stage and account via URL:

| URL | Account | Stage |
|---|---|---|
| `/?act=tomi:launch` | Tomi (participant) | Launch — Dare just dropped |
| `/?act=tomi:day_3` | Tomi (participant) | Day 3 — first uploads |
| `/?act=gabo:day_14` | Gabo (admin) | Day 14 — formula tuning + agent handoff |
| `/?act=gabo:completed` | Gabo (admin) | Challenge finished — review + winner + insights |

Each `?act=` call rebuilds the world from seed and strips the parameter from the address bar. Clean state, every time.

Optional flags:
- `:hype` — pre-flips the Day-14 Daremaster snapshot-sent flag
- `:growth` — pre-flips the Completed-stage growth-insight-sent flag

Combine with commas: `/?act=gabo:completed:hype,growth`.

---

## What's provider-ready, what's mocked

After Step 2, the provider-backed agent routes (`/api/agents/...`) and server-side validators are implemented end-to-end. The hackathon submission build is not exercised against a real Anthropic provider; the provider path is validated through mocked-fetch automated tests, and the running demo uses deterministic no-key fallbacks.

| Subsystem | Status | Notes |
|---|---|---|
| **Daremaster** (feed posts) | provider-ready for `insight` and `winner`; deterministic in the submission build | Pre-handoff `trivial` mode is always deterministic to preserve the recorded demo beat. Public posts may not quote audit/formula scores; the validator enforces this. |
| **Growth Insight Extractor** | provider-ready; deterministic in the submission build | The provider path validates grounding against the approved corpus. `totals` and `generatedAt` are server-computed, never trusted from the model. |
| **Challenge Designer** | provider-ready; deterministic in the submission build | The provider path validates and normalizes output: rubric weights → 100, audit contract mirrored, `finalDecisionOwner = "admins"` enforced. |
| **AI Audit Assistant** | partial provider-ready; deterministic scoring always authoritative | Only the `trace` can be rewritten by the provider path. Scores, flags, validated counts, and the recommendation are unchanged. |
| Auth | mocked | Tomi/Gabo are seeded users. The `?act=` URL is a recording mechanism, not real auth. |
| Seed data | mocked | DYD #001 + four hand-authored evidence packets in `src/lib/mock-data.ts`. |
| Persistence | real local Postgres | World state is stored in Postgres via Prisma. The `?act=` URLs seed rows for each demo stage; formula tuning remains in localStorage. |

### Required environment variables

`npm run db:setup` copies `.env.example` to `.env` if needed. Defaults match `docker-compose.yml`:

```
DATABASE_URL=postgresql://dyd:dyd@localhost:5433/dyd?schema=public
DATABASE_URL_TEST=postgresql://dyd:dyd@localhost:5433/dyd_test?schema=public
```

Provider-ready agent routes read these server-side at request time. Demos work without them — every route wrapper falls back to its deterministic agent on missing-key, network failure, or invalid output.

```
ANTHROPIC_API_KEY=...               # required for any live agent run
ANTHROPIC_MODEL=claude-haiku-4-5    # optional; defaults to a fast Claude model
```

Both must be plain server-side env vars. **Never** prefix with `NEXT_PUBLIC_` and never reference them from a `"use client"` component.

### No-key fallback

Run the app without `ANTHROPIC_API_KEY` and every demo path still works:

- The Daremaster card produces the recorded trivial / insight / winner posts deterministically.
- The Growth Insight Extractor produces the deterministic asset bundle.
- The Challenge Designer produces a template-matched brief.
- The score receipt shows the deterministic trace.

This makes the recording reproducible from any machine without a key.

### What activates with a key

Drop `ANTHROPIC_API_KEY` into `.env.local` and restart `npm run dev` to activate the provider path for:

- Daremaster `insight` and `winner` generations. `trivial` mode remains deterministic.
- Growth Insight Extractor asset generation on `/insights`.
- Challenge Designer brief drafting in the modal.
- AI Audit Assistant score-receipt trace rewriting.

This provider path is built and covered by mocked-fetch automated tests. It has not been end-to-end verified against a real Anthropic provider in the hackathon submission build.

### Divergence rule

The recorded demo is the canonical product surface. Provider-generated outputs may diverge in tone, wording, or specific numbers from what the videos show — **structural beats** must hold (admin sends snapshot → next post is sharper, etc.) but specific phrasing is allowed to drift. See `DEMO.md`.

---

## Documentation map

| File | What it is |
|---|---|
| [`PRODUCT.md`](./PRODUCT.md) | What DYD is — agents, stages, scoring formula, design constraints. The product spec. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Code map. Stack, data layer, mock-vs-real boundaries, persistence keys, build/run. |
| [`DEMO.md`](./DEMO.md) | What the recorded demo shows + the divergence rule. |
| [`STEP2_BRIEF.md`](./STEP2_BRIEF.md) | Briefing for the AI tool that will plan Step 2 (LLM swap-in scope). |
| [`NEXT_STEPS.md`](./NEXT_STEPS.md) | The three-step plan and current status. |
| [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) | The voice-over + stage directions used during recording. Working file; not part of the product spec. |
| [`CLAUDE.md`](./CLAUDE.md) | Orientation for Claude Code sessions in this repo. |

---

## Repo layout

```
src/
├── app/                    Next.js routes (thin)
│   └── api/                 Agent routes + seed route
├── components/
│   ├── screens/            One file per page
│   ├── shell/              TopBar, Sidebar, AppShell
│   └── ui/                 Avatar, Modal, Toast, Icon
├── agents/                 Pure-function agent layer (Step-2 swap targets)
│   ├── challenge-designer.ts
│   ├── daremaster.ts
│   ├── audit-assistant.ts
│   ├── insight-extractor.ts
│   └── types.ts            I/O contracts
├── lib/
│   ├── api.ts              Stable screen-facing API wrappers
│   ├── mock-data.ts        Seed data
│   ├── demo-stages.ts      Per-stage snapshot shaping
│   ├── formula.ts          Scoring formula
│   ├── act-url.ts          ?act= URL handler
│   ├── format.ts           Stage-anchored time
│   ├── role-context.tsx
│   ├── stage-context.tsx
│   └── types.ts            Domain types
├── server/
│   ├── actions/            Server actions used by lib/api.ts
│   ├── seed/               Stage seed functions
│   ├── db.ts               Prisma singleton
│   └── world.ts            DB mapping and persistence logic
└── styles/                 globals.css + components.css + tokens.css

prisma/                     Prisma schema + SQL migrations
prototype/                  Historical static-HTML reference (will be removed)
prototype-components/       Earlier JSX prototype (will be removed)
scripts/                    DB setup/seed + audit-check sanity runner
public/                     Static assets (the Daremaster video)
```

---

## License / use

Internal hackathon prototype. Not for production use.
