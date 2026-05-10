# Step 3 — Real Persistence Layer

This step replaces the localStorage-backed world state with a real database (Postgres 16 in Docker, accessed via Prisma). The user's input that filled rows from Day 1 through Day 14 is **still** mocked — fired by seed scripts, not by Tomi typing — but everything downstream of those rows operates on real persisted data. The four agents, the audits, the feed, the rankings: all read from real tables.

This **supersedes** the "Persistence stays localStorage" lock that was set in `NEXT_STEPS.md` Step 2 and reflected in `PRODUCT.md` / `ARCHITECTURE.md`. Those docs must be updated as part of this work.

## Reading order before you start

1. `NEXT_STEPS.md` — the three-step plan; you're now in Step 3 (this file supersedes the original Step 3 cleanup framing).
2. **This file** — the plan you execute against.
3. `PRODUCT.md` — what DYD is. The product invariants the persistence layer must serve.
4. `ARCHITECTURE.md` — current code map. Pay attention to the localStorage section under "State model"; that's what's being replaced.
5. `src/lib/demo-stages.ts` — `buildSnapshot()` is the source of truth for what each stage looks like. **Your seed functions are its row-for-row translation.**
6. `src/lib/types.ts` — the domain types your schema must accommodate.
7. `src/agents/types.ts` — agent I/O contracts. **Do not change these.**
8. `src/lib/api.ts` — current client-side wrappers. Public function signatures must stay stable.
9. `STEP2_TESTING_PROGRAMMATIC.md` — the existing automated test plan. You'll rewire `src/lib/api.test.ts` and add a small new tier for seed scripts.
10. `STEP2_QA_LOG.md` — the manual QA log. You'll add a "verify DB state" pre-flight at the top.

## Decisions already made (push back via the user before you change them)

| | |
|---|---|
| **DB engine** | **Postgres 16, in Docker.** `docker-compose.yml` at repo root. Container's `5432` mapped to host `5433` to avoid colliding with any local Postgres install. |
| **Connection string** | `DATABASE_URL=postgresql://dyd:dyd@localhost:5433/dyd?schema=public` in `.env`. Seeded by the `db:setup` script if missing. |
| **ORM** | Prisma. `provider = "postgresql"`. `schema.prisma` is the canonical schema artifact; the generated SQL under `prisma/migrations/` is the second artifact. |
| **Data layer location** | Server actions under `src/server/actions/*.ts`, one file per domain. Marked with `"use server"`. |
| **Prisma client** | Singleton at `src/server/db.ts`. Never imported from a `"use client"` file. |
| **Existing `/api/agents/*` routes** | Untouched. Tests untouched. |
| **Formula config (`dyd:formula:v1`)** | Stays in localStorage. Per-user UI tweak, not shared world state. |
| **Stage / role state** | The "currently seeded stage" lives in a `ChallengeState` row (one per challenge). The active role stays in localStorage (`dyd:role:v1`). |
| **Notifications** | Derived in a server action from world state, not a separate table. |
| **AgentSnapshot** | Stays static config in `src/lib/mock-data.ts` (the `agentSnapshots` array); served unchanged. Not persisted. |
| **Auth** | Mocked. Tomi/Gabo are seeded users. `?act=` selects between them. |
| **Public API of `src/lib/api.ts`** | Function signatures **do not change**. Screens are not touched. |
| **Test database** | A second logical database `dyd_test` on the same Docker container. `DATABASE_URL_TEST=postgresql://dyd:dyd@localhost:5433/dyd_test?schema=public`. Created during `db:setup`. Seed smoke tests connect to it, TRUNCATE before each test. |

## Schema sketch — `prisma/schema.prisma`

Translate the domain types from `src/lib/types.ts` and the seed shaping from `src/lib/demo-stages.ts` into the following Prisma models. Field types are guidance — match the TypeScript types where they diverge.

