# DYD Step 2 Programmatic Test Plan

This is the automated, assert-level layer for Step 2. It is a sibling to `STEP2_TESTING_PLAN.md`, which remains the manual / acceptance layer. I am not appending this to the manual file because the programmatic plan is long enough to make the clickthrough plan harder to use.

No test code is included here. This is the execution plan for the coding implementer.

## One-Page Summary

- **Runner:** Vitest, pinned to `vitest@3.2.4` for the hackathon branch. It is stable, fast, TS-native, ESM-friendly, and supports `vi.mock`, fake timers, and direct route-function tests without a browser.
- **Test script:** add `npm test` as `vitest run`; optional `npm run test:watch` as `vitest`.
- **Environment:** `node`. No jsdom, no React component tests, no E2E, no Playwright, no visual regression, no perf benchmarks.
- **Route testing:** import each route handler's exported `POST` and call it directly with a `Request`. Do not boot Next.js and do not start a server.
- **Anthropic mocking:** mock `globalThis.fetch` for Anthropic HTTP. Do not mock `callAnthropic` in route tests; route tests should exercise route + `anthropic.ts` + `json.ts` + `validation.ts` together.
- **Real keys:** automated tests must pass identically with `ANTHROPIC_API_KEY` unset or set to a real key. Every test controls `process.env.ANTHROPIC_API_KEY` internally and mocks fetch; no live suite and no key-gated tests.
- **Submission framing:** the hackathon build will not be exercised against a real Anthropic key. The deterministic no-key fallback is the actual demo path; mocked-provider tests are the trust artifact for the dormant provider-ready path.
- **Mock realism:** LLM response fixtures must represent likely model drift, not only clean happy paths: fenced JSON, prose preambles, trailing commentary, mild schema drift, partial grounding failures, and near-miss score leaks.
- **File layout:** co-locate `*.test.ts` next to `_shared/*.ts` and `src/lib/*.ts`; mirror route tests under `tests/api/agents/<agent>.test.ts`; fixtures live in `tests/fixtures/*.ts`.
- **Path alias:** Vitest config must expose `@/` as `<repoRoot>/src/`, matching `tsconfig.json`.
- **Coverage model:** tier-driven, not numeric. Tier 1 protects product invariants and LLM failure boundaries; Tier 2 broadens fallback/cache/parser coverage; Tier 3 is nice-to-have pure-function coverage.
- **Explicit cuts:** no React component unit tests this round. Existing manual acceptance plan remains the UI safety net.

## Tier Table

### Tier 1 — Must Land

| Item | File(s) | Why |
|---|---|---|
| Daremaster score-language rejection | `src/app/api/agents/_shared/validation.test.ts` | Public feed must never leak audit/formula/rubric scores. |
| Daremaster valid/sanitized post validation | `src/app/api/agents/_shared/validation.test.ts` | Route safety depends on this guard. |
| Growth grounding pass/drop/fallback validation | `src/app/api/agents/_shared/validation.test.ts` | Prevents fabricated marketing assets while preserving useful partial output. |
| Challenge brief normalization | `src/app/api/agents/_shared/validation.test.ts` | Protects editable brief shape and audit contract mirroring. |
| Audit trace authority/video-analysis rejection | `src/app/api/agents/_shared/validation.test.ts` | Keeps partial-live Audit Assistant from claiming unsupported authority. |
| `extractJson` clean/fenced/prose-wrapped parsing | `src/app/api/agents/_shared/json.test.ts` | All route success paths rely on parsing model text. |
| `callAnthropic` missing-key and mocked-success behavior | `src/app/api/agents/_shared/anthropic.test.ts` | Ensures no real calls and correct request envelope. |
| Realistic mocked LLM drift fixtures | `tests/fixtures/llmResponses.ts` | Replaces live-key verification as the proof surface for provider readiness. |
| Daremaster route happy + missing key + score leak + cache identical-input behavior | `tests/api/agents/daremaster.test.ts` | Highest-risk live public output. |
| Growth route happy + validation failure + empty corpus | `tests/api/agents/insight-extractor.test.ts` | Verifies live extractor and fallback-triggering failures. |
| Challenge Designer route happy + injection prompt with valid response + invalid model output | `tests/api/agents/challenge-designer.test.ts` | Guards schema despite hostile prompt content. |
| Audit trace route happy + invalid trace + missing key | `tests/api/agents/audit-assistant-trace.test.ts` | Confirms trace-only route cannot mutate scoring. |
| `generateDaremasterPost` no-key/trivial fallback and score-free deterministic insight | `src/lib/api.test.ts` | Wrapper protects the demo beat without server boot. |

### Tier 2 — Land If Time

| Item | File(s) | Why |
|---|---|---|
| `cache.ts` stable hash, single-flight, TTL expiry | `src/app/api/agents/_shared/cache.test.ts` | Prevents runaway provider calls and explains regenerate behavior. |
| Full `json.ts` malformed / nested braces / array-object split coverage | `src/app/api/agents/_shared/json.test.ts` | Catches common model-format failures. |
| `getGrowthAssets` wrapper live-success and route-failure fallback | `src/lib/api.test.ts` | Confirms client layer never exposes route failure. |
| `designChallenge` wrapper live-success and fallback | `src/lib/api.test.ts` | Protects Designer modal from provider issues. |
| `generateAuditTrace` wrapper live-success and null fallback | `src/lib/api.test.ts` | Protects score receipt from bad route output. |
| Route cache repeated identical input for Growth/Designer/Audit trace | `tests/api/agents/*.test.ts` | Confirms cost guard beyond Daremaster. |
| `anthropic.ts` provider non-2xx, malformed JSON, empty text | `src/app/api/agents/_shared/anthropic.test.ts` | Tightens failure taxonomy. |

### Tier 3 — Skip If Pressed

| Item | File(s) | Why |
|---|---|---|
| Pure agent happy paths | `src/agents/*.test.ts` | Useful regression checks, but current deterministic agents are fallback-only. |
| `formula.ts` happy paths | `src/lib/formula.test.ts` | Scoring is important but mostly pre-existing; cover only if Tier 1/2 done. |
| `demo-stages.ts` stage snapshot sanity | `src/lib/demo-stages.test.ts` | Demo shaping is pre-existing and manually covered. |
| Additional edge cases around date math / localStorage corruption | `src/lib/api.test.ts`, `src/lib/formula.test.ts` | Good polish, not required for Step 2 acceptance. |
| `MOCK_LIVE=true` runtime fixture mode | `src/app/api/agents/_shared/anthropic.ts`, tests TBD | Nice demo affordance only if docs and tests cover it; not needed for acceptance. |

## Tooling Decision

Use Vitest, not Jest.

