# CLAUDE.md — orientation for Claude Code sessions

This file is loaded automatically by Claude Code at the start of a session in this repo. It exists so any future Claude — including a fresh one on a different account — can pick up the project without the user re-explaining anything.

## What this project is

DYD ("Do You Dare") is an internal growth-challenge platform for BairesDev. Employees register for time-boxed Dares, self-report progress on a public Hype Ranking, and submit evidence. Four AI agents — Daremaster, AI Audit Assistant, Growth Insight Extractor, Challenge Designer — handle the operational work. An admin orchestrates them.

The product spec, agent contracts, scoring formula, and lifecycle stages are all documented in `README.md`. Read that first.

## Where to read for context

In this order:

1. **`README.md`** — what DYD is, how to run it, the lifecycle URL system, what's built vs stubbed.
2. **`ROADMAP.md`** — what's still needed for production. Helpful when the user is talking about a feature that doesn't exist yet.
3. **`JOURNEY.md`** — how the project was built. The architect-implementer pattern, the testing layers, the cost discipline. Useful for understanding *why* certain decisions were made.

## Conventions that matter

- **No "demo", "mock", "prototype", or "simulated" wording in user-visible UI or markdown docs.** The implementation history is not the product. Internal code comments are fine.
- **No numeric audit scores in Daremaster posts.** The validator enforces it; if you're tempted to soften the check, don't — that invariant exists because the user explicitly required it.
- **Default to no comments in code.** Only annotate non-obvious *why*. Don't narrate what code does.
- **Brief end-of-turn summaries.** One or two sentences on what changed. No headers and sections for simple tasks.
- **Don't run `next build` to verify changes.** It writes prod chunks under `.next/` that confuse the running dev server. Use `npm run typecheck` and `npm test`.
- **`?act=` URLs** are the canonical way to set the app's state — never edit the database directly to reach a lifecycle stage.
- **`.env` is gitignored.** Never commit a real `ANTHROPIC_API_KEY`. `.env.example` is the template.

## Quick smoke test

After any structural change, this should still work:

```bash
npm test            # 137 tests, ~2.5s
npm run typecheck   # tsc --noEmit, clean
npm run dev         # then open the URLs below
```

UI smoke:

1. `/?act=tomi:launch` — Tomi lands unregistered, locked tabs visible.
2. `/?act=tomi:day_3` — Tomi can submit a testimonial; ranking re-sorts.
3. `/?act=gabo:day_14` — Admin sees the formula panel and the snapshot view.
4. `/?act=gabo:completed` — Admin can review, declare a winner, run insights.

## File pointers for common tasks

- **Touching an agent's contract** → `src/agents/types.ts`. Every shape there is consumed by both the deterministic fallback and the live route's validator.
- **Adding or modifying a Daremaster trigger / post variant** → `src/agents/daremaster.ts` for the deterministic side, `src/app/api/agents/daremaster/route.ts` for the live side, `src/app/api/agents/_shared/validation.ts` for the schema check.
- **Scoring math** → `src/lib/formula.ts`. The displayed final score everywhere flows through `effectiveFinalScore(audit, formula)`.
- **The lifecycle seed** → `src/lib/demo-stages.ts` is the source of truth for what the world looks like at each stage. The server seeds in `src/server/seed/*.ts` translate it into Postgres rows.
- **The act URL parser** → `src/lib/act-url.ts`. Calls `/api/seed` then strips the query param and reloads.
- **State broadcasting** → `dyd:state-changed` is the window event clients listen to after every mutation. Sidebar lock state, agent handoff notes, and the notification bell all subscribe.
- **Live agent verification** → `scripts/test-live-agents.ts`. Single entry point for real provider calls. Pre-flight with no key returns 503 across the board and costs $0.

## Active conventions in the data model

- **`Challenge.winnerId`** is the source of truth for "the admin declared a winner."
- **`ChallengeState.daremasterInsightSent`** flips when the admin sends the audit snapshot at day_14.
- **`ChallengeState.growthInsightSent`** flips when the admin ships the growth bundle at completed.
- **`ChallengeState.currentUserId`** is the active account. Set by the `?act=` flow.
- The localStorage keys cleared by `resetState()`: `dyd:formula:v1`, `dyd:formula-last-sent:v1`, `dyd:insight-bundle:v1`, `dyd:admin-review-opened:v1`. If you add another piece of client-only state that should reset between `?act=` invocations, add it to that list.

## Working on this project

The user (Tomi) ran the build by rotating between Architect and Implementer roles — same model, different system prompts and inputs. If you're stepping into a fresh session, the user will tell you which role to play. Default behavior: ask which role we're in if it isn't obvious from the request.

If anything in this file conflicts with reality, fix the file.
