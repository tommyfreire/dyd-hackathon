# DYD — Do You Dare

Internal hackathon prototype for a BairesDev growth-challenge platform. Employees register for time-boxed Dares (e.g. *"collect client testimonials in 14 days"*), self-report progress on a public Hype Ranking, and submit evidence. Four AI agents run in the background — **Challenge Designer**, **Daremaster**, **AI Audit Assistant**, **Growth Insight Extractor** — and an admin orchestrates them.

The pitch: most hackathon entries are automation-first. DYD flips it — the **game** is what makes employees show up, and the **AI** is what makes the game scale to the whole company.

---

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

```bash
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

## What's mocked, what's real

As of Step 1: **everything is mocked.** Auth (Tomi/Gabo are seeded users), data (single hand-authored challenge with hand-authored evidence packets), persistence (localStorage only), all four agents (pure deterministic functions in `src/agents/*.ts`).

Step 2 replaces selected agent mocks with real LLM-driven implementations. Auth, seed data, and the localStorage state model stay mocked. See `STEP2_BRIEF.md`.

The recorded demo is the canonical product surface; live agent outputs may diverge in tone/wording/numbers from what the videos show. See `DEMO.md` for the divergence rule.

---

## Documentation map

| File | What it is |
|---|---|
| [`PRODUCT.md`](./PRODUCT.md) | What DYD is — agents, stages, scoring formula, design constraints. The product spec. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Code map. Stack, layer-by-layer responsibilities, mock-vs-real boundaries, localStorage keys, build/run. |
| [`DEMO.md`](./DEMO.md) | What the recorded demo shows + the divergence rule. |
| [`STEP2_BRIEF.md`](./STEP2_BRIEF.md) | Briefing for the AI tool that will plan Step 2 (LLM swap-in scope). |
| [`NEXT_STEPS.md`](./NEXT_STEPS.md) | The three-step plan. Step 1 done; Step 2 is active. |
| [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) | The voice-over + stage directions used during recording. Working file; not part of the product spec. |
| [`CLAUDE.md`](./CLAUDE.md) | Orientation for Claude Code sessions in this repo. |

---

## Repo layout

```
src/
├── app/                    Next.js routes (thin)
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
│   ├── api.ts              Fake API (localStorage-backed)
│   ├── mock-data.ts        Seed data
│   ├── demo-stages.ts      Per-stage snapshot shaping
│   ├── formula.ts          Scoring formula
│   ├── act-url.ts          ?act= URL handler
│   ├── format.ts           Stage-anchored time
│   ├── role-context.tsx
│   ├── stage-context.tsx
│   └── types.ts            Domain types
└── styles/                 globals.css + components.css + tokens.css

prototype/                  Historical static-HTML reference (will be removed)
prototype-components/       Earlier JSX prototype (will be removed)
scripts/                    audit-check.ts (sanity runner)
public/                     Static assets (the Daremaster video)
```

---

## License / use

Internal hackathon prototype. Not for production use.