- **Version:** `vitest@3.2.4`.
- **Why:** TypeScript + ESM without Babel/Jest friction, fast watch mode, `vi.mock`, direct Node/Web API support, and fake timers.
- **Config intent:** `vitest.config.ts` at repo root.
- **Runtime:** `test.environment = "node"`.
- **Includes:** `src/**/*.test.ts` and `tests/**/*.test.ts`.
- **Aliases:** expose `"@": path.resolve(__dirname, "src")`.
- **Setup file:** `tests/setup/vitest.setup.ts`.
- **Mock hygiene:** `clearMocks: true`, `restoreMocks: true`; use `afterEach` to restore env and globals.
- **Type coverage:** add Vitest globals only if the implementer chooses `globals: true`; otherwise import `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` explicitly. Prefer explicit imports.
- **Package scripts:** add `"test": "vitest run"` and optional `"test:watch": "vitest"`.

No coverage threshold in this round. The target is Tier 1 complete, Tier 2 best-effort, Tier 3 only if ahead of schedule.

## Fixture Catalog

Place shared fixtures under `tests/fixtures/`.

### `tests/fixtures/snapshots.ts`

Exports:

- `preHandoffDaremasterSnapshot`: `DaremasterSnapshot`
  - Shape: active challenge with `status: "review"`, ranking with a volume leader, no useful `auditScore`.
- `postHandoffDaremasterSnapshot`: `DaremasterSnapshot`
  - Shape: active challenge with `status: "review"`, ranking with a volume leader and at least one lower-volume participant with higher `auditScore`.
- `winnerDaremasterSnapshot`: `DaremasterSnapshot`
  - Shape: completed challenge, ranking includes one participant with `finalRank: 1`.

Do not hard-code fixture strings into the plan; implementer should choose readable names/counts consistent with `DaremasterSnapshot`.

### `tests/fixtures/packets.ts`

Exports:

- `approvedPacketA`: `EvidencePacket`
  - Shape: one participant, two to three items, all with permission and business impact.
- `approvedPacketB`: `EvidencePacket`
  - Shape: second participant/company so dedupe and multi-company case studies can be tested.
- `smallApprovedCorpus`: `EvidencePacket[]`
  - Shape: `[approvedPacketA, approvedPacketB]`.
- `packetWithRejectedSignals`: `EvidencePacket`
  - Shape: includes at least one item missing permission or business impact for audit trace / fallback context.

### `tests/fixtures/findings.ts`

Exports:

- `sampleAuditFindings`: `AuditFindings`
  - Shape: `validatedItems`, `rejectedItems`, `qualityScore`, `suggestedFinalScore`, `flags`, `recommendation`, `adminStatus`, `rubricBreakdown`, `trace`.
- `flaggedAuditFindings`: `AuditFindings`
  - Shape: at least one flag and at least one rejected item.
- `sampleAuditContract`: `AuditContract`
  - Shape: rubric matching `sampleAuditFindings.rubricBreakdown`, admin-final decision owner.

### `tests/fixtures/llmResponses.ts`

Exports model output strings / response-body helpers:

- `anthropicEnvelope(text: string)`: shape of Anthropic Messages response body with one text content block.
- `cleanDaremasterPostJson`: clean JSON object string for a valid `DaremasterPost`.
- `fencedDaremasterPostJson`: same shape inside a markdown JSON fence.
- `proseWrappedDaremasterPostJson`: valid JSON object surrounded by prose.
- `trailingCommentaryDaremasterPostJson`: valid JSON object followed by post-JSON commentary.
- `scoreLeakDaremasterPostJson`: JSON object whose `content` contains score-leaking language.
- `nearMissScoreLeakDaremasterPostJson`: JSON object whose `content` says a participant is "95 out of 100" or equivalent without using `X/100` slash notation.
- `cleanInsightBundleJson`: JSON object with grounded `topQuotes`, `caseStudies`, `snippets`, `linkedinPosts`.
- `partiallyUngroundedInsightBundleJson`: includes both grounded and ungrounded assets.
- `twoGroundedOneFabricatedInsightBundleJson`: exactly three quote candidates where two are grounded and one is fabricated, to exercise per-item drop logic without full fallback.
- `fullyUngroundedInsightBundleJson`: contains no grounded usable assets.
- `cleanChallengeBriefJson`: JSON object matching the route's expected model brief shape, intentionally omitting `auditContract`.
- `rubricWeights87BriefJson`: valid brief shape whose rubric weights sum to 87, to exercise normalization.
- `schemaViolatingBriefJson`: missing one required field or has invalid rubric.
- `cleanAuditTraceJson`: JSON array of three to eight short trace lines.
- `nineLineAuditTraceJson`: JSON array with 9 items, to exercise the 8-line cap.
- `oversizedAuditTraceJson`: JSON array with too many lines or overlong line.
- `videoAnalysisAuditTraceJson`: JSON array that claims transcript/footage/voice analysis.
- `emptyModelText`: empty string.
- `malformedJsonText`: non-JSON text with no object/array root.

The implementer chooses exact strings; keep them short and readable.

## Mock Strategy

### Anthropic Interception

Mock `globalThis.fetch` everywhere provider behavior is needed.

- In `anthropic.ts` tests, `globalThis.fetch` represents the Anthropic API call.
- In route tests, still mock `globalThis.fetch`; do not mock `callAnthropic`. This exercises the real route handler, `callAnthropic`, JSON extraction, validation, and cache path together.
- In `src/lib/api.ts` wrapper tests, `globalThis.fetch` represents the browser call to the local Next route (`/api/agents/...`), not Anthropic.

Every test that expects a provider call must assert that the mocked fetch received:

- `https://api.anthropic.com/v1/messages` for `callAnthropic` / route tests.
- `x-api-key` set to the dummy key.
- `anthropic-version` set.
- JSON body with `model`, `system`, `messages`, `max_tokens`, `temperature`.

### Env Variables

Each test owns env state:

- Save original `process.env.ANTHROPIC_API_KEY` and `process.env.ANTHROPIC_MODEL`.
- For missing-key tests, delete both vars.
- For provider/route success tests, set `ANTHROPIC_API_KEY` to a dummy non-empty value.
- For model override tests, set `ANTHROPIC_MODEL` to a dummy model id and assert it appears in the outbound body.
- Restore env after each test.

Automated tests must never branch on the developer's real env. No `skipIf`, no live integration suite.

### `MOCK_LIVE=true` Decision

Do not implement `MOCK_LIVE=true` as part of Tier 1 or Tier 2. It is a Tier 3 demo affordance only.

Architectural decision:

- It can be useful if the team wants to demonstrate "provider route + validators + cache + wrappers" without a real key.
- It also adds a third runtime mode that must be documented and tested, so it should not be added casually.
- If implemented, `callAnthropic()` may short-circuit only when `process.env.MOCK_LIVE === "true"` and return canned fixture strings keyed by an explicit agent identifier or prompt/category. Do not hash arbitrary system prompts in a way that becomes hard to reason about.
- Required tests if implemented:
  - no key + no `MOCK_LIVE`: `callAnthropic()` throws `MissingKeyError`;
  - no key + `MOCK_LIVE=true`: `callAnthropic()` returns a fixture string and never calls `globalThis.fetch`;
  - real/dummy key + no `MOCK_LIVE`: normal mocked-fetch provider path still works;
  - route test proving one agent returns `200` through `MOCK_LIVE=true`.

