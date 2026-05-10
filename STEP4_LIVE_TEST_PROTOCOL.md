# Step 4 — Live Agent Test Scaffolding

This step wires real Anthropic calls into the project for the first time. The user has obtained an `ANTHROPIC_API_KEY` with a **$15 cost ceiling**. The deterministic no-key fallback path remains the demo's actual ship surface; this step proves the dormant provider path actually works end-to-end before the final user-experience walkthrough.

The first real API call must come from a single end-to-end test script — **not** from a hand-clicked browser test. The script is the discipline that protects the budget.

---

## Reading order before you start

1. `NEXT_STEPS.md` — the four-step plan; you're now in Step 4 (live-agent test scaffolding).
2. **This file** — the active spec.
3. `STEP3_PERSISTENCE_PIVOT.md` and `STEP2_TESTING_PROGRAMMATIC.md` — for context on what just landed and how the test suite is shaped.
4. `PRODUCT.md`, `ARCHITECTURE.md` — current state of the world.
5. `src/app/api/agents/_shared/anthropic.ts` — the file you'll surgically modify.
6. `src/app/api/agents/_shared/pricing.ts` — pre-written. Read but do not change unless prices need updating.
7. `src/app/api/agents/_shared/costLog.ts` — pre-written. Read but do not change.
8. `scripts/test-live-agents.ts` — pre-written skeleton with TODO markers. **Your main implementation surface.**
9. `src/app/api/agents/*/route.ts` — the four route handlers. You'll add a single line to each (passing the agent label to `callAnthropic`).
10. `src/server/actions/agents.ts` — the agent-input builders the script uses to assemble request bodies.
11. `tests/api/agents/*.test.ts` — existing route tests. **All must stay green untouched.**

---

## Goal of this round

Make it possible to run **one command** that exercises every live-API path end-to-end against the real Anthropic provider, with a per-call cost report at the end. Demos still ship on the deterministic fallback; this is the proof the provider-ready path actually works.

Concretely:

- Real Anthropic calls happen only from `scripts/test-live-agents.ts`.
- Every call records its model, agent name, input tokens, output tokens, and computed cost into a session log.
- The script's output is a readable cost report + per-call status + raw model output for any failed call (so you can triage without re-running).
- The cold first run produces a baseline cost number we trust ("an end-to-end pass costs ~$X"); subsequent runs target only the failing agent (`--only daremaster`).

The user does **not** add `ANTHROPIC_API_KEY` to `.env` until the script is complete and you've confirmed the cost-log wiring is correct via a dry run.

---

## Hard constraints — escalate to the user before violating any of these

- Do not modify `src/agents/types.ts` or any contract.
- Do not modify any `src/app/api/agents/*/route.ts` body **except** to add `agent: "<name>"` to its existing `callAnthropic` call.
- Do not modify any test under `src/app/api/agents/_shared/*.test.ts` or `tests/api/agents/*.test.ts`. They must stay green untouched.
- Do not modify `src/lib/api.ts` public function signatures.
- Do not modify the persistence layer (`src/server/*`, `prisma/*`, seed scripts). Read-only this round.
- Do not modify `src/app/api/seed/route.ts`.
- Do not change pricing values in `src/app/api/agents/_shared/pricing.ts` without architect/user approval — the values were verified against Anthropic's pricing page on **2026-05-10**.
- Do not run any real Anthropic call until the cost log + script are reviewable end-to-end. The user will explicitly say "add the key now" — wait for that signal.
- Do not add tests that require a real API key to pass. Mock-fetch tests stay the test suite's foundation.

---

## Decisions already made

| | |
|---|---|
| **Cost ceiling** | $15 total. Estimated per cold E2E run: ~$0.04 with Haiku 4.5. Headroom for 350+ runs. |
| **Default model** | `claude-haiku-4-5`. Plenty for the current prompts. Sonnet/Opus only if a specific agent's quality demands it (escalate). |
| **Where the key lives** | `.env` at repo root, key name `ANTHROPIC_API_KEY`, optional override `ANTHROPIC_MODEL`. Format already documented in `.env.example`. The user adds it just before the cold first run. |
| **Where real calls originate** | Only `scripts/test-live-agents.ts`. Browser clicks during demos still hit the fallback path because the user holds the key off-machine until script is ready. |
| **Cost log scope** | Module-scoped in-memory log. Lives for the lifetime of the Node process. The script resets it at start and prints it at end. No persistence across runs. |
| **What gets logged** | Every successful provider response (even if validation fails afterward — we still got billed). Cache hits are NOT logged (they cost $0 and clutter the report). |
| **Failure-mode UX** | The script prints the first ~200 chars of the model's raw output for any 502 (validation failure). No re-runs needed to triage. |
| **Test suite** | Stays green untouched. Mocked fetch architecture is the foundation. No live integration tests in CI. |
| **Pre-written artifacts on disk** | `src/app/api/agents/_shared/pricing.ts`, `src/app/api/agents/_shared/costLog.ts`, `scripts/test-live-agents.ts` skeleton. Drop-in ready; do not rewrite. |

---

## Pre-written artifacts (drop in verbatim — already on disk)

