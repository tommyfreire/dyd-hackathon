# DYD — Local Setup

This is a Next.js 14 (App Router) prototype. All data is mocked client-side and persisted to `localStorage` — no backend, no auth, no env vars. Two-step setup.

## 1. Install + run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The first time you load the app it seeds itself from `src/lib/mock-data.ts` and writes the working state to `localStorage` under `dyd:state:v1`. Reloads keep your edits.

## 2. The two switchers in the top bar

There's no signup or login. Two top-bar selectors drive the demo:

### Demo Stage (left selector)
Jumps the entire world to a pre-seeded scene. Picking a stage **overwrites the localStorage snapshot and reloads** — so you can record the demo cleanly without scripting clicks. Stages map to scenes in `DEMO_STEPS.md`:

| Stage                  | What it shows                                                                   |
|------------------------|----------------------------------------------------------------------------------|
| `launch`               | Challenge page, no one registered, no progress                                  |
| `registered`           | Sofía just accepted the Dare; ranking still empty                               |
| `early_hype`           | Day 1 — all registered, no progress yet, "The board is quiet…" bot beat        |
| `participant_progress` | Day 3 — Sofía has 3 testimonials uploaded, others starting to move             |
| `competition_heats_up` | Day 10 — Bob 18 / Patrick 9 / Alice 7 / Charlie 6, full feed, badges, audit %  |
| `admin_review`         | Bob vs Patrick split is live; audit results loaded                              |
| `completed`            | Winner declared, Final Ranking unlocks, Growth Insights end-of-demo line shows  |

### Role (right selector)
Mock authenticator. Picks who you're viewing as:

| Role        | Who                       | What they see                                                |
|-------------|---------------------------|--------------------------------------------------------------|
| Participant | **Sofía Rodríguez** (CSM) | Challenge, Ranking, Feed, **My Dashboard**, Agents, Insights |
| Admin       | **Valentina Ruiz**        | …plus **Admin Review**                                       |
| Sponsor     | Diego Aguirre             | Challenge, Ranking, Feed, Agents, Insights                   |
| Spectator   | Maya Iverson              | Challenge, Ranking, Feed, Agents, Insights                   |

Bob, Patrick, Alice, Charlie are *competitors* in the leaderboard — never the viewer.

## 3. The recording playbook

Run the eight scenes from `DEMO_STEPS.md` by stepping through stages and roles:

| # | Scene                           | Stage                  | Role         | Page                        |
|---|---------------------------------|------------------------|--------------|-----------------------------|
| 1 | The Dare drops                  | `launch`               | Participant  | `/`                         |
| 2 | Official commitment             | `launch` → `registered`| Participant  | `/` → click "I Dare"        |
| 3 | Day 1 Hype Ranking              | `early_hype`           | Participant  | `/ranking`                  |
| 4 | Participant first move          | `participant_progress` | Participant  | `/dashboard`                |
| 5 | Competition heats up            | `competition_heats_up` | Participant  | `/ranking` → `/feed`        |
| 6 | Admin review                    | `admin_review`         | Admin        | `/admin`                    |
| 7 | Final ranking flip              | `completed`            | any          | `/final-ranking`            |
| 8 | Growth insights                 | `completed`            | any          | `/insights`                 |

## 4. Reset the demo

The sidebar has a **Reset demo state** button at the bottom — wipes `localStorage` and rehydrates from `mock-data.ts`. Or:

```js
localStorage.removeItem("dyd:state:v1");
localStorage.removeItem("dyd:role:v1");
location.reload();
```

## 5. The agent layer

DYD is agentic. Four agents power everything:

| Agent | Role | Where it triggers |
|---|---|---|
| **Challenge Designer** | Turns a one-line goal into a full challenge brief | `/agents` → "Draft a new challenge" |
| **Hype Bot** | Generates contextual feed posts | `/agents` → "Generate next post" |
| **AI Audit Assistant** | Scores evidence and computes the suggested final score | `/admin` (live) and `/agents` → "Audit X" |
| **Growth Insight Extractor** | Mines approved evidence for marketing assets | `/insights` (live, with "Re-run extractor") |

All four live in `src/agents/`. Each is one file. Each is a pure function. The full tour is in **`AGENTS.md`** at the repo root — read that before changing anything in the agent layer.

The visibility model: **the admin operates the agents from `/agents`. The participant only ever sees their outputs** (bot posts in the feed, audit scores in the ranking). The participant never sees `/agents`, `/admin`, or `/insights` — those are sidebar-gated to the admin role.

## 6. Where to look in the code

```
src/
  agents/                 Agent layer — see AGENTS.md
    types.ts              I/O contracts
    challenge-designer.ts
    hype-bot.ts
    audit-assistant.ts
    insight-extractor.ts
    index.ts              Barrel
  app/                    Next.js App Router pages
  components/
    shell/                Topbar, sidebar, page header, notifications
    ui/                   Icon, Avatar, Modal, Toast, BotMessageCard
    screens/              One file per page (Challenge, Ranking, Feed, …)
  lib/
    types.ts              Canonical product types — never redefine in components
    mock-data.ts          Seeds (challenge, participants, evidence packets, feed)
    api.ts                Fake API + agent invocations. Swap function bodies
                          for fetch() when a real backend lands; signatures stable.
    role-context.tsx      The role switcher's React context
    stage-context.tsx     The demo-stage switcher's React context
    demo-stages.ts        Per-stage state builders
    format.ts             ago() and fmtDate()
  styles/
    tokens.css            BairesDev DS3 tokens (DO NOT EDIT)
    components.css        Component classes (.btn, .card, .rank-row, …)
    globals.css           tokens + components + tailwind base
scripts/
  audit-check.ts          Sanity-check the audit math against canonical packets
```

The previous flat HTML prototype lives in `prototype/` and `prototype-components/` for reference.

## 7. Verifying agent math

```bash
npx tsx scripts/audit-check.ts
```

Prints validated/quality/multiplier/final scores for every seeded participant. The demo invariants — Bob 6.05, Patrick 10.35 — are computed by the Audit Assistant from the canonical `evidencePackets`. If you change packets or scoring logic, run this.

## 8. What's *not* here yet (and where to add it)

- **Real auth.** When you wire it in, replace `src/lib/role-context.tsx` with a real auth context and read `role` off the user document. The role switcher becomes a debug-only affordance.
- **Real backend.** Replace each function body in `src/lib/api.ts` with a `fetch()` call. Keep the signatures identical. The screens won't change.
- **Real LLM agents.** Each agent module is a pure function with stable I/O. Replace its body with a server route that calls the Anthropic SDK. Inputs and outputs in `src/agents/types.ts` don't change. See `AGENTS.md` for per-agent guidance.

See `FIRST_DRAFT_DECISIONS.md` §7 for the full "real vs mocked" matrix.