Skip this unless Tier 1 and useful Tier 2 are already green.

### Cache Reset

The cache is module-scoped in `cache.ts`. Do not add a production-facing cache-clear export unless the implementer finds `vi.resetModules()` too brittle.

Default strategy:

- For `cache.ts` unit tests: call `vi.resetModules()` before each test, then dynamically import `cache.ts` inside the test.
- For route tests: call `vi.resetModules()` before each test, then dynamically import the route's `POST` after env/fetch mocks are set.
- Avoid static route imports in files that assert cache behavior, otherwise module-level cache can leak across test cases.

If the implementer needs a helper, the only acceptable helper is a clearly test-named export such as `__resetAgentCacheForTests`, with no production use.

### TTL / Time

Use fake timers for TTL:

- `vi.useFakeTimers()` and `vi.setSystemTime(...)`.
- Call `withCache` once and assert compute called once.
- Call again before TTL expiry and assert cached value.
- Advance time past TTL using fake timers.
- Call again and assert compute called again.
- Always `vi.useRealTimers()` after the test.

### `src/lib/api.ts` Browser Harness

`src/lib/api.ts` is a client-side fake API that expects `window.localStorage`.

Use a lightweight test harness, not React:

- Create a minimal `globalThis.window` with:
  - `localStorage.getItem/setItem/removeItem/clear`
  - `dispatchEvent`
  - optional no-op `addEventListener/removeEventListener` if needed
- Define `globalThis.CustomEvent` if Node does not provide it.
- Use `vi.resetModules()` before each test so `state` inside `src/lib/api.ts` is reset.
- Dynamically import `src/lib/api.ts` after the window stub exists.
- Use `setDemoStage("day_14")` / `setDemoStage("completed")` to seed state.
- For functions returning `delay(...)`, use fake timers or await after running pending timers.

## File-by-File Test Plan

### `src/app/api/agents/_shared/validation.ts`

Test file: `src/app/api/agents/_shared/validation.test.ts`

Tier: 1.

Fixtures:

- `smallApprovedCorpus`
- `cleanInsightBundleJson` parsed to object
- `partiallyUngroundedInsightBundleJson` parsed to object
- `fullyUngroundedInsightBundleJson` parsed to object
- `cleanChallengeBriefJson` parsed to object
- `schemaViolatingBriefJson` parsed to object
- `cleanAuditTraceJson` parsed to array
- `oversizedAuditTraceJson` parsed to array
- `videoAnalysisAuditTraceJson` parsed to array

Test cases:

- `containsForbiddenScoreLanguage — returns false for counts and qualitative descriptions`
  - input: content with participant counts and qualitative quality language but no ratio/score phrase.
  - calls: `containsForbiddenScoreLanguage(input)`.
  - asserts: returns `false`.

- `containsForbiddenScoreLanguage — rejects X/10 ratio`
  - input: content containing a numeric ratio matching `\b\d+(\.\d+)?\s*\/\s*10\b`.
  - calls: `containsForbiddenScoreLanguage(input)`.
  - asserts: returns `true`.

- `containsForbiddenScoreLanguage — rejects X/100 ratio`
  - input: content containing a numeric ratio matching `\b\d+(\.\d+)?\s*\/\s*100\b`.
  - calls: `containsForbiddenScoreLanguage(input)`.
  - asserts: returns `true`.

- `containsForbiddenScoreLanguage — rejects named score phrases`
  - input: one content string per banned phrase family: audit score, quality score, formula score, rubric score.
  - calls: `containsForbiddenScoreLanguage(input)`.
  - asserts: each returns `true`, case-insensitively.

- `containsForbiddenScoreLanguage — rejects "scored N" phrasing`
  - input: content containing a "scored" phrase followed by a number.
  - calls: `containsForbiddenScoreLanguage(input)`.
  - asserts: returns `true`.

- `containsForbiddenScoreLanguage — rejects "N out of 100" score wording`
  - input: content equivalent to "Patrick is at 95 out of 100 in pure quality".
  - calls: `containsForbiddenScoreLanguage(input)`.
  - asserts: returns `true`; this closes the near-miss score leak that does not use slash notation.

- `validateDaremasterPost — accepts valid post and fills missing reactions with zeros`
  - input: object with valid `trigger`, valid `content`, no `reactions`.
  - calls: `validateDaremasterPost(input)`.
  - asserts: returns non-null; trigger/content preserved trimmed; all five reaction keys exist with `0`.

- `validateDaremasterPost — sanitizes reaction values`
  - input: valid post with fractional, negative, huge, and missing reaction values.
  - calls: `validateDaremasterPost(input)`.
  - asserts: finite non-negative values are rounded; huge values cap at `999`; invalid/negative/missing values become `0`.

- `validateDaremasterPost — rejects invalid trigger`
  - input: object with trigger outside `DaremasterPost["trigger"]`.
  - calls: `validateDaremasterPost(input)`.
  - asserts: returns `null`.

- `validateDaremasterPost — rejects too-short and too-long content`
  - input: two valid-shaped posts, one content shorter than 8 chars, one longer than 600 chars.
  - calls: `validateDaremasterPost(input)`.
  - asserts: returns `null` for both.

- `validateDaremasterPost — rejects score-leak content`
  - input: valid-shaped post whose content contains a forbidden score pattern.
  - calls: `validateDaremasterPost(input)`.
  - asserts: returns `null`.

- `validateInsightBundle — accepts fully grounded bundle and recomputes totals`
  - input: parsed `cleanInsightBundleJson`; source `{ packets: smallApprovedCorpus, rejectedCount }`.
  - calls: `validateInsightBundle(input, source)`.
  - asserts: returns non-null; `challengeId === "dyd-001"`; `generatedAt` is generated by validator; `totals.submitted === source item count + rejectedCount`; `totals.approved === source item count`; count totals equal sanitized array lengths.

- `validateInsightBundle — caps arrays to 3/3/3/2`
  - input: grounded bundle with more than max items per array.
  - calls: `validateInsightBundle(input, source)`.
  - asserts: returned arrays are capped to topQuotes 3, caseStudies 3, snippets 3, linkedinPosts 2.

- `validateInsightBundle — drops ungrounded quote but keeps grounded assets`
  - input: parsed `partiallyUngroundedInsightBundleJson`.
  - calls: `validateInsightBundle(input, source)`.
  - asserts: returns non-null; ungrounded topQuote is absent; grounded assets remain; totals reflect only kept assets.

- `validateInsightBundle — keeps two grounded quotes and drops one fabricated quote`
  - input: parsed `twoGroundedOneFabricatedInsightBundleJson`.
  - calls: `validateInsightBundle(input, source)`.
  - asserts: returns non-null; `topQuotes.length === 2`; the fabricated quote is absent; totals count two kept quotes.