The Architect has pre-written three files so you start with the load-bearing skeletons in place. Do not rewrite them; finish the TODOs marked in each.

### `src/app/api/agents/_shared/pricing.ts`

Pricing constants for the three current Claude models (verified 2026-05-10) plus `costFor(model, inputTokens, outputTokens)` helper. Untouched by you unless prices need updating.

### `src/app/api/agents/_shared/costLog.ts`

Module-scoped session log. Exports `recordCall(record)`, `getSessionLog()`, `resetSessionLog()`, `totalCost()`. Untouched by you.

### `scripts/test-live-agents.ts`

Skeleton with CLI flag parsing, output formatting, and the cold-run flow scaffold. **Your main implementation surface.** Each TODO comment marks where live-call wiring goes.

---

## Implementation order

### Day 1 — Cost observability + script wiring

1. **Modify `src/app/api/agents/_shared/anthropic.ts`** — extend `CallOptions` with a required `agent: string` field. Inside the function, parse `usage` from the Anthropic response (it carries `input_tokens` and `output_tokens`). After validating the response is non-empty but before returning the text, call `recordCall({ agent, model, inputTokens, outputTokens, cost })` with the cost computed via `costFor()`. **The cost log records every successful provider response, even if the route's downstream validator rejects the content.**

2. **Update each of the four route handlers** to pass an agent label to `callAnthropic`:
   - `src/app/api/agents/daremaster/route.ts` → `agent: "daremaster"`
   - `src/app/api/agents/insight-extractor/route.ts` → `agent: "insight-extractor"`
   - `src/app/api/agents/challenge-designer/route.ts` → `agent: "challenge-designer"`
   - `src/app/api/agents/audit-assistant/trace/route.ts` → `agent: "audit-trace"`

   Single-line addition per route. Do not change any other behavior.

3. **Update `src/app/api/agents/_shared/anthropic.test.ts`** — every existing test calls `callAnthropic({ system, user })`. Add `agent: "test"` to each. The 8 tests stay green; only the inputs change.

