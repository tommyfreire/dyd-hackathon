# DYD — Architecture

Code map and the **mock-vs-real boundary** for every subsystem. If you're planning Step 2, this is the reference.

---

## Stack

- **Next.js 14** (app router) — `next.config.mjs`, `src/app/*`
- **TypeScript** — strict mode, `tsconfig.json`
- **React 18** — all components are `"use client"` (no server components)
- **Plain CSS** — `tokens.css` + `components.css` + `globals.css`. Tailwind is in `package.json` and `tailwind.config.ts` exists, but **utility classes are not used in the codebase**. Treat the styling as bespoke CSS classes.
- **localStorage** — the only persistence. There is no backend, no DB, no API server.
- **No auth** — accounts are switched via the `?act=` URL parameter (recording-time tool, not a real auth flow).

---

## Layer map

### `src/app/*` — routes

Thin Next.js page wrappers. One file per route, each just renders the corresponding screen component. No business logic here.

| Route | Renders | Notes |
|---|---|---|
| `/` | `ChallengePage` | Day-1 landing, video, accept-the-Dare flow |
| `/dashboard` | `DashboardPage` | Participant evidence form |
| `/ranking` | `RankingPage` | Hype Ranking |
| `/feed` | `FeedPage` | Social feed |
| `/agents` | `AgentsPage` | Admin's agent control surface (4 cards) |
| `/admin` | `AdminPage` | Admin Review (formula panel, snapshot view, top-2 compare, all-submissions queue) |
| `/insights` | `InsightsPage` | Growth Insight Extractor output |

`src/app/layout.tsx` mounts the global shell (`AppShell`) which wires the role + stage providers, the toast provider, and the `applyActFromUrl()` effect.

### `src/components/screens/*` — page composition

One file per page. Each is the canonical owner of its page-level state. Pages call into `src/lib/api.ts` for reads/writes; they don't read `mock-data.ts` directly.

Modal-style screens are siblings:
- `RegisterModal.tsx` — terms acceptance
- `DesignerModal.tsx` — Challenge Designer interactive flow

### `src/components/shell/*` — chrome

| File | Responsibility |
|---|---|
| `AppShell.tsx` | Provider tree (StageProvider → RoleProvider → ToastProvider) + the layout grid + `applyActFromUrl()` on mount |
| `TopBar.tsx` | Challenge pill, **static** account badge (no role switcher), notification bell |
| `Sidebar.tsx` | Nav with stage-aware lock/unlock; the Growth Insights tab is gated on `winnerDeclared` (read live from `getChallenge().winnerId`) |
| `NotificationBell.tsx` | Bell + dropdown |
| `Logo.tsx`, `PageHead.tsx` | small primitives |

### `src/components/ui/*` — primitives

`Avatar`, `Modal`, `Toast`, `Icon` (inline-SVG icon set, lucide-style), `BotMessageCard`. Reused across screens.

### `src/agents/*` — the agent layer (THE Step-2 swap targets)

Each agent is a **pure deterministic function** today. No I/O, no LLM call, no async work beyond what the calling layer wraps in. These are exactly what Step 2 will replace with real LLM calls.

| File | Agent | Public API |
|---|---|---|
| `challenge-designer.ts` | Challenge Designer | `design(input: ChallengeDesignerInput): ChallengeBrief` |
| `daremaster.ts` *(was `hype-bot.ts`)* | Daremaster | `generate(snapshot: DaremasterSnapshot): DaremasterPost`, `pickTrigger(s)` |
| `audit-assistant.ts` | AI Audit Assistant | `audit({ packet, contract }: AuditInput): AuditFindings` |
| `insight-extractor.ts` | Growth Insight Extractor | `extract({ approvedPackets, rejectedCount }: InsightInput): InsightBundle` |
| `types.ts` | (shared) | All agent I/O contracts |
| `index.ts` | (shared) | Re-exports |

**The I/O contracts in `types.ts` are the canonical interfaces.** Real LLM implementations must keep the same input and output shapes. That's the contract that protects the rest of the app from the swap.

### `src/lib/*` — runtime library

| File | What it does |
|---|---|
| `api.ts` | Fake API layer. localStorage-backed (`dyd:state:v1`). Every screen calls these functions; nothing reads `mock-data.ts` directly. Mutations dispatch a `dyd:state-changed` window event. |
| `mock-data.ts` | Seed data: the challenge + audit contract, evidence packets per participant (`BOB_ITEMS`, `PATRICK_ITEMS`, etc.), participants list, `agentSnapshots`, seeded feed posts, seeded notifications. |
| `demo-stages.ts` | Single source of truth for what state looks like at each stage. `buildSnapshot(stage, currentUserId)` returns a complete `StageStateSnapshot`. `setDemoStage()` overwrites localStorage with a fresh snapshot. Stage shaping is centralized here — participants, ranking, feed, audits, evidence, notifications. |
| `formula.ts` | Scoring formula + persistence at `dyd:formula:v1`. `effectiveQualityScore`, `qualityComponent`, `quantityComponent`, `computeFormulaScore`, `effectiveFinalScore`, `formulaTrace`. The whole app uses `effectiveFinalScore(audit, formula)` for displayed scores. |
| `format.ts` | Stage-anchored time helpers: `STAGE_NOW` (per-stage "now"), `ago`, `demoNow`, `fmtDate`. Why: timestamps in seeded posts must read sensibly relative to whichever stage you're viewing. |
| `role-context.tsx` | `<RoleProvider>` + `useRole()`. Hydrates from `dyd:role:v1`, calls `api.setRole()` on change. |
| `stage-context.tsx` | `<StageProvider>` + `useStage()`. Hydrates from `dyd:stage:v1`. The setter calls `setDemoStage` and reloads the page. |
| `act-url.ts` | `applyActFromUrl()` — recording-time setup mechanism. Parses `?act=tomi:launch` / `?act=gabo:day_14:hype,growth`, calls `resetState()`, `setDemoStage(stage)`, `apiSetRole(role)`, optionally flips snapshot flags, then strips the param and reloads. |
| `types.ts` | Product domain types: `Role`, `Challenge`, `Participant`, `RankingEntry`, `FeedPost`, `EvidenceSubmission`, `AuditResult`, `AgentSnapshot`, `GrowthAssetBundle`, `Notification`, `User`. |

