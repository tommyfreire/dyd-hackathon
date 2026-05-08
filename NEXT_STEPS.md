# DYD — Next Steps

Three steps, in order. Step 1 is the immediate priority. Steps 2 and 3 follow
once the demo is recorded. Update this file as the work progresses so the next
session can always tell where things stand.

---

## Step 1 — Record the demo

The demo will be a series of short videos, one per stage, concatenated into the
final recording. **Recording the demo is the top priority.** Everything else
in this plan waits until the recordings are in.

### UI tweak required before recording

The current top bar exposes:

- the demo stage switcher,
- the role switcher (Tomi / Gabo),
- the **Restart demo** button.

All three break the illusion of a real product. **Remove them from the top bar.**
In their place, show a static badge with the active account's name and role —
two possible values:

- `Gabo · Admin`
- `Tomi · Participant`

The badge is purely informational. It is not a switcher. The user does not
choose anything from the top bar during the demo.

### How recording works

1. Before each take, the user tells Claude **which stage and which account**
   they are about to record.
2. Claude configures the world to match (active stage, current user, any
   in-flight flags such as `hypeBotInsightSent` / `growthInsightSent`,
   pinned posts, etc.) before the user hits record.
3. The user records the stage.
4. Repeat for every stage.

Claude will need a deterministic way to set state without the visible
switchers. A small developer-only setup mechanism is acceptable — for example,
a hidden URL pattern (`/?act=gabo:day_14`), a one-line console snippet Claude
can hand to the user, or a dev-only npm script. Pick the cleanest option that
does not leak into the recording.

### In-flight UI fixes (subset of Step 1)

It is expected that during recording the user will spot small UI issues that
slipped through. If that happens:

1. The user pauses recording and reports the issue.
2. Claude fixes it.
3. The user verifies and resumes.

These touch-ups are part of Step 1, not a separate stage.

### Stages to record

The four stages defined in `src/lib/demo-stages.ts`:

- `launch` (Tomi / Participant)
- `day_3` (Tomi / Participant)
- `day_14` (Gabo / Admin)
- `completed` (Gabo / Admin, with the participant view at the end)

The DEMO_IMPLEMENTATION_PLAN.md document contains the scene-by-scene script
that every stage should follow.

---

## Step 2 — Replace selected mocks with real implementations

Once the demo is recorded, the project's surface is locked in. From there we
can deepen the agentic side of the platform without diverging from what was
recorded.

### Out of scope (stays mocked)

- **Authentication.** Both Tomi and Gabo accounts remain mocked. The final
  README will state this explicitly with a short justification.

### In scope (candidates for real implementations)

Everything else is on the table. The first candidate is the **Hype Bot**: it
already has the structure to receive a context snapshot of the challenge, so
we can keep the snapshot mocked but make the agent itself reason over that
input and return a real post. The same approach can apply to the **Growth
Insight Extractor** (mocked corpus → real extraction).

The choice of which mocks to replace is a discussion between the user and
Claude. For each candidate, decide together:

- what stays mocked vs. what becomes real,
- which input is supplied by mock data vs. what the agent computes,
- whether the real output may diverge from the recorded demo.

### Divergence rule

The recorded demo is the **product surface**. Real-agent outputs are allowed
to differ in tone, wording, or specific numbers from what the videos show.
The README must document this: an outsider who reads the docs and watches
the demo should understand exactly which parts are deterministic recordings
and which parts are produced by live agents.

### Why this matters

The competition is heavy on automation-style products. Our pitch is the more
fun, competitive concept — but the platform's defensibility scales with the
depth of the agentic layer. Every mock we credibly replace strengthens the
case.

---

## Step 3 — Organize the project for handoff

After Step 2, the codebase needs a final pass to make it legible to any
outsider, including the people who decide the competition.

### Cleanup targets

The following auxiliary files were essential while the project was being
shaped but no longer reflect the final scope:

- `DEMO_STEPS.md`
- `DEMO_IMPLEMENTATION_PLAN.md`
- `FIRST_DRAFT_DECISIONS.md`
- `DYD_PRODUCT_CONTEXT.md`
- `SETUP.md`
- `AGENTS.md`

Some can be deleted, others folded into the README, others kept as deep-dive
appendices. Decide per-file.

### Final deliverables

- A clean **README.md** with:
  - product pitch in one paragraph;
  - what is implemented and what is mocked (with reasons);
  - how to run it locally;
  - how to navigate the demo recording;
- A **TODO list** for taking the platform to production if we win — what
  still needs to be built (real auth, persistent backend, deployment,
  monitoring, etc.);
- A repository state where opening the repo and reading the README gives a
  complete picture without requiring any other context.

This file (`NEXT_STEPS.md`) and `CLAUDE.md` can both be removed at the end
of Step 3 since they are session-handoff scaffolding, not product docs.

---

## Status

- [ ] Step 1 — Record the demo
  - [ ] Top-bar tweak (remove switchers + restart, add static account badge)
  - [ ] Stage/role pre-configuration mechanism
  - [ ] Record `launch`
  - [ ] Record `day_3`
  - [ ] Record `day_14`
  - [ ] Record `completed`
- [ ] Step 2 — Replace selected mocks
- [ ] Step 3 — Organize project for handoff