4. **Update the four route tests** the same way only if the existing tests inspect the outbound body shape (most don't). Ideally zero changes here.

5. **Run `npm test`.** All 137 tests green. **Run `npx tsc --noEmit`.** Clean.

### Day 1 — Wire the script

6. **Implement the script's TODOs** in `scripts/test-live-agents.ts`:
   - Import `seedAll` from `@/server/seed` and call it before each agent block.
   - Import the agent-input builders from `@/server/actions/agents` (`buildDaremasterSnapshot`, `buildDaremasterSnapshotWithAudit`, `getInsightInput`, `getAuditTraceInput`).
   - Import `sendDaremasterSnapshot`, `sendGrowthInsightSnapshot`, `adminDeclareWinner` for the handoff-flag flips.
   - Import each route's `POST` from `@/app/api/agents/<name>/route`.
   - For each agent, call POST with a Request body built from the server-action output, capture the response, log status + cost.

7. **Wire the report formatter.** When the run finishes, call `getSessionLog()` and `totalCost()`. Print the table format described in the script comments.

8. **Add a "no key, dry run" mode.** The script must work with no key present: every route call returns 503, the report shows "0 calls / $0.00." This is the script's pre-flight check before the user adds the key.

9. **Add `npm run test:live`** in `package.json` mapping to `tsx scripts/test-live-agents.ts`. Optional flags `--only <agent>` and `--json` are wired in the skeleton.

### Day 1 — Dry-run review

10. **Run `npm run test:live` with no key.** The output should show:
    - All four agents attempted (or filtered by `--only`).
    - All four return 503 (the route's missing-key path).
    - Cost report: 0 calls, $0.00.
    - Exit code 0.

    This proves the wiring works without burning a single token. **STOP HERE and report back to the user.**

### Day 2 — Cold first live run (under user supervision)

11. **The user adds the key to `.env`** at this point. Not before.
12. **Run `npm run test:live` once.** Report the output verbatim. Do not iterate without architect/user review.
13. **If failures appear:** the report shows the failing agent + model output snippet. Fix per failure (most likely: prompt tweak, validator regex, fixture-grounding logic). Re-run with `--only <agent>` for cheap iteration.
14. **When all agents return 200 cleanly,** run the full script once more to confirm regression-free. That's the green checkpoint.

---

## The script's run flow

What the implemented script does, step by step:

```
1. parseArgs (--only, --json, --no-reset)
2. resetSessionLog()
3. for each agent in [daremaster, insight-extractor, challenge-designer, audit-trace]:
     skip if --only <other>
     case daremaster:
       seedAll("day_14", "admin")
       sendDaremasterSnapshot()       // flip the flag in DB
       snapshot = buildDaremasterSnapshotWithAudit()
       call daremasterRoute.POST({ snapshot, mode: "insight" })
       seedAll("completed", "admin")
       adminDeclareWinner("p-patrick")
       snapshot = buildDaremasterSnapshotWithAudit()
       call daremasterRoute.POST({ snapshot, mode: "winner" })
     case insight-extractor:
       seedAll("completed", "admin")
       adminDeclareWinner("p-patrick")
       input = getInsightInput()
       call insightExtractorRoute.POST(input)
     case challenge-designer:
       call designerRoute.POST({ prompt: "A LinkedIn post about a deal we just closed" })
     case audit-trace:
       seedAll("completed", "admin")
       for participantId in [p-patrick, p-bob, p-alice, p-charlie]:
         input = getAuditTraceInput(participantId)
         call auditTraceRoute.POST(input)
4. printReport(getSessionLog(), totalCost())
```

The script must be deterministic in its setup so re-runs hit the cache for already-seen inputs. That's how cheap iteration works: first run pays for everything; failure-loop runs only re-pay for the changed agent.

---

## Output format

After every run, print:

```
=== DYD live-agent test report ===
2026-05-XX HH:MM:SSZ

Agent                  Status  Model               In tok  Out tok  $        Cum $
daremaster:insight     200     claude-haiku-4-5    1,234     180    0.0021   0.0021
daremaster:winner      200     claude-haiku-4-5    1,189     175    0.0020   0.0041
insight-extractor      200     claude-haiku-4-5    3,420   1,623    0.0115   0.0156
challenge-designer     200     claude-haiku-4-5      720   1,810    0.0098   0.0254
audit-trace:patrick    200     claude-haiku-4-5    2,100     412    0.0033   0.0287
audit-trace:bob        200     claude-haiku-4-5    2,340     485    0.0036   0.0323
audit-trace:charlie    200     claude-haiku-4-5    1,890     380    0.0030   0.0353
audit-trace:alice      200     claude-haiku-4-5    1,920     395    0.0031   0.0384

TOTAL THIS RUN:       8 calls   $0.0384
```

Failure rows show the response status and the first ~200 chars of the model's raw output (truncated):

```
daremaster:insight     502     claude-haiku-4-5    1,234     180    0.0021   0.0021
  > validation_failed: content tripped score-leak guard
  > raw output: '{"trigger":"quality_threat","content":"Patrick is at 95 out of 100…'
```

The `--json` flag emits the same data as JSON for programmatic parsing.

---

## Test rules

- All 137 existing tests stay green untouched (the agent-label addition might require a one-line update to the 8 `anthropic.test.ts` tests if they assert on the request body shape — that's the only allowed test change).
- No new tests added in this round. The script *is* the test for the live path.
- `npm test` passes regardless of whether the key is set, because tests mock `fetch`.
- `npx tsc --noEmit` clean.
- `git diff --check` clean.

---

## Acceptance bar

- `npm install && npm run db:setup && npm run test:live` (with no key) returns 0 calls / $0.00 / all-503 status.
- After the user adds the key, `npm run test:live` returns all-200 status and a cost report under $0.10.
- Failure dump shows raw model output snippets so triage doesn't require re-runs.
- `--only <agent>` filter works for cheap iteration.
- `--json` output is parseable.
- Existing tests all green. Type-check clean.
- README's "What activates with a key" section updated with the actual cold-run cost number once we have it.

---

## Risks + escalation hatches

- **Accidental cost burn during dev:** if you set the key in your shell while developing, every browser click on `Generate next post` (insight/winner) burns tokens. Discipline: don't set the key until the script is ready.
- **Cache leakage between runs:** the cost log resets at script start, but the Anthropic response cache (`withCache` in `src/app/api/agents/_shared/cache.ts`) lives until the Node process dies. If you run the script via `tsx`, each invocation is a fresh process — cache is empty. Good. If you ever wrap the script in a long-lived watcher, that breaks.
- **Validation thrash:** if a validator regex is overly strict, the model's first response gets rejected as 502 and the script reports failure. Fix at the validator/prompt level, not by running the same call repeatedly.
- **Rate limits:** unlikely at our call volume, but if you see a 429, the script should fail loudly and stop — don't retry blindly. Anthropic's per-minute limits are generous; if we trip them, something's wrong (probably an unintended retry loop).
- **Pricing drift:** the constants in `pricing.ts` were verified 2026-05-10. If the report numbers look weird, re-verify against the live pricing page before assuming it's a bug.

**Escalate to the user before:**
- Adding any new dependency.
- Changing any agent prompt or validator beyond a regex tweak that closes a real leak.
- Altering test files outside the one-line agent-label addition in `anthropic.test.ts`.
- Adding any retry / backoff logic. The cold-run discipline is "fail loudly, fix, re-run."

---

## Reporting back format

After Day 1 (dry run with no key):

1. List of files modified (anthropic.ts + 4 routes + 1 test file at most).
2. `npm test` total + `npx tsc --noEmit` status + `git diff --check` status.
3. Output of `npm run test:live` (with no key, all 503s, $0.00 cost).
4. Confirmation that `--only daremaster` and `--json` flags work as designed (run twice, paste both outputs).
5. **STOP** and wait for user/architect signal before any live call.

After Day 2 (cold first live run, only after user signal):

1. The full report output verbatim.
2. Total cost spent.
3. Any 502s with raw model output snippets.
4. Per-failure proposed fix (one sentence per).
5. **STOP** and wait for architect review before applying fixes.