- `validateInsightBundle — drops ungrounded snippet`
  - input: bundle with one grounded snippet and one ungrounded snippet.
  - calls: `validateInsightBundle(input, source)`.
  - asserts: returned `snippets` contains only the grounded item.

- `validateInsightBundle — rejects invalid snippet tag`
  - input: bundle with snippet tag outside `"sales" | "marketing"`.
  - calls: `validateInsightBundle(input, source)`.
  - asserts: invalid snippet is dropped; if no other useful assets remain, result is `null`.

- `validateInsightBundle — rejects case study with unknown client`
  - input: bundle with `caseStudies[*].client` not in source companies.
  - calls: `validateInsightBundle(input, source)`.
  - asserts: unknown-client case study is dropped.

- `validateInsightBundle — returns null when no useful grounded assets remain`
  - input: parsed `fullyUngroundedInsightBundleJson`.
  - calls: `validateInsightBundle(input, source)`.
  - asserts: returns `null`; this is the full fallback trigger.

- `validateChallengeBrief — accepts valid brief and constructs auditContract`
  - input: parsed `cleanChallengeBriefJson` with no `auditContract`.
  - calls: `validateChallengeBrief(input)`.
  - asserts: returns non-null; all required brief fields present; `auditContract` exists; `auditContract.auditMode === "ai_assisted_human_approved"`; `auditContract.finalDecisionOwner === "admins"`.

- `validateChallengeBrief — normalizes rubric weights to 100`
  - input: valid brief whose rubric weights do not sum to 100.
  - calls: `validateChallengeBrief(input)`.
  - asserts: returned `rubric.reduce(weight) === 100`; `auditContract.rubric` has same keys/labels/weights as returned `rubric`.

- `validateChallengeBrief — normalizes rubric weights that sum to 87`
  - input: parsed `rubricWeights87BriefJson`.
  - calls: `validateChallengeBrief(input)`.
  - asserts: returns non-null; returned rubric weights sum exactly to 100; audit contract mirrors normalized weights.

- `validateChallengeBrief — derives primaryMetric key as slug`
  - input: valid brief with multi-word `primaryMetric`.
  - calls: `validateChallengeBrief(input)`.
  - asserts: `auditContract.primaryMetric.label === primaryMetric`; `auditContract.primaryMetric.key` is lowercase underscore slug; type is `"number"`; `higherIsBetter === true`.

- `validateChallengeBrief — derives evidence requiredFields from natural-language requirements`
  - input: valid brief with evidence requirements mentioning client/company/role/permission/impact.
  - calls: `validateChallengeBrief(input)`.
  - asserts: `auditContract.evidence.requiredFields` includes the expected canonical fields.

- `validateChallengeBrief — falls back to testimonial-shaped requiredFields when evidence text is generic`
  - input: valid brief with generic evidence requirements that do not mention canonical fields.
  - calls: `validateChallengeBrief(input)`.
  - asserts: requiredFields includes the testimonial defaults.

- `validateChallengeBrief — rejects schema-violating brief`
  - input: parsed `schemaViolatingBriefJson`.
  - calls: `validateChallengeBrief(input)`.
  - asserts: returns `null`.

- `validateChallengeBrief — rejects rubric outside allowed item count`
  - input: valid brief with fewer than 3 rubric items and another with more than 6.
  - calls: `validateChallengeBrief(input)`.
  - asserts: returns `null` for both.

- `validateAuditTrace — accepts concise trace`
  - input: parsed `cleanAuditTraceJson`.
  - calls: `validateAuditTrace(input)`.
  - asserts: returns string array; lines are trimmed; length is 3-8.

- `validateAuditTrace — rejects non-array`
  - input: object wrapper or string.
  - calls: `validateAuditTrace(input)`.
  - asserts: returns `null`.

- `validateAuditTrace — rejects oversized trace`
  - input: parsed `oversizedAuditTraceJson`.
  - calls: `validateAuditTrace(input)`.
  - asserts: returns `null`.

- `validateAuditTrace — rejects nine-line trace`
  - input: parsed `nineLineAuditTraceJson`.
  - calls: `validateAuditTrace(input)`.
  - asserts: returns `null` because the cap is 8 lines.

- `validateAuditTrace — rejects video/transcription claims`
  - input: parsed `videoAnalysisAuditTraceJson`.
  - calls: `validateAuditTrace(input)`.
  - asserts: returns `null`.

- `validateAuditTrace — rejects agent-final-authority language`
  - input: trace line containing audit/agent final approval or rejection authority.
  - calls: `validateAuditTrace(input)`.
  - asserts: returns `null`.

### `src/app/api/agents/_shared/json.ts`

Test file: `src/app/api/agents/_shared/json.test.ts`

Tier: 1 for first three, Tier 2 for remaining.

Fixtures:

- `cleanDaremasterPostJson`
- `fencedDaremasterPostJson`
- `proseWrappedDaremasterPostJson`
- `malformedJsonText`

Test cases:

- `extractJson — parses clean JSON object`
  - input: `cleanDaremasterPostJson`.
  - calls: `extractJson(input)`.
  - asserts: returns object with expected keys.

- `extractJson — parses fenced JSON`
  - input: `fencedDaremasterPostJson`.
  - calls: `extractJson(input)`.
  - asserts: returns object; fence markers are ignored.

- `extractJson — parses prose-wrapped JSON by slicing first balanced object`
  - input: `proseWrappedDaremasterPostJson`.
  - calls: `extractJson(input)`.
  - asserts: returns object despite surrounding prose.

- `extractJson — parses JSON with trailing commentary`
  - input: `trailingCommentaryDaremasterPostJson`.
  - calls: `extractJson(input)`.
  - asserts: returns the first balanced object and ignores trailing commentary.

- `extractJson — parses array roots`
  - input: clean JSON array string.
  - calls: `extractJson(input)`.
  - asserts: returns array.

- `extractJson — ignores braces inside strings`
  - input: prose-wrapped JSON whose string value contains brace characters.
  - calls: `extractJson(input)`.
  - asserts: returns correctly parsed object, not a truncated slice.

- `extractJson — returns null for malformed text`
  - input: `malformedJsonText`.
  - calls: `extractJson(input)`.
  - asserts: returns `null`.

- `extractJson — returns null for empty input`
  - input: `""`.
  - calls: `extractJson(input)`.
  - asserts: returns `null`.

- `extractJsonObject — accepts object root`
  - input: clean JSON object string.
  - calls: `extractJsonObject(input)`.
  - asserts: returns object.

- `extractJsonObject — rejects array root`
  - input: clean JSON array string.
  - calls: `extractJsonObject(input)`.
  - asserts: returns `null`.

### `src/app/api/agents/_shared/cache.ts`

Test file: `src/app/api/agents/_shared/cache.test.ts`

Tier: 2.

