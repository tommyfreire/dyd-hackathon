# DYD - Architecture

Code map and current mock-vs-real boundaries.

## Stack

- Next.js 14 app router
- React 18 client components
- TypeScript strict mode
- Plain CSS (`tokens.css`, `components.css`, `globals.css`)
- Postgres 16 in Docker, accessed through Prisma
- Vitest for automated tests

Docker maps Postgres container port 5432 to host port 5433. Prisma reads `DATABASE_URL`; seed smoke tests use `DATABASE_URL_TEST`.

## Routes

| Route | Renders / owns | Notes |
|---|---|---|
| `/` | `ChallengePage` | Day-1 landing, video, accept-the-Dare flow. |
| `/dashboard` | `DashboardPage` | Participant evidence form. |
| `/ranking` | `RankingPage` | Hype Ranking. |
| `/feed` | `FeedPage` | Social feed. |
| `/agents` | `AgentsPage` | Admin agent control surface. |
| `/admin` | `AdminPage` | Admin review, formula, receipts, winner flow. |
| `/insights` | `InsightsPage` | Growth Insight Extractor output. |
| `/api/agents/*` | Agent route handlers | Provider-ready Step-2 routes. Do not expose provider keys to the client. |
| `/api/seed` | Seed route | `?act=` setup endpoint; writes deterministic Postgres rows. |

`src/app/layout.tsx` mounts `AppShell`, which wires role/stage/toast providers and runs `applyActFromUrl()`.

## Runtime Library

| File | Responsibility |
|---|---|
| `src/lib/api.ts` | Stable screen-facing API. Delegates to server actions and keeps Step-2 agent wrapper/fallback behavior. |
| `src/lib/mock-data.ts` | Seed data: DYD #001, participants, evidence packets, feed seeds, notifications, agent snapshots. |
| `src/lib/demo-stages.ts` | Stage snapshot source of truth. Seed functions translate `buildSnapshot(stage, currentUserId)` to DB rows. |
| `src/lib/act-url.ts` | Parses `?act=tomi:launch` / `?act=gabo:completed:hype,growth`, calls `/api/seed`, stores local role/stage hints, flips handoff flags, reloads. |
| `src/lib/formula.ts` | Scoring formula and local formula config at `dyd:formula:v1`. |
| `src/lib/role-context.tsx` | Local role shim (`dyd:role:v1`) plus current-user refresh. |
| `src/lib/stage-context.tsx` | Local stage hint (`dyd:stage:v1`) for UI formatting/stage gating. |
| `src/lib/types.ts` | Product domain types. |

## Server Data Layer

| File / folder | Responsibility |
|---|---|
| `src/server/db.ts` | Prisma client singleton. Server-only. |
| `src/server/world.ts` | DB mapping, persistence operations, deterministic seed translation, and agent input assembly. |
| `src/server/actions/*.ts` | `"use server"` action modules grouped by domain. These are imported by `src/lib/api.ts`. |
| `src/server/seed/*.ts` | `seedLaunch`, `seedDay3`, `seedDay14`, `seedCompleted`, and `seedAll`. |
| `scripts/db-setup.mjs` | Idempotent Docker/Postgres/Prisma bootstrap. |
| `scripts/run-seed.ts` | `npm run db:seed -- <stage> <role>`. |

Prisma artifacts:

| File / folder | Purpose |
|---|---|
| `prisma/schema.prisma` | Canonical schema artifact. |
| `prisma/migrations/*/migration.sql` | Raw SQL artifact. |
| `docker-compose.yml` | Local Postgres 16 container. |

## State Model

### Database Tables

| Table | Purpose |
|---|---|
| `User` | Tomi/Gabo plus competitor users. Auth remains mocked. |
| `Challenge` | DYD #001 metadata, deadlines, rules, audit contract, winner id. |
| `ChallengeState` | Current seeded stage, active user id, Daremaster/Growth handoff flags. |
| `Participant` | Registration, self-reported count, ranking fields, badges, evidence status. |
| `EvidencePacket` / `EvidenceItem` | Structured audit/insight corpus consumed by agents. |
| `EvidenceSubmission` | Dashboard submission rows. |
| `AuditResult` | Audit Assistant results, score receipt trace, admin overrides. |
| `FeedPost` | Social feed posts, reactions, pin state, CTA metadata. |

### LocalStorage Keys

| Key | Shape | Why it remains local |
|---|---|---|
| `dyd:stage:v1` | active demo stage string | UI formatting and stage context hydration. Source of truth is also in `ChallengeState`. |
| `dyd:role:v1` | `"participant"` or `"admin"` | Recording/auth shim. No real sessions in scope. |
| `dyd:formula:v1` | scoring formula config | Per-browser admin tuning, intentionally not shared world state. |

### Flow

1. The act URL calls `/api/seed?stage=<stage>&role=<role>`.
2. `/api/seed` calls `seedAll(stage, role)`, which truncates owned tables and inserts deterministic rows from `buildSnapshot`.
3. Screens fetch through `src/lib/api.ts`, which delegates to server actions.
4. Mutations update Postgres and dispatch `dyd:state-changed` so client subscribers refresh.

## Mock-vs-Real Boundaries

| Subsystem | Current state |
|---|---|
| Auth | Mocked. Tomi/Gabo are seeded users selected through `?act=`. |
| Seed data | Mocked. DYD #001 and evidence packets live in `mock-data.ts`, then get inserted into Postgres by seeds. |
| Persistence | Real local Postgres. The demo world is queryable through Prisma Studio. |
| Agents | Provider-ready routes with deterministic fallback. The no-key submission build runs on fallbacks. |
| Formula config | localStorage by product decision. |
| Recording controls | `?act=` and stage hints are demo tooling, not production design. |

The recorded demo remains the product surface. Provider-generated wording may diverge, but structural beats must hold.

## Build / Run

```bash
npm install
npm run db:setup
npm run dev
npm test
npx tsc --noEmit
```

Use `npm run db:studio` to inspect rows. Do not use `next build` as the default local verification command; it writes production chunks under `.next/`.

## Historical Reference

`prototype/` and `prototype-components/` are historical visual references only.