### Styles

- `src/styles/globals.css` — root, font imports, `@import` of tokens.css and components.css.
- `src/styles/components.css` — bespoke component classes (`.app-header`, `.feed-card`, `.kpi-card`, etc.).
- `src/styles/tokens.css` — color/spacing/font tokens.

### Utility scripts

- `scripts/audit-check.ts` — standalone runner that verifies the audit math against the seed packets. Useful as a sanity check after touching `audit-assistant.ts` or `mock-data.ts`.

---

## State model

### LocalStorage keys

| Key | Shape | Cleared by `resetState()`? |
|---|---|---|
| `dyd:state:v1` | full snapshot — participants, ranking, feed, evidence, audits, challenge, currentUserId, notifications, `daremasterInsightSent`, `growthInsightSent` | yes |
| `dyd:stage:v1` | the active demo stage string | reset to `"launch"` |
| `dyd:role:v1` | `"participant"` or `"admin"` | no |
| `dyd:formula:v1` | scoring formula config (qualityWeight, targetItems, optional rubricWeights) | yes |

### State flow

1. The act URL (or first page load) calls `setDemoStage(stage)` → `buildSnapshot(stage, currentUserId)` → writes to `dyd:state:v1`.
2. Screens fetch via `src/lib/api.ts` async functions (artificial 150–300 ms latency per call).
3. Mutations write the snapshot back to localStorage and dispatch `dyd:state-changed`.
4. Subscribers (Sidebar, AgentsPage handoff loaders, etc.) listen to that event and refresh.

### The demo-stage abstraction

Stages are a recording-time tool. `buildSnapshot` shapes participants, the ranking, the feed, the evidence, the audits, the notifications, and the handoff flags as a single atomic structure. Re-running the same stage URL always produces the same snapshot — this is the determinism that makes recording reliable.

In production, state would advance organically (registrations roll in, submissions arrive, deadlines pass). The stage system is **not** part of the production design; it's purely a demo control plane.

---

## Mock-vs-real boundaries

For each subsystem, what's mocked today and what could go real in Step 2.

### Auth — **out of scope** (mocked, stays mocked)

- Currently: Tomi/Gabo are seeded users; account is selected via the `?act=` URL.
- Step 2: stays mocked. NEXT_STEPS.md locks this. The README will note it.

### Seed data (challenge + packets + participants) — **out of scope** (mocked, stays mocked)

- Currently: `src/lib/mock-data.ts` holds DYD #001 — Testimonial Hunt + four hand-authored evidence packets (Bob, Patrick, Alice, Charlie) + filler participants.
- Step 2: stays mocked. Replacing the seed dataset is out of scope.

### The four agents — **in scope**

| Agent | Today | Real-LLM swap difficulty |
|---|---|---|
| **Challenge Designer** | Keyword-matched template selection | **Easy.** Small input, structured output. |
| **Daremaster** | Trigger-based template + 3 pre-baked content variants | **Easy.** Small input (snapshot), short output (paragraph). |
| **AI Audit Assistant** | Per-criterion rule-based scorers on structured signals | **Hard.** "Real" audit needs to read raw video and extract signals. Cheaper option: keep structured signals mocked, swap only the `trace` narrative to LLM. |
| **Growth Insight Extractor** | Heuristic ranking + grouped templates | **Easy-Medium.** Reads validated corpus, emits structured asset bundle. |

The pure-function structure means each swap is local: replace the function body with a server-side LLM call (server action or API route), keep the input/output types. No type changes propagate.

### Persistence — **out of scope** (mocked, stays mocked)

- Currently: localStorage. No backend.
- Step 2: stays. Adding a backend would be Step-3 territory at the earliest.

### LLM provider — **to be decided in Step 2**

- Anthropic API is the project context, so it's the default candidate. Server-side call required (don't expose the key in the client). Each live agent should fall back to its current pure-function mock if the API key is missing or the call fails — demos must run without a key.

### Recording-only mechanisms — **stay mocked** (they're demo tools, not product surface)

- The `?act=` URL — recording setup. Not part of production.
- `setDemoStage()` and the demo-stage abstraction — recording tools.
- The static account badge in the TopBar — would become a real auth UI in production.
- `STAGE_NOW` (per-stage anchored "now") — only matters because timestamps in seed data must read sensibly inside each stage. Real production has real timestamps.

---

## Build / run

```bash
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # type check
```

Don't run `next build` to verify changes — it writes prod chunks under `.next/` that confuse the running dev server. Use `tsc --noEmit`.

---

## Historical reference (not part of the running app)

- `prototype/` — earlier static-HTML prototype (single HTML file + CSS + data.js).
- `prototype-components/` — the JSX prototype the current React app was lifted from.

These are kept on disk as visual reference and will be deleted in NEXT_STEPS.md Step 3. Ignore them when planning Step 2.