Fixtures: none beyond inline simple objects.

Test cases:

- `hashInput — stable for object key order`
  - input: two objects with same nested data but different property order.
  - calls: `hashInput(a)`, `hashInput(b)`.
  - asserts: hashes are equal.

- `hashInput — changes when nested value changes`
  - input: two objects differing by one nested value.
  - calls: `hashInput(a)`, `hashInput(b)`.
  - asserts: hashes are different.

- `cacheSet/cacheGet — returns value before TTL expires`
  - input: key/value/ttl.
  - calls: `cacheSet`, then `cacheGet`.
  - asserts: returned value equals original.

- `cacheGet — expires value after TTL`
  - input: key/value/ttl with fake system time.
  - calls: `cacheSet`, advance fake time past TTL, `cacheGet`.
  - asserts: returns `undefined`.

- `withCache — computes once for repeated calls before TTL`
  - input: compute spy returning a value.
  - calls: `withCache(key, ttl, compute)` twice.
  - asserts: both results equal; compute called once.

- `withCache — shares in-flight promise`
  - input: compute spy that resolves after controlled promise.
  - calls: two concurrent `withCache(key, ttl, compute)` calls before first resolves.
  - asserts: compute called once; both callers resolve to same value.

- `withCache — retries after compute rejects`
  - input: compute spy rejects first call, resolves second call.
  - calls: `withCache` and catch rejection, then call again.
  - asserts: first rejects; second resolves; compute called twice; failed result not cached.

- `withCache — recomputes after TTL expiry`
  - input: fake timers, compute spy returning different values per call.
  - calls: `withCache`, advance time past TTL, `withCache`.
  - asserts: second result is new value; compute called twice.

### `src/app/api/agents/_shared/anthropic.ts`

Test file: `src/app/api/agents/_shared/anthropic.test.ts`

Tier: 1 for missing key/success, Tier 2 for provider edge cases.

Fixtures:

- `anthropicEnvelope`
- `emptyModelText`

Test cases:

- `callAnthropic — throws MissingKeyError when ANTHROPIC_API_KEY is absent`
  - input: valid `CallOptions`, env key deleted.
  - calls: `callAnthropic(opts)`.
  - asserts: rejects with `MissingKeyError`; `globalThis.fetch` not called.

- `callAnthropic — posts expected Anthropic request and returns text`
  - input: valid `CallOptions`, dummy env key, mocked fetch returns `anthropicEnvelope(cleanText)`.
  - calls: `callAnthropic(opts)`.
  - asserts: resolves text; fetch called once with Anthropic endpoint; headers include dummy key/version/content-type; body includes model, max_tokens, temperature, system, and user message.

- `callAnthropic — uses ANTHROPIC_MODEL override`
  - input: dummy env key and `ANTHROPIC_MODEL` set.
  - calls: `callAnthropic(opts)`.
  - asserts: outbound JSON body `model` equals env override.

- `callAnthropic — uses default model when ANTHROPIC_MODEL is absent`
  - input: dummy env key, model env deleted.
  - calls: `callAnthropic(opts)`.
  - asserts: outbound JSON body `model` equals implementation default.

- `callAnthropic — throws ProviderError on fetch rejection`
  - input: dummy env key, mocked fetch rejects.
  - calls: `callAnthropic(opts)`.
  - asserts: rejects with `ProviderError` whose message mentions fetch failure.

- `callAnthropic — throws ProviderError on non-2xx`
  - input: dummy env key, mocked fetch returns non-ok `Response`.
  - calls: `callAnthropic(opts)`.
  - asserts: rejects with `ProviderError`; `status` equals response status.

- `callAnthropic — throws ProviderError on malformed provider JSON`
  - input: dummy env key, mocked fetch returns text that is not JSON.
  - calls: `callAnthropic(opts)`.
  - asserts: rejects with `ProviderError`.

- `callAnthropic — throws ProviderError on empty text content`
  - input: dummy env key, mocked fetch returns empty/no text content.
  - calls: `callAnthropic(opts)`.
  - asserts: rejects with `ProviderError("empty response")` or equivalent.

## Route Handler Test Plan

Route tests live under `tests/api/agents/`. All route tests:

- Use direct `POST(new Request(...))`.
- Set env internally.
- Mock `globalThis.fetch` for Anthropic.
- Use `vi.resetModules()` before dynamic import to isolate route cache.
- Parse returned `Response` with `await res.json()`.

### Daremaster Route

Source: `src/app/api/agents/daremaster/route.ts`

Test file: `tests/api/agents/daremaster.test.ts`

Tier: 1.

Fixtures:

- `postHandoffDaremasterSnapshot`
- `winnerDaremasterSnapshot`
- `cleanDaremasterPostJson`
- `scoreLeakDaremasterPostJson`
- `malformedJsonText`

Test cases:

- `POST /daremaster — returns 400 for invalid JSON`
  - input: `Request` body that is not valid JSON.
  - calls: `POST(req)`.
  - asserts: status `400`; fetch not called.

- `POST /daremaster — returns 400 for missing snapshot or mode`
  - input: JSON bodies missing `snapshot`, missing `mode`, or empty object.
  - calls: `POST(req)`.
  - asserts: status `400`; fetch not called.

- `POST /daremaster — returns 503 when API key is missing`
  - input: valid `{ snapshot: postHandoffDaremasterSnapshot, mode: "insight" }`, env key deleted.
  - calls: `POST(req)`.
  - asserts: status `503`; response error is `MissingKeyError`; fetch not called.

- `POST /daremaster — returns validated post on provider success`
  - input: valid insight body, dummy env key, mocked fetch returns `anthropicEnvelope(cleanDaremasterPostJson)`.
  - calls: `POST(req)`.
  - asserts: status `200`; response has valid `trigger`, `content`, `reactions`; `content` does not contain forbidden score language.

- `POST /daremaster — sends mode and snapshot in Anthropic user prompt`
  - input: valid insight body.
  - calls: `POST(req)`.
  - asserts: mocked fetch body contains a user message with the mode string and serialized snapshot data.

- `POST /daremaster — returns 502 when model output leaks score`
  - input: valid insight body, mocked fetch returns `anthropicEnvelope(scoreLeakDaremasterPostJson)`.
  - calls: `POST(req)`.
  - asserts: status `502`; response error indicates provider/validation failure; no post body is accepted.

- `POST /daremaster — returns 502 when model output uses near-miss score wording`
  - input: valid insight body, mocked fetch returns `anthropicEnvelope(nearMissScoreLeakDaremasterPostJson)`.
  - calls: `POST(req)`.
  - asserts: status `502`; "95 out of 100" style language is treated as public score leakage even without slash notation.

- `POST /daremaster — returns 502 when model output is malformed`
  - input: valid insight body, mocked fetch returns `anthropicEnvelope(malformedJsonText)`.
  - calls: `POST(req)`.
  - asserts: status `502`.

