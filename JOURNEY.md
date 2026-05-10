# DYD — How this was built

This is the story of building DYD in five rounds with AI tools, what I (Tomi) tried, and the engineering decisions I'd want a reviewer to know about.

---

## The approach: architect, then implementer

The single most useful pattern across the whole build was splitting the work into two distinct AI roles per round:

- **Architect** — scopes the round, writes a tight implementation plan (~10–20 pages of decisions, file lists, risks, soft-vs-hard constraints), and stops at the plan. Doesn't write code.
- **Implementer** — picks up the architect's plan and executes against it. Doesn't re-decide the scope.

Why bother with the split? Two reasons:

1. **The implementer can't second-guess the plan if the plan is concrete.** When the architect leaves judgment calls unstated, the implementer reinvents them and the work drifts. A good plan is a contract — Anthropic's models follow contracts very reliably.
2. **The architect catches risks the implementer wouldn't see in the moment.** Things like "the no-scores invariant in Daremaster posts must match active-voice as well as passive-voice" or "the daremaster route's 60-second cache means re-generate will silently return the same post" — those land in the plan, not in a code-review pass after the fact.

I rotated roles by hand: same model, different system prompt and different inputs. Each round had a checkpoint commit at the boundary so I could compare what the architect said with what the implementer shipped.

---

## The five rounds

### 1. Product surface

The first round was building the screens — landing, dashboard, ranking, feed, admin review, agents, insights. State lived in `localStorage`. The agents were pure functions (deterministic outputs from typed inputs). The point was to nail down the I/O contracts in `src/agents/types.ts` so later rounds could swap implementations without touching the rest of the app.

### 2. Provider-ready agent layer

Replaced selected agent calls with real LLM routes. The constraint was strict: **the I/O shapes in `src/agents/types.ts` had to stay frozen**. Every route under `src/app/api/agents/...` wraps `callAnthropic`, validates the model's output against a schema, and on any failure (missing key, network, parse, validation) returns an error envelope. The frontend wrapper in `src/lib/api.ts` catches it and falls back to the deterministic implementation.

Two invariants the validators enforce that aren't obvious from the prompts alone:

- **Daremaster posts may not quote numeric audit scores on the public feed.** Both slash forms (`8.7/10`) and active-voice phrasings ("The audit scored Charlie nine out of ten") are blocked.
- **Insight Extractor outputs must be grounded.** Every quote, every named client, every metric in a LinkedIn draft must appear in the input corpus. The validator rejects fabrications.

Caching is in place via `withCache` with single-flight protection. The Daremaster's "Re-generate" button busts cache with a nonce so the user actually gets a new variation.

### 3. Persistence pivot — and why it was actually a testing-strategy decision

Moved world state from `localStorage` to Postgres 16 via Prisma, running in Docker. Container port mapped to 5433 to avoid clashing with any local Postgres install. The four `?act=` URLs each trigger a deterministic seed flow that truncates the owned tables and inserts the right rows for that lifecycle position.

On its face this round was about "make persistence real." In practice the real motivation was testability. Three things became possible only after the pivot:

- **Every assertion about the app's state became verifiable.** With localStorage, the only way to confirm "the audit recorded 9 validated items for Patrick at day 14" was to dump the React state in the console. With Postgres + Prisma Studio, you open a row and read the column. The manual UX walkthrough that closed the project relied on this — each stage had a written checklist of expected DB row counts, and Prisma Studio confirmed or refuted each one. Without that layer, the walkthrough is unverifiable theatre.
- **A second database for tests.** `DATABASE_URL_TEST` points at `dyd_test` on the same Docker container. Seed smoke tests target it without touching dev state. The split is what lets `npm test` make real assertions ("after `seedAll('day_14', 'admin')`, exactly four AuditResult rows exist") instead of stubbed assertions against fake data.
- **A typed query surface that matches the runtime.** Prisma's generated client means every query is checked at `tsc --noEmit`. Mismatches between the schema and the code surface at compile time, not at the moment a query throws in production. That feedback loop is what made the migration safe even though it touched essentially every data-reading path in the app.

Prisma specifically was the right choice over alternatives. Raw SQL would have meant hand-maintaining query/return types and the migration discipline. SQLite was tempting but would have hidden Postgres-specific issues (typing, casing, JSON columns) until deploy. A heavier ORM like TypeORM would have brought in decorators and metadata I didn't want. Prisma's schema-first model with auto-generated client and SQL migrations under `prisma/migrations/` is exactly the production shape, scaled down to a developer laptop.

