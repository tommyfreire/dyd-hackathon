# Step 2 brief — replacing selected mocks with real implementations

This file briefs the next AI tool. Read `PRODUCT.md` and `ARCHITECTURE.md` first; this brief sits on top.

---

## Your role

Produce a **concise, executable implementation plan** for replacing one or more of DYD's four AI agents with real LLM-driven implementations. You **scope and sequence** the work; you do **not** write the code. A separate coding tool will execute against your plan.

The end deliverable from you is one document the implementer can follow without re-deriving any decisions.

---

## Goal

Deepen the agentic layer. The recorded demo proves the product surface; live LLM-backed agents prove the platform's defensibility against automation-first hackathon competitors. Every credible mock-to-real swap strengthens the submission. Every swap that adds risk without proportional value should be skipped.

---

## Hard constraints — do not violate

- **Auth stays mocked.** No login flow.
- **Seed data stays mocked.** Challenges, participants, evidence packets remain hand-authored in `src/lib/mock-data.ts`.
- **LocalStorage state model stays.** No backend introduction. `dyd:state:v1`, `dyd:stage:v1`, `dyd:role:v1`, `dyd:formula:v1` keys are the persistence layer.
- **No I/O contract changes.** The shapes in `src/agents/types.ts` (`ChallengeBrief`, `DaremasterSnapshot`, `DaremasterPost`, `AuditFindings`, `InsightBundle`, etc.) are the contract that protects the rest of the app from the swap. Keep them. If you find a genuine reason to extend them, justify it explicitly and minimally.
- **The recorded demo is the product surface.** Live LLM outputs may diverge in tone, wording, or specific numbers, but the **structural beats** (admin sends snapshot → next post is sharper, etc.) must hold. See `DEMO.md`.
- **No scores in Daremaster posts.** The Daremaster never quotes numerical scores from the audit on the public feed (counts and qualitative descriptions are fine). This is a content invariant the user explicitly enforced.

## Soft constraints — prefer, but justify deviations

- **Anthropic API preferred.** Project context. Other providers are acceptable if you have a strong reason; flag the tradeoff.
- **Server-side LLM calls.** Use a Next.js Route Handler under `src/app/api/...` (or a server action) so the API key isn't shipped to the browser.
- **Graceful fallback.** Each live agent should fall back to its current pure-function mock when the API key is missing or the call fails. Demos must run without a key.
- **README documents what's live.** Final state: outsider can read the README, watch the recording, and know which agent outputs are deterministic recordings vs which are produced live.
- **Caching / rate limiting.** Hackathon judges may run live agents; a runaway loop should not cost the project a key. Suggest concrete mitigations (debounce, single-flight, response cache, etc.) where appropriate.

---

## Suggested priority — challenge it if you have a better one

| Tier | Agent | Why |
|---|---|---|
| **1** | **Daremaster** (feed posts) | Smallest input, short output, sits at the heart of the demo's agent-handoff narrative. Highest visibility-per-line-of-code. |
| **1** | **Growth Insight Extractor** | Medium I/O, demos as the "library out of corpus" payoff. Genuinely benefits from LLM creativity (better quotes, better drafts) over the deterministic version. |
| **2** | **Challenge Designer** | Small input / structured output. Self-contained. Less central to the pitch. |
| **3** | **AI Audit Assistant** | Hardest. Full real version requires upstream video transcription + LLM signal extraction. Cheaper option: keep structured signals mocked, swap the human-readable `trace` to LLM. Plan for the cheaper option unless you can argue the heavier one is worth it. |

You may recommend a smaller scope (e.g., only Tier 1) if you think the pitch is stronger with two well-done agents than with four shallow ones. Defend your scope choice.

---

## Output expected from you

For each agent — including ones you recommend leaving mocked — produce:

1. **Decision.** real / partial-real / stays-mocked, with one-sentence rationale.
2. **I/O contract.** Confirm the existing shapes in `src/agents/types.ts` are unchanged. If you propose changes, list them and justify each.
3. **System prompt sketch.** 2–4 sentences. Not a final prompt — just enough that the implementer knows what you'd send to the model.
4. **Architectural changes.** Concrete: which files change, what new files appear (route handlers, env vars, etc.), what existing files import from new locations.
5. **Risk callouts.** What could go wrong (latency, cost, output shape drift, prompt injection, content invariants like the no-scores rule, etc.). How to mitigate each.
6. **Out-of-scope per agent.** What you explicitly chose not to do for this agent and why.

End the document with **a single ordered task list** — Step 1, Step 2, Step 3 across all agents — so the implementer has one path to follow without re-sequencing.

Do not write code. Do not produce a finished prompt. Stop at the plan.

---

## Reading order

Read in this order, stop when you have what you need:

1. **`NEXT_STEPS.md`** — the three-step plan; you're scoping Step 2.
2. **`STEP2_BRIEF.md`** — this file. Constraints + expected output.
3. **`PRODUCT.md`** — what DYD is and the agents' product roles.
4. **`ARCHITECTURE.md`** — code map, mock/real boundaries, the I/O contract location.
5. **`DEMO.md`** — the divergence rule; what the recording locks.
6. **`src/agents/types.ts`** — exact I/O contracts.
7. **The four agent files** in this order: `src/agents/daremaster.ts`, `src/agents/insight-extractor.ts`, `src/agents/challenge-designer.ts`, `src/agents/audit-assistant.ts`. (Same order as the suggested priority — read the easy ones first to build a model, then the harder.)
8. **`src/lib/api.ts`** — where each agent is called from. Match the call sites against the agent files.
9. **The pages where the agents surface in UI** — only as needed to confirm a question:
   - `src/components/screens/AgentsPage.tsx`
   - `src/components/screens/AdminPage.tsx`
   - `src/components/screens/InsightsPage.tsx`
   - `src/components/screens/DesignerModal.tsx`

**Skip:**
- `DEMO_SCRIPT.md` — recording-only artifact. Spoken VO; not the product spec.
- `prototype/` and `prototype-components/` — historical visual reference. Not part of the running app.
- `package.json` / `tailwind.config.ts` — utility classes are not used; Tailwind config is essentially dead.

If a question can't be answered from the listed files, **ask the user before extrapolating**.