- `POST /daremaster — caches repeated identical input`
  - input: same valid body twice, dummy env key, mocked fetch success.
  - calls: `POST(reqA)`, then `POST(reqB)` after dynamically importing the same route module once.
  - asserts: both responses `200`; response JSON equal; mocked Anthropic fetch called once.
  - product call: identical input is cached by design. If the product decides Re-generate must always produce a novel draft, implement a `variantSeed` in the wrapper/request and add a follow-up test that different seeds bypass cache.

- `POST /daremaster — different mode uses different cache key`
  - input: same snapshot with mode `"insight"` and `"winner"`.
  - calls: `POST` twice.
  - asserts: mocked Anthropic fetch called twice; responses can differ.

### Growth Insight Extractor Route

Source: `src/app/api/agents/insight-extractor/route.ts`

Test file: `tests/api/agents/insight-extractor.test.ts`

Tier: 1 for first five, Tier 2 for cache.

Fixtures:

- `smallApprovedCorpus`
- `cleanInsightBundleJson`
- `fullyUngroundedInsightBundleJson`
- `malformedJsonText`

Test cases:

- `POST /insight-extractor — returns 400 for invalid JSON`
  - input: invalid JSON request.
  - calls: `POST(req)`.
  - asserts: status `400`; fetch not called.

- `POST /insight-extractor — returns 400 for empty corpus`
  - input: `{ approvedPackets: [], rejectedCount: 0 }`.
  - calls: `POST(req)`.
  - asserts: status `400`; error `"empty_corpus"`; fetch not called.

- `POST /insight-extractor — returns 503 when API key is missing`
  - input: valid corpus body, env key deleted.
  - calls: `POST(req)`.
  - asserts: status `503`; fetch not called.

- `POST /insight-extractor — returns sanitized bundle on grounded provider success`
  - input: valid corpus body, mocked fetch returns `anthropicEnvelope(cleanInsightBundleJson)`.
  - calls: `POST(req)`.
  - asserts: status `200`; totals are recomputed; generatedAt exists; arrays are capped; grounded fields remain.

- `POST /insight-extractor — drops one fabricated quote while preserving grounded assets`
  - input: valid corpus body, mocked fetch returns `anthropicEnvelope(twoGroundedOneFabricatedInsightBundleJson)`.
  - calls: `POST(req)`.
  - asserts: status `200`; response keeps grounded quotes; fabricated quote is absent; totals reflect kept quote count.

- `POST /insight-extractor — returns 502 when validation drops all usable assets`
  - input: valid corpus body, mocked fetch returns `anthropicEnvelope(fullyUngroundedInsightBundleJson)`.
  - calls: `POST(req)`.
  - asserts: status `502`; wrapper is expected to fallback in client tests.

- `POST /insight-extractor — returns 502 on malformed model output`
  - input: valid corpus body, mocked fetch returns `anthropicEnvelope(malformedJsonText)`.
  - calls: `POST(req)`.
  - asserts: status `502`.

- `POST /insight-extractor — caches repeated identical input`
  - input: same valid body twice.
  - calls: `POST` twice.
  - asserts: mocked Anthropic fetch called once; response JSON equal.

### Challenge Designer Route

Source: `src/app/api/agents/challenge-designer/route.ts`

Test file: `tests/api/agents/challenge-designer.test.ts`

Tier: 1 for first six, Tier 2 for cache.

Fixtures:

- `cleanChallengeBriefJson`
- `schemaViolatingBriefJson`
- `malformedJsonText`

Test cases:

- `POST /challenge-designer — returns 400 for invalid JSON`
  - input: invalid JSON request.
  - calls: `POST(req)`.
  - asserts: status `400`; fetch not called.

- `POST /challenge-designer — returns 400 for missing or blank prompt`
  - input: `{}`, `{ prompt: "" }`, `{ prompt: "   " }`.
  - calls: `POST(req)`.
  - asserts: status `400`; fetch not called.

- `POST /challenge-designer — returns 503 when API key is missing`
  - input: valid prompt body, env key deleted.
  - calls: `POST(req)`.
  - asserts: status `503`; fetch not called.

- `POST /challenge-designer — returns normalized ChallengeBrief on provider success`
  - input: valid prompt body, mocked fetch returns `anthropicEnvelope(cleanChallengeBriefJson)`.
  - calls: `POST(req)`.
  - asserts: status `200`; response has all `ChallengeBrief` fields; `auditContract` exists; rubric weights sum to 100; audit contract rubric mirrors returned rubric.

- `POST /challenge-designer — normalizes rubric weights that sum to 87`
  - input: valid prompt body, mocked fetch returns `anthropicEnvelope(rubricWeights87BriefJson)`.
  - calls: `POST(req)`.
  - asserts: status `200`; returned rubric weights sum to 100; audit contract mirrors normalized weights.

- `POST /challenge-designer — prompt injection still returns brief shape when provider returns valid brief`
  - input: prompt containing instruction-escape content.
  - calls: `POST(req)` with mocked provider returning `cleanChallengeBriefJson`.
  - asserts: status `200`; response is a valid `ChallengeBrief`; user prompt appears JSON-stringified in outbound user message; output shape not affected by hostile prompt text.

- `POST /challenge-designer — returns 502 when provider obeys injection and returns non-JSON`
  - input: injection prompt; mocked fetch returns `anthropicEnvelope(malformedJsonText)`.
  - calls: `POST(req)`.
  - asserts: status `502`; client wrapper test must confirm fallback.

- `POST /challenge-designer — returns 502 for schema-violating brief`
  - input: valid prompt; mocked fetch returns `anthropicEnvelope(schemaViolatingBriefJson)`.
  - calls: `POST(req)`.
  - asserts: status `502`.

- `POST /challenge-designer — caches by trimmed prompt`
  - input: same prompt with and without surrounding spaces.
  - calls: `POST` twice.
  - asserts: mocked Anthropic fetch called once; response JSON equal.

### Audit Assistant Trace Route

Source: `src/app/api/agents/audit-assistant/trace/route.ts`

Test file: `tests/api/agents/audit-assistant-trace.test.ts`

Tier: 1 for first six, Tier 2 for cache.

Fixtures:

- `approvedPacketA`
- `sampleAuditContract`
- `sampleAuditFindings`
- `cleanAuditTraceJson`
- `videoAnalysisAuditTraceJson`
- `oversizedAuditTraceJson`
- `malformedJsonText`

Test cases:

- `POST /audit-assistant/trace — returns 400 for invalid JSON`
  - input: invalid JSON request.
  - calls: `POST(req)`.
  - asserts: status `400`; fetch not called.

- `POST /audit-assistant/trace — returns 400 for missing packet contract or findings`
  - input: bodies missing each required field.
  - calls: `POST(req)`.
  - asserts: status `400`; fetch not called.

- `POST /audit-assistant/trace — returns 503 when API key is missing`
  - input: valid body, env key deleted.
  - calls: `POST(req)`.
  - asserts: status `503`; fetch not called.