The pivot preserved the agent layer untouched — the shapes the agents consume didn't change, only where they were assembled from. That clean handoff is what made the round low-risk: existing code didn't need to learn about persistence, only the new `src/server/world.ts` and `src/server/actions/*.ts` modules did.

### 4. Live verification

Built `scripts/test-live-agents.ts` — a single Node script that hits every agent route in sequence from outside the browser, with cost logging. First cold run came in at **$0.0307 across 8 calls**: 2 Daremaster posts (insight + winner), 1 Insight Extractor bundle, 1 Challenge Designer brief, 4 Audit Assistant traces. All validators passed on first attempt — no 502s, no parse failures.

The cost script is the only place real provider calls originate during a release. The discipline: don't put a key in `.env` until the script + cost log are reviewable; don't run the UI live until the script proves the wiring works.

### 5. Manual walkthrough and UX fixes

Final round: actually used the app end-to-end with the key live, against the real database. A handful of UX issues only surface when you're driving the product, not when you're verifying it from outside:

- The Daremaster's "Re-generate" silently returned the cached post for 60 seconds.
- The Insight Extractor's loading state was lost if you navigated away mid-run.
- The Accept Scores button stayed visible after declaring a winner.
- The "Snapshot sent" button didn't revert when the formula was tuned after the send.
- Several notifications and modals popped re-popped on revisits when they had already been actioned.

Every one of these is in the latest commit. The pattern: the live test verifies the API contract; the manual walkthrough verifies the product.

---

## Testing layers

Three layers, each catches different bugs:

### Layer 1 — Mocked-fetch unit tests (Vitest)

137 tests across the agent routes and shared utilities. Every test stubs `globalThis.fetch` so no real provider calls happen. Covers happy paths, validator rejections, missing keys, network failures, JSON parse failures, content invariants, grounding violations. Runs in ~2.5s. This is the contract layer.

### Layer 2 — Live cost-controlled E2E (`npm run test:live`)

Single Node script that runs all four agent routes against the real provider. Records every call's tokens and cost into a session log. Pre-flight mode (no key) returns 503 on every route and exits 0 — that's the safe default. Live mode produces the cost table.

A $15 budget buys ~500 cold runs at Haiku 4.5 prices.

### Layer 3 — Manual walkthrough, verified against the database

I sat down with the app, walked through all four lifecycle URLs, and reported the UX issues I found. The architect (me, with a different hat on) prioritized them and the implementer (also me) shipped the fixes. The walkthrough surfaced ~8 distinct issues that the first two layers couldn't have caught.

The walkthrough was only credible because of Prisma Studio. Each stage's expected state was written down ahead of time (row counts in `Participant`, `EvidencePacket`, `AuditResult`, `FeedPost`, and the active handoff flags on `ChallengeState`); Prisma Studio confirmed or refuted each one. The PASS/FAIL verdict per stage was a fact, not a feeling.

---

## Cost discipline

Three pieces stack up here:

- **`src/app/api/agents/_shared/pricing.ts`** — every supported model with input/output token rates. Single source of truth for cost math.
- **`src/app/api/agents/_shared/costLog.ts`** — module-scoped session log that records every successful provider response (agent name, model, tokens, computed cost, timestamp). Cache hits don't log. Reset at the start of the test-live script.
- **`callAnthropic` in `src/app/api/agents/_shared/anthropic.ts`** — every successful response funnels through `recordCall`. The agent label is required so the cost log knows what each entry represents.

Net effect: you can't make a real provider call from this codebase without it being accounted for. That made the $15 budget feel comfortable instead of nervous.

---

## What I'd do differently

- **Frame the persistence pivot as Step 2.5, not Step 3.** Swapping the data layer after the agent layer was already real meant I had to re-walk every agent route to make sure the new world-builder produced the same shapes. Doing it before the agent layer would have been cleaner.
- **The internal participant id rename (`u-sofia` → `u-tomi`) is still pending.** The user-visible name changed early but the internal id never followed. Zero user-visible impact, so I deferred it. In a longer project I'd have done it the day I made the rename.
- **Persist the Challenge Designer's brief drafts during the round.** Today the only persistence for a draft is the JSON download button I added in the final walkthrough. A real Designer history would let you compare brief drafts, fork them, etc.

---

## Tools used

- Anthropic Claude (Sonnet 4.6 + Haiku 4.5) for both the architect role and the implementer role.
- Next.js 14, React 18, TypeScript strict mode.
- Prisma 6 + Postgres 16 in Docker.
- Vitest for the mocked-fetch suite.
- The native Anthropic Messages API via `fetch` (no SDK — the surface is small enough).
