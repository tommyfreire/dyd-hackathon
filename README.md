# DYD — Do You Dare

An internal growth-challenge platform for BairesDev. The company runs time-boxed Dares ("collect client testimonials in 14 days"), employees register, self-report progress on a public Hype Ranking, and submit evidence. The winner is decided by an admin-supervised AI audit. The whole loop is wrapped in social mechanics — a feed, a leaderboard, reactions — and the operational work is handled by four AI agents.

The pitch: most automation-first products try to remove the human from the loop. DYD flips it — the **game** is what makes employees show up; the **AI** is what makes the game scale to the whole company.

---

## Quick start

Requirements: Node 20+, npm, and Docker Desktop running.

```bash
npm install
npm run db:setup
npm run dev
```

Open the URL Next prints (usually <http://localhost:3000>). The setup script starts Postgres 16 in a container, applies Prisma migrations, creates both the dev and test databases, and seeds the starting state.

Common commands:

```bash
npm run dev           # start the app
npm test              # run the test suite (137 tests)
npm run typecheck     # tsc --noEmit
npm run db:studio     # browse the DB in Prisma Studio
npm run db:reset      # wipe the Docker volume and re-seed
```

Don't run `next build` to verify changes — it writes prod chunks under `.next/` that confuse the running dev server. Use `npm run typecheck` instead.

---

## Environment

`npm run db:setup` copies `.env.example` to `.env` if needed. Defaults match `docker-compose.yml`:

```
DATABASE_URL=postgresql://dyd:dyd@localhost:5433/dyd?schema=public
DATABASE_URL_TEST=postgresql://dyd:dyd@localhost:5433/dyd_test?schema=public
```

The four agents run on a deterministic fallback path by default — no provider key required, the app is fully usable as-is. To switch on the live LLM path, add an Anthropic key:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5    # optional; default is fine
```

Both must be plain server-side env vars. Never prefix with `NEXT_PUBLIC_`. `.env` is gitignored.

To verify the live path end-to-end without clicking through the UI:

```bash
npm run test:live
```

This script hits all four routes from Node, prints a per-call cost table, and exits 0 on success. With no key set, every route returns 503, total cost is $0, and the script still exits 0 — that's the pre-flight check.

---

## Database, data model, and testing

DYD runs on Postgres 16 in Docker, accessed through Prisma. The container port is mapped to host 5433 to avoid clashing with any locally-installed Postgres. Two logical databases live on that container: `dyd` for the running app and `dyd_test` for the automated seed-smoke tests.

### Schema

Nine tables, defined in `prisma/schema.prisma`:

| Table | Purpose |
|---|---|
| `User` | Tomi, Gabo, and the seeded competitor users. |
| `Challenge` | DYD #001 metadata, deadlines, rules, audit contract, `winnerId`. |
| `ChallengeState` | Active lifecycle stage, current user, handoff flags (`daremasterInsightSent`, `growthInsightSent`). |
| `Participant` | Registration, self-reported count, hype rank, badges, evidence status. |
| `EvidencePacket` / `EvidenceItem` | Structured corpus the agents read from. |
| `EvidenceSubmission` | Per-form-submission rows from the participant dashboard. |
| `AuditResult` | Audit Assistant output — quality score, validated/rejected counts, flags, rubric breakdown, score-receipt trace, admin overrides. |
| `FeedPost` | Social feed posts: reactions, pin state, CTA metadata. |

Some UI-only state stays in `localStorage` by design: the per-browser formula tuning (`dyd:formula:v1`), and a handful of "have I seen this?" flags (`dyd:admin-review-opened:v1`, `dyd:formula-last-sent:v1`, `dyd:insight-bundle:v1`). The CLAUDE.md file lists them in full.

### Working with the database

```bash
npm run db:setup       # idempotent: start Docker, apply migrations, seed both DBs
npm run db:studio      # Prisma Studio — browse and edit rows in the dev DB
npm run db:reset       # wipe the Docker volume, re-migrate, re-seed
npm run db:seed -- <stage> <role>   # re-seed to a specific lifecycle stage
npm run docker:up / docker:down / docker:logs
```

Schema changes: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <description>`. Migrations land under `prisma/migrations/` as raw SQL — those files are the artifact, the schema is the source.

### Why Prisma (not raw SQL, not SQLite, not localStorage)

The persistence layer carries more weight than just "make the world durable." Three reasons it had to be a real database with a real ORM:

1. **Verifiable state at every lifecycle stage.** The four `?act=` URLs each seed deterministic rows. Prisma Studio lets you inspect every row at every stage — that's how the manual UX walkthrough was verified ("Day 14 has 4 audit results, validatedItems = 9, 8, 6, 0 across the participants"). Without that, the walkthrough is theater.
2. **A separate test database.** `DATABASE_URL_TEST` points at `dyd_test` on the same container. Seed smoke tests run against it without touching dev state. The split lets the test suite assert real row counts and shapes, not stubbed return values.
3. **Production-shaped from day one.** Prisma's generated client gives type-safe queries that match the runtime — bugs caught at `tsc --noEmit` instead of at runtime. The schema + migrations file pattern is what production deployments need anyway; doing it locally first means there's nothing to throw away.

The Docker port-mapping decision (5433 not 5432) is small but matters: any developer with a local Postgres install can clone this repo without uninstalling their own database.

### Testing

Three layers, each catches a different class of bug:

1. **`npm test` — 137 mocked-fetch unit tests** (Vitest, ~2.5s). Stubs `globalThis.fetch` so no real provider calls happen. Covers happy paths, validator rejections, missing keys, network failures, parse failures, content invariants (e.g. no audit scores in Daremaster posts), grounding violations (e.g. Insight Extractor inventing clients).
2. **`npm run test:live` — live cost-controlled E2E** (Node script, ~10s with a key, ~0.5s without). Hits every agent route against the real provider, records per-call tokens and cost. Pre-flight mode (no key) returns 503 across the board and exits 0 — that's the safe default.
3. **Manual walkthrough at each `?act=` URL.** Drives the product as the actual user would. The DB state at each stage is inspectable via `db:studio`.

The story behind why this layering exists is in [JOURNEY.md](./JOURNEY.md).

---

## Explore the app

DYD challenges run on a timeline: launch → registration → submissions → audit → winner → growth assets. You can land at any point on that timeline by passing `?act=` in the URL. Each URL also sets the account viewing the app.

| URL | Who's viewing | Where in the lifecycle |
|---|---|---|
| `/?act=tomi:launch` | Tomi (participant) | The Dare just dropped. Tomi hasn't accepted yet. |
| `/?act=tomi:day_3` | Tomi (participant) | Three days in, ready to submit a first testimonial. |
| `/?act=gabo:day_14` | Gabo (admin) | Mid-challenge. Time to tune the scoring formula and brief the Daremaster. |
| `/?act=gabo:completed` | Gabo (admin) | Submissions closed. Final review, winner, growth report. |

Each URL resets the database to that point in the lifecycle, then strips the parameter from the address bar. Clean state, every time.

Optional flags pre-flip the agent-handoff state:

- `:hype` — at day_14, marks the audit snapshot as already shipped to the Daremaster
- `:growth` — at completed, marks the Growth Insight Extractor bundle as already shipped

Combine with commas: `/?act=gabo:completed:hype,growth`.

### Suggested walkthrough

1. **Land as a participant**: `/?act=tomi:launch`. Tomi sees the Dare landing page, the Daremaster's launch video, and locked tabs (Hype Ranking / Feed / Dashboard). Click **I Dare** to accept — the tabs unlock instantly.
2. **Submit evidence**: `/?act=tomi:day_3`. Open `/dashboard`, fill the form, upload the testimonial. The count auto-bumps, the Hype Ranking re-sorts.
3. **Become the admin mid-challenge**: `/?act=gabo:day_14`. Open `/admin`. Tune the quality-vs-quantity slider and the per-criterion rubric weights. Click **Send snapshot to Daremaster**. Open `/agents`, hit **Generate next post** on the Daremaster card — the post reflects the audit findings. Accept the draft and pin it.
4. **Close the challenge**: `/?act=gabo:completed`. Open `/admin`, review submissions, override a score if you want, click **Accept Scores**, declare the winner. Open `/insights`, run the Growth Insight Extractor, ship the bundle to the Daremaster. Back to `/agents`, generate the winner-announcement post.
5. **Try the Challenge Designer**: at any admin-stage URL, open `/agents`, click the Designer card, type a one-line growth idea, draft a brief.

---

## What's built

| Surface | Status |
|---|---|
| Participant landing, registration, Hype Ranking, Feed, Dashboard | Fully built |
| Admin review (formula tuning, rubric editor, score overrides, score acceptance, winner declaration) | Fully built |
| Daremaster post generation (`insight` + `winner` modes) | Live LLM with deterministic fallback |
| Growth Insight Extractor (quotes, case studies, snippets, LinkedIn drafts) | Live LLM with deterministic fallback |
| Challenge Designer (one-line idea → full brief) | Live LLM — the brief itself is real; **Publish DYD #002 is a stub** that opens an explainer + lets you download the brief as JSON. The full publish pipeline is in [ROADMAP.md](./ROADMAP.md). |
| AI Audit Assistant (rubric scoring, flags, recommendation) | Deterministic scoring is authoritative; the human-readable score-receipt **trace** can be rewritten by the live LLM path. |
| Auth | Mocked. Two seeded users (Tomi, Gabo). Real SSO is on the roadmap. |
| Persistence | Real local Postgres via Prisma. The `?act=` URLs seed deterministic rows. |
| Notifications | In-DB only — no email, no Slack, no push. On the roadmap. |
| Evidence uploads | The form accepts a file but the upload itself is not persisted to object storage. On the roadmap. |

If you run without `ANTHROPIC_API_KEY`, every agent surface still works — the deterministic fallback produces a fixed response. The wiring is the same; the model is just a function under the hood.

---

## The four agents

**Daremaster** — composes feed posts that reflect the current state of the challenge. The same persona narrates the launch video. Mode selection (`trivial` / `insight` / `winner`) is driven by the admin's handoff actions. The server-side validator forbids quoting numeric audit scores on the public feed.

**AI Audit Assistant** — scores each evidence packet against the rubric, flags issues, recommends approve/reject/needs-clarification. The admin keeps final-decision authority and can override any score. The scoring math is deterministic (lives in `src/agents/audit-assistant.ts`) so the result is auditable; the human-readable trace can be rewritten by the live LLM for readability.

**Growth Insight Extractor** — mines the approved corpus into reusable marketing assets after the winner is declared. Output: top quotes, case-study leads, sales snippets, LinkedIn drafts. The server validator grounds every quote against the input corpus so the model can't invent clients, metrics, or quotes.

**Challenge Designer** — turns a one-line growth objective into a complete brief: title, rules, deadlines, rubric, evidence requirements, Daremaster launch script. The brief is fully editable in the UI.

---

## Project layout

```
src/
├── app/                          Next.js routes
│   ├── api/agents/              Provider-ready agent routes
│   └── api/seed/                Lifecycle-seed endpoint
├── components/
│   ├── screens/                 One file per page
│   ├── shell/                   TopBar, Sidebar, NotificationBell, AppShell
│   └── ui/                      Modal, Avatar, Toast, Icon
├── agents/                      Pure-function agent layer (deterministic fallbacks)
├── lib/                         api.ts (screen-facing), formula.ts, act-url.ts, types
├── server/
│   ├── actions/                 "use server" action modules
│   ├── seed/                    Per-stage seed functions
│   ├── db.ts                    Prisma singleton
│   └── world.ts                 DB mapping + persistence + agent input assembly
└── styles/                      tokens.css, components.css, globals.css

prisma/                          Schema + SQL migrations
scripts/                         db-setup, db-seed, test-live-agents, audit-check
public/                          Static assets
```

---

## More

- [ROADMAP.md](./ROADMAP.md) — what's still needed to take DYD to production.
- [JOURNEY.md](./JOURNEY.md) — how the project was built (architect-implementer pattern, testing layers, cost discipline).
- [CLAUDE.md](./CLAUDE.md) — orientation for Claude Code sessions in this repo.