- `POST /audit-assistant/trace — returns trace on provider success`
  - input: valid body, mocked fetch returns `anthropicEnvelope(cleanAuditTraceJson)`.
  - calls: `POST(req)`.
  - asserts: status `200`; response shape is `{ trace: string[] }`; trace length 3-8.

- `POST /audit-assistant/trace — user prompt includes structured fields and deterministic findings`
  - input: valid body.
  - calls: `POST(req)`.
  - asserts: outbound user message includes rubric, structured evidence fields, and authoritative finding fields; it does not require raw video data.

- `POST /audit-assistant/trace — returns 502 for video-analysis trace`
  - input: valid body, mocked fetch returns `anthropicEnvelope(videoAnalysisAuditTraceJson)`.
  - calls: `POST(req)`.
  - asserts: status `502`.

- `POST /audit-assistant/trace — returns 502 for oversized trace`
  - input: valid body, mocked fetch returns `anthropicEnvelope(oversizedAuditTraceJson)`.
  - calls: `POST(req)`.
  - asserts: status `502`.

- `POST /audit-assistant/trace — returns 502 for nine-line trace`
  - input: valid body, mocked fetch returns `anthropicEnvelope(nineLineAuditTraceJson)`.
  - calls: `POST(req)`.
  - asserts: status `502`.

- `POST /audit-assistant/trace — returns 502 for malformed model output`
  - input: valid body, mocked fetch returns `anthropicEnvelope(malformedJsonText)`.
  - calls: `POST(req)`.
  - asserts: status `502`.

- `POST /audit-assistant/trace — caches by audit-relevant fields`
  - input: same body twice.
  - calls: `POST` twice.
  - asserts: mocked Anthropic fetch called once.

- `POST /audit-assistant/trace — changed findings bypass cache`
  - input: two bodies with same packet but different `qualityScore` or `validatedItems`.
  - calls: `POST` twice.
  - asserts: mocked Anthropic fetch called twice.

## `src/lib/api.ts` Wrapper Test Plan

Test file: `src/lib/api.test.ts`

Tier: 1 for Daremaster wrapper, Tier 2 for the remaining wrappers.

Harness:

- Node environment with stubbed `window.localStorage`.
- Use `vi.resetModules()` before each test.
- Dynamically import `src/lib/api.ts`.
- Seed state via `setDemoStage("day_14")` or `setDemoStage("completed")`.
- Mock browser `fetch` for route calls.
- Use fake timers for any code path returning `delay(...)`.

Fixtures:

- `cleanDaremasterPostJson` parsed to object, or a valid `DaremasterPost`.
- `cleanInsightBundleJson` parsed/sanitized-like object.
- `cleanChallengeBriefJson` as route response with full `ChallengeBrief` shape when needed.
- `cleanAuditTraceJson` parsed to array.

Test cases:

- `buildDaremasterSnapshot — returns current challenge/ranking/count/deadline shape`
  - setup: stub window; `setDemoStage("day_14")`.
  - calls: `buildDaremasterSnapshot()`.
  - asserts: result has challenge pick fields, ranking array, participantCount, registeredCount, numeric day deltas.

- `generateDaremasterPost — trivial mode never calls fetch and rotates deterministic content`
  - setup: `setDemoStage("day_14")`, mocked `fetch` spy.
  - calls: `generateDaremasterPost("trivial", { trivialIdx: 0 })`, then with `{ trivialIdx: 1 }`.
  - asserts: fetch not called; both posts have zero reactions; contents differ according to deterministic rotation; no forbidden score language.

- `generateDaremasterPost — insight mode uses live route when response ok`
  - setup: `setDemoStage("day_14")`, mocked browser fetch returns ok response with valid `DaremasterPost`.
  - calls: `generateDaremasterPost("insight")`.
  - asserts: fetch called with `/api/agents/daremaster`; request body mode is `"insight"`; ranking entries in body include auditScore where audits exist; returned reactions are zero-filled.

- `generateDaremasterPost — insight mode falls back on non-ok route response`
  - setup: route fetch returns status 502.
  - calls: `generateDaremasterPost("insight")`.
  - asserts: returns deterministic Charlie dark-horse style content; no forbidden score language; reactions zero.

- `generateDaremasterPost — winner mode falls back with Patrick winner content`
  - setup: `setDemoStage("completed")`, route fetch throws or returns non-ok.
  - calls: `generateDaremasterPost("winner")`.
  - asserts: returned content names the winner from deterministic script; includes growth-asset framing; no forbidden score language.

- `getGrowthAssets — uses live route when response ok`
  - setup: `setDemoStage("completed")`; route fetch returns ok valid `InsightBundle`.
  - calls: `getGrowthAssets("dyd-001")`.
  - asserts: fetch called with `/api/agents/insight-extractor`; body includes `approvedPackets` and `rejectedCount`; return equals route response.

- `getGrowthAssets — falls back to deterministic extractor on non-ok route response`
  - setup: route fetch returns 502.
  - calls: `getGrowthAssets("dyd-001")`, run timers if needed.
  - asserts: returns bundle with deterministic shape; no thrown error.

- `getGrowthAssets — falls back to deterministic extractor when fetch throws`
  - setup: route fetch rejects.
  - calls: `getGrowthAssets("dyd-001")`.
  - asserts: returns deterministic bundle; no thrown error.

- `generateAuditTrace — returns null when window is absent`
  - setup: no window stub before importing module.
  - calls: `generateAuditTrace("p-patrick")`.
  - asserts: returns `null`.

- `generateAuditTrace — returns live trace on valid route response`
  - setup: `setDemoStage("completed")`; route fetch returns ok `{ trace: [...] }`.
  - calls: `generateAuditTrace("p-patrick")`.
  - asserts: fetch called with `/api/agents/audit-assistant/trace`; body includes packet, contract, findings; returned trace equals response trace.

- `generateAuditTrace — returns null on non-ok, bad trace, missing audit, or thrown fetch`
  - setup: one case each.
  - calls: `generateAuditTrace(participantId)`.
  - asserts: returns `null` and never throws.

- `designChallenge — uses live route when response ok`
  - setup: browser fetch returns ok valid `ChallengeBrief`.
  - calls: `designChallenge({ prompt })`.
  - asserts: fetch called with `/api/agents/challenge-designer`; body equals input; returns route brief.

- `designChallenge — falls back to deterministic designer on non-ok route response`
  - setup: route fetch returns 502.
  - calls: `designChallenge({ prompt: testimonial-like prompt })`.
  - asserts: returns deterministic brief; title/rubric/auditContract present; no thrown error.

- `designChallenge — blank prompt does not call fetch`
  - setup: blank prompt, fetch spy.
  - calls: `designChallenge({ prompt: "   " })`.
  - asserts: fetch not called; deterministic fallback result returned.

## Lighter Coverage Plans

### `src/lib/formula.ts`

Test file: `src/lib/formula.test.ts`