```
User                id, name, role, jobTitle, avatarInitials?
Challenge           id, number, title, subtitle, description, sponsor, reward,
                    rewardSubtitle, registrationDeadline, submissionDeadline, status,
                    primaryMetricLabel, primaryMetricKey, hypeRankingDisclaimer,
                    rules (JSON), evidenceRequirements (JSON), auditContract (JSON),
                    winnerId?
ChallengeState      challengeId (PK), currentStage, daremasterInsightSent,
                    growthInsightSent
Participant         id, userId → User, challengeId → Challenge, role,
                    avatarInitials, registered, selfReportedValue, evidenceStatus,
                    hypeRank, finalRank?, badges (JSON), strikeRisk, strikeIssued
EvidencePacket      id, participantId → Participant, declaredMetric
EvidenceItem        id, packetId → EvidencePacket, clientName, clientCompany,
                    clientRole, lengthSeconds, hasPermission, hasBusinessImpact,
                    hasMetric, snippet, impactSummary
EvidenceSubmission  id, participantId → Participant, challengeId → Challenge,
                    submittedAt, files (JSON), clientName?, clientCompany?,
                    clientRole?, permissionToUse, businessImpactSummary
AuditResult         id, participantId → Participant, challengeId → Challenge,
                    declaredMetric, validatedItems, rejectedItems, qualityScore,
                    suggestedFinalScore, overrideScore?, flags (JSON),
                    recommendation, adminStatus, rubricBreakdown (JSON),
                    trace (JSON)
FeedPost            id, challengeId → Challenge, author, authorRole?, authorType,
                    content, createdAt, reactions (JSON), pinned, ctaLabel?,
                    ctaHref?
```

JSON columns: use Prisma's `Json` type. Postgres maps it to native `jsonb`, which is the right call here — query-friendly if we ever want it, and a more credible "real schema" artifact than blobbed TEXT. Validate shape at the server-action layer, not at the DB.

Foreign keys: define them with `onDelete: Cascade` where the parent owns the child (e.g. `EvidencePacket → Participant`, `EvidenceItem → EvidencePacket`, `AuditResult → Participant`). This makes seed truncation safe by deleting the top of the dependency chain.

If a model needs a field that isn't in the current types, **stop and escalate**.

## Docker setup — `docker-compose.yml`

Place at repo root. One service:

```
services:
  postgres:
    image: postgres:16-alpine
    container_name: dyd-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: dyd
      POSTGRES_PASSWORD: dyd
      POSTGRES_DB: dyd
    ports:
      - "5433:5432"
    volumes:
      - dyd_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dyd -d dyd"]
      interval: 3s
      timeout: 3s
      retries: 10

volumes:
  dyd_pg_data:
```

The `5433:5432` port mapping is intentional. Port 5432 collides with any pre-existing local Postgres install on a developer's machine; 5433 is conflict-free for ~99% of dev environments.

The named volume (`dyd_pg_data`) persists data across container restarts. To wipe everything (when a migration goes sideways), `docker compose down -v` removes the volume.

`db:setup` script (in `package.json`) runs:

1. Wait for Postgres healthcheck to pass (`pg_isready` polling, ~5s ceiling).
2. `npx prisma migrate dev --name init` (idempotent — re-running adds new migrations only).
3. Create the test database: `psql ... -c "CREATE DATABASE dyd_test;" || true` (the `|| true` so re-runs don't fail).
4. Apply migrations to the test database: `DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy`.
5. Run `seedAll("launch", "participant")` against the dev DB so the app boots in a known empty-Tomi state.

`db:reset` runs `prisma migrate reset --force` against both databases. `db:studio` runs `prisma studio` against the dev DB.

## Seed strategy

Four seed functions, one per stage, mirroring `src/lib/demo-stages.ts buildSnapshot()` row-for-row:

- `seedLaunch()`
- `seedDay3()`
- `seedDay14()`
- `seedCompleted()`

Each one:
1. Truncates Challenge, ChallengeState, Participant, EvidencePacket, EvidenceItem, EvidenceSubmission, AuditResult, FeedPost (in dependency order).
2. Inserts the rows that match what `buildSnapshot(stage, currentUserId)` produces today.
3. Sets `ChallengeState.currentStage` to the seeded stage.

Place them in `src/server/seed/<stage>.ts`.

A `seedAll(stage, role)` orchestrator calls the right one and updates `currentUserId` (i.e., which seeded user is the "active" account for this session).

A `/api/seed?stage=<stage>&role=<role>` route invokes `seedAll` and returns 200. The existing `applyActFromUrl()` in `src/lib/act-url.ts` is rewired to call this endpoint instead of touching localStorage for the world state. (It still writes `dyd:role:v1` for the client-side role context.)

**Idempotency:** running the same `?act=` URL twice produces identical state. Each seed function does its own truncate before insert.

## Server actions — `src/server/actions/*.ts`

Reads (one server action each, return shape matches the existing `src/lib/api.ts` function):

```
getChallenge(id?: string): Promise<Challenge>
getParticipants(challengeId?: string): Promise<Participant[]>
getHypeRanking(challengeId?: string): Promise<RankingEntry[]>
getFeed(challengeId?: string, cursor?: string): Promise<FeedPage>
getMySubmission(challengeId: string, userId: string): Promise<EvidenceSubmission | null>
getAuditQueue(challengeId?: string): Promise<AuditResult[]>
getAuditResult(participantId: string): Promise<AuditResult | null>
getAgents(): Promise<AgentSnapshot[]>     // returns static config from mock-data
getNotifications(): Promise<Notification[]>  // derived
getCurrentUser(): Promise<User>
getDaremasterInsightSent(): Promise<boolean>  // reads ChallengeState
getGrowthInsightSent(): Promise<boolean>      // reads ChallengeState
```

Writes:

```
register(challengeId: string, userId: string): Promise<void>
updateSelfReport(challengeId: string, userId: string, value: number): Promise<Participant>
submitEvidence(challengeId: string, userId: string, draft: EvidenceDraft): Promise<EvidenceSubmission>
postFeedComment(challengeId: string, content: string): Promise<FeedPost>
react(postId: string, kind: ReactionKind): Promise<FeedPost>
adminApprove(participantId: string): Promise<AuditResult>
adminOverrideScore(participantId: string, score: number): Promise<AuditResult>
adminIssueStrike(participantId: string, reason: string): Promise<Participant>
adminDeclareWinner(participantId: string): Promise<Challenge>
sendDaremasterSnapshot(): Promise<void>          // flips ChallengeState flag
sendGrowthInsightSnapshot(): Promise<void>       // flips ChallengeState flag
setFeedPostPinned(postId: string, pinned: boolean): Promise<void>
runAudit(participantId: string): Promise<AuditResult | null>
postDaremasterMessage(post: DaremasterPost, pinned: boolean, cta?): Promise<FeedPost>
```

Special:

```
buildDaremasterSnapshot(): Promise<DaremasterSnapshot>   // assembles from DB
seedAll(stage: DemoStage, role: Role): Promise<void>     // called by /api/seed
resetState(): Promise<void>                              // truncates all tables; called by act-url
```

## `src/lib/api.ts` — what changes, what doesn't

- **Public exports stay the same** so no screen has to be edited.
- The localStorage `state` cache and `hydrate()` go away.
- Each function delegates to the matching server action.
- `generateDaremasterPost`, `getGrowthAssets`, `designChallenge`, `generateAuditTrace` keep their fetch-the-route-then-fall-back shape. They consume DB data via server actions to build the request body, then fetch the existing `/api/agents/...` route.
- `STAGE_NOW` (per-stage anchored "now") stays a client-side constant; client UI uses it for `ago()` formatting only.

If any wrapper genuinely needs a new signature to accommodate server-side data fetching (e.g. dropping a sync-only return type), **stop and escalate before changing it**.

## Test strategy

Stays green untouched:
- `src/app/api/agents/_shared/{anthropic,json,cache,validation}.test.ts`
- `tests/api/agents/*.test.ts`

Rewired:
- `src/lib/api.test.ts` — instead of stubbing `window.localStorage` and mocking `fetch`, mock the server actions with `vi.mock("@/server/actions/...")`. All 20 assertions stay; the harness changes.

Added:
- `tests/seed/<stage>.test.ts` — one smoke test per seed function. Approach: connect to the test database (`DATABASE_URL_TEST`), `TRUNCATE … RESTART IDENTITY CASCADE` the world tables in `beforeEach`, run the seed, query the resulting tables, assert row counts and key invariants:
  - `seedLaunch`: zero participants registered, zero audits, only the launch Daremaster post in the feed.
  - `seedDay3`: Tomi has `selfReportedValue >= 1`, no audits.
  - `seedDay14`: audits exist for the four contenders, `daremasterInsightSent === false`.
  - `seedCompleted`: `Challenge.winnerId === null` initially (admin declares it during the demo); `daremasterInsightSent === true` (the audit handoff is implicit at completed); `growthInsightSent === false`.
- Each seed test uses `prisma.$disconnect()` and a temp DB file in `os.tmpdir()` to stay isolated.

No new server-action unit tests in this round. Their behavior is exercised through the rewired wrapper tests.

## README + docs

`README.md` gets a new "Quick start" section:

```
# one-time setup
docker compose up -d        # ~10s on first boot (pulls postgres:16-alpine)
npm install
npm run db:setup            # runs prisma migrate, creates test DB, seeds empty world

# every dev session
npm run dev
# then visit /?act=gabo:day_14 to populate the DB to the Day 14 state

# inspect the data
npm run db:studio           # opens Prisma Studio at http://localhost:5555
```

Required: **Docker Desktop** (or any Docker engine), Node 20+, npm. The dev server runs on whatever port Next prints (usually 3000); the Postgres container exposes 5433 on the host to avoid collisions with any local Postgres.

Add `npm run db:reset` (drops + re-applies migrations + re-seeds empty), `npm run db:studio` (opens Prisma Studio), `npm run docker:logs` (tails the container — useful when the app says "can't connect to the database" and you need to see why).

`PRODUCT.md` — update the persistence section. The line "Persistence: localStorage only" goes away; replace with the truthful description.

`ARCHITECTURE.md` — replace the "LocalStorage keys" table. Add a new section: "Server-side data layer" describing `src/server/`, the seed scripts, the schema, and `?act=` flow.

`NEXT_STEPS.md` — mark Step 2 done; rewrite Step 3 to point at this file.

`STEP2_QA_LOG.md` — add a "Stage 0 — DB pre-flight" with: `?act=gabo:day_14` produces non-zero rows in the right tables, visible via `npm run db:studio`.

## Acceptance bar

- `docker compose up -d && npm install && npm run db:setup && npm run dev` from a fresh clone produces a working app on a new machine (Docker Desktop assumed installed).
- All four `?act=` URLs (`tomi:launch`, `tomi:day_3`, `gabo:day_14`, `gabo:completed`) seed the DB to the expected state. `npm run db:studio` confirms the rows.
- The visible UI is identical to today (no regression in the recorded demo flow).
- `npm test` green. `npx tsc --noEmit` clean. `git diff --check` clean.
- `prisma/schema.prisma` is the readable canonical artifact for the persistence layer; `prisma/migrations/<timestamp>_init/migration.sql` is the second canonical artifact (raw SQL).
- Manual no-key QA from `STEP2_QA_LOG.md` (with the new Stage 0 pre-flight) passes.
- `PRODUCT.md`, `ARCHITECTURE.md`, `README.md` truthfully describe the new persistence reality.

## Risks + escalation hatches

**Stop and escalate to the user (via the architect) before changing any of the following:**
- Anything in `src/agents/types.ts`.
- Any `/api/agents/*/route.ts` body.
- Any test under `src/app/api/agents/_shared/*.test.ts` or `tests/api/agents/*.test.ts`.
- Any public function signature in `src/lib/api.ts`.
- Anything in `src/lib/demo-stages.ts buildSnapshot()` (it's the spec for the seed functions, not the implementation — it goes away once seed functions exist, but until then it's the contract).

**Bundling pitfall:** Prisma must not bundle to the client. Indicators:
- A `"use client"` file imports `@/server/db` or `@prisma/client` → build fails or app crashes at runtime.
- Server actions can be imported from client files only when the action file starts with `"use server"` and exports async functions only.

**Seed determinism:** if running the same seed twice produces different rows (e.g., `Date.now()` in IDs), it's a bug. Use deterministic IDs from the existing `mock-data.ts`.

**Docker prerequisite failure modes:**
- Docker daemon not running → `db:setup` fails with `Cannot connect to the Docker daemon`. The README's Quick Start must instruct "Docker Desktop must be running."
- Port 5433 occupied → very rare, but if it happens, the container fails to start. Document the override: edit `docker-compose.yml` ports to `"5434:5432"` and `DATABASE_URL` accordingly.
- Volume corruption (rare, after force-quit during migration) → fix is `docker compose down -v && npm run db:setup`.
- First-boot Postgres init takes ~5s after the container is up. The `db:setup` script must wait on `pg_isready` before running migrations or it'll race.

**Test DB hygiene:**
- The test DB (`dyd_test`) lives on the same Docker container as the dev DB. **Tests must connect to `DATABASE_URL_TEST`, never `DATABASE_URL`.** Cross-contamination between dev data and test data is the most likely subtle regression.
- Each seed smoke test starts with a `TRUNCATE TABLE … RESTART IDENTITY CASCADE` against the test DB. Order matters — truncate parent rows by walking the FK graph in reverse, or use `CASCADE`.

**Cuts if behind schedule (in this order):**
1. Skip the seed-function smoke tests; rely on manual confirmation via `npm run db:studio`.
2. Persist only the tables the four agents directly consume (Challenge, Participant, EvidencePacket, EvidenceItem, AuditResult, FeedPost). Keep `getNotifications` and `getAgents` returning derived/static data.
3. Skip rewiring `src/lib/api.test.ts`. Mark the wrapper tests with `it.skip` and a TODO comment; the route + validator + cache tests still cover the agent layer.
4. Defer `PRODUCT.md` / `ARCHITECTURE.md` updates to a follow-up commit; ship with `README.md` accurate.

**Do not** silently fall back to SQLite if Postgres setup gets hard. The user explicitly chose Postgres + Docker for the schema/migration artifact. If Docker is genuinely blocking progress, escalate before swapping engines.

## What stays out of scope

- Real authentication (login, sessions, OAuth).
- Real video transcription / vision analysis upstream of the Audit Assistant.
- Multi-tenant / multi-org / multi-challenge concurrency.
- `MOCK_LIVE=true` runtime mode.
- Daremaster `variantSeed` / regenerate-cache changes.
- Rebuilding the recorded demo.
- Any change to the four agent pure-function implementations under `src/agents/*.ts`.

## Pre-written config artifacts (drop in verbatim)

The Architect has pre-written four files so the implementer can start with
infrastructure already in place. Do not modify these without escalating.

### `docker-compose.yml` (repo root) — already on disk

Postgres 16-alpine, healthchecked, host port `5433`, named volume
`dyd_pg_data` for persistence. To wipe everything: `docker compose down -v`.

### `.env.example` (repo root) — already on disk

Copy to `.env` (the orchestrator script does this on first run). Contains
the `DATABASE_URL` and `DATABASE_URL_TEST` connection strings matching the
docker-compose port mapping.

### `scripts/db-setup.mjs` — already on disk

The orchestrator that backs `npm run db:setup`. Idempotent. Performs:
1. ensures `.env` exists,
2. boots/waits on the Postgres container,
3. applies dev-DB migrations,
4. creates `dyd_test` if missing,
5. applies test-DB migrations,
6. calls `npm run db:seed -- launch participant` (warns and continues if
   the seed CLI isn't wired yet).

### `package.json` — script entries to add

Drop these into the existing `"scripts"` block:

```json
{
  "scripts": {
    "db:setup": "node scripts/db-setup.mjs",
    "db:reset": "docker compose down -v && npm run db:setup",
    "db:studio": "prisma studio",
    "db:seed": "tsx scripts/run-seed.ts",
    "docker:up": "docker compose up -d --wait",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f postgres"
  }
}
```

Plus dev dependencies:

```
prisma             — schema + migrations + studio
@prisma/client     — runtime client (also a regular dependency)
tsx                — TS runner for the seed CLI
```

Add `prisma` as a `devDependency` and `@prisma/client` as a `dependency`
(server bundle needs it).

### `scripts/run-seed.ts` — YOU implement this

The Architect did NOT pre-write this because it depends on the server-side
seed module structure you build under `src/server/seed/`. The contract:

- Invocation: `npm run db:seed -- <stage> <role>`, where stage is one of
  `launch | day_3 | day_14 | completed` and role is `participant | admin`.
- Behavior: parses argv, calls your `seedAll(stage, role)` server function
  against the DB pointed to by `DATABASE_URL`, exits 0 on success.
- Used by: `scripts/db-setup.mjs` (initial seed), seed smoke tests
  (with `DATABASE_URL=$DATABASE_URL_TEST`).

Keep the CLI tiny — argv parsing + one function call + error logging.

## Reporting back

After implementation, report to the user (who relays to the architect):

1. Working tree state: `git status`, `npm test`, `npx tsc --noEmit` results.
2. List of new files (schema, migrations, server actions, seed scripts, README updates).
3. List of rewired files (`src/lib/api.ts`, `src/lib/act-url.ts`, `src/lib/api.test.ts`, plus any docs).
4. Any cuts taken vs the suggested order, with reason.
5. Any escalations or schema decisions you had to make under time pressure.
6. Confirmation that all four `?act=` URLs produce expected DB state (via `npm run db:studio` or a quick query).