Tier: 3.

Test cases:

- `computeFormulaScore — blends quality and quantity on 0-10 scale`
  - input: audit signals with known `qualityScore`, `validatedItems`, formula config.
  - calls: `computeFormulaScore(audit, config)`.
  - asserts: returned score equals expected one-decimal blend.

- `effectiveFinalScore — overrideScore wins over formula`
  - input: audit with `overrideScore`.
  - calls: `effectiveFinalScore(audit, config)`.
  - asserts: returns rounded override.

- `effectiveQualityScore — rubricWeights normalize custom criterion weights`
  - input: audit with rubricBreakdown and custom weights.
  - calls: `effectiveQualityScore(audit, config)`.
  - asserts: returns bounded normalized quality score.

- `formulaTrace — includes quality, quantity, and final lines`
  - input: audit signals and config.
  - calls: `formulaTrace(audit, config)`.
  - asserts: array length 3; lines contain quality, quantity, final calculation labels.

### `src/lib/demo-stages.ts`

Test file: `src/lib/demo-stages.test.ts`

Tier: 3.

Test cases:

- `buildSnapshot — launch has empty audits and no registered participants`
  - input: `"launch"`, Tomi user id.
  - calls: `buildSnapshot("launch", "u-sofia")`.
  - asserts: audits empty; challenge open/draft state matches current implementation; participants not registered.

- `buildSnapshot — day_14 has trimmed audits and no audit scores on public ranking`
  - input: `"day_14"`, admin user id.
  - calls: `buildSnapshot("day_14", "u-admin")`.
  - asserts: audits exist; ranking entries do not expose `auditScore`; Bob self-reported value reflects day_14 shaping.

- `buildSnapshot — completed has winner and full audits`
  - input: `"completed"`, admin user id.
  - calls: `buildSnapshot("completed", "u-admin")`.
  - asserts: challenge status completed; winnerId set; audits exist.

### `src/agents/daremaster.ts`

Test file: `src/agents/daremaster.test.ts`

Tier: 3.

Test cases:

- `pickTrigger — quality threat beats generic leaderboard movement`
  - input: `postHandoffDaremasterSnapshot`.
  - calls: `pickTrigger(snapshot)`.
  - asserts: returns `"quality_threat"`.

- `generate — returns post with valid trigger, content, reactions`
  - input: `preHandoffDaremasterSnapshot`.
  - calls: `generate(snapshot)`.
  - asserts: output has valid trigger, non-empty content, all reaction keys.

### `src/agents/insight-extractor.ts`

Test file: `src/agents/insight-extractor.test.ts`

Tier: 3.

Test cases:

- `extract — returns bundle shape from approved corpus`
  - input: `{ approvedPackets: smallApprovedCorpus, rejectedCount }`.
  - calls: `extract(input)`.
  - asserts: bundle has totals, topQuotes, caseStudies, snippets, linkedinPosts, generatedAt.

- `extract — totals reflect approved and rejected counts`
  - input: approved corpus and rejected count.
  - calls: `extract(input)`.
  - asserts: totals submitted/approved/rejected match deterministic logic.

### `src/agents/challenge-designer.ts`

Test file: `src/agents/challenge-designer.test.ts`

Tier: 3.

Test cases:

- `design — testimonial prompt returns testimonial-shaped brief`
  - input: prompt containing testimonial keywords.
  - calls: `design({ prompt })`.
  - asserts: title/primaryMetric/rubric/auditContract match testimonial shape.

- `design — unknown prompt returns generic brief`
  - input: prompt with no known keywords.
  - calls: `design({ prompt })`.
  - asserts: returns non-empty generic `ChallengeBrief` with auditContract.

### `src/agents/audit-assistant.ts`

Test file: `src/agents/audit-assistant.test.ts`

Tier: 3.

Test cases:

- `audit — returns findings with rubric breakdown and trace`
  - input: `approvedPacketA`, `sampleAuditContract`.
  - calls: `audit({ packet, contract })`.
  - asserts: participantId/declaredMetric preserved; qualityScore numeric; trace array present; adminStatus pending.

- `audit — flags missing permission/business impact according to contract`
  - input: `packetWithRejectedSignals`, `sampleAuditContract`.
  - calls: `audit({ packet, contract })`.
  - asserts: rejectedItems > 0; flags non-empty; validatedItems less than item count.

## Day-by-Day Execution Order

### Day 1 — Build the Safety Net Around LLM Boundaries

1. Add Vitest dependency, config, scripts, and setup file.
2. Add fixture files:
   - `tests/fixtures/snapshots.ts`
   - `tests/fixtures/packets.ts`
   - `tests/fixtures/findings.ts`
   - `tests/fixtures/llmResponses.ts`
   - Prioritize realistic LLM drift fixtures over pristine happy-path-only fixtures.
3. Implement `validation.test.ts` Tier 1 cases first.
4. Implement `json.test.ts` Tier 1 cases.
5. Implement `anthropic.test.ts` missing-key and success cases.
6. Implement Daremaster route Tier 1 tests, especially score leak and cache identical-input behavior.
7. Run `npm test` and `npm run typecheck`. Fix failures before moving on.

Day 1 acceptance: validators protect the invariants; Daremaster route cannot leak scores; no real Anthropic call can happen in tests.

### Day 2 — Route Coverage, Wrapper Fallbacks, and Time-Boxed Extras

1. Implement Growth route Tier 1 tests.
2. Implement Challenge Designer route Tier 1 tests, including injection-prompt behavior.
3. Implement Audit trace route Tier 1 tests.
4. Implement `src/lib/api.test.ts` Tier 1 Daremaster wrapper tests.
5. If time remains, implement Tier 2 wrapper fallback tests for Growth, Designer, and Audit trace.
6. If time remains, implement `cache.test.ts` and remaining `json.ts` / `anthropic.ts` edge cases.
7. Only after Tier 1 and useful Tier 2 are green, add Tier 3 pure-function happy-path tests.
8. Final run:
   - `npm test`
   - `npm run typecheck`
   - manual `STEP2_TESTING_PLAN.md` no-key pass

Day 2 acceptance: route handlers are directly tested, wrapper fallbacks preserve no-key demo behavior, and the manual plan remains the UI/UX safety net.

## Explicit Non-Goals

- No React component unit tests.
- No route tests that boot Next.js.
- No test server.
- No real Anthropic call in any automated test.
- No Playwright, E2E, visual regression, or performance benchmark.
- No numeric coverage threshold.

## Cut Proposal If Time Gets Tight

If one implementer cannot finish the full plan in two days, cut in this order:

1. Skip all Tier 3.
2. Skip route cache tests except Daremaster identical-input cache behavior.
3. Skip provider edge cases beyond missing-key and success in `anthropic.test.ts`.
4. Skip `MOCK_LIVE=true` entirely.
5. Keep all Tier 1 validation tests and all Tier 1 route failure tests. Do not cut Daremaster score-leak coverage.
