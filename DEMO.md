# DYD — The recorded demo

What's been recorded, what it locks, and where the divergence rule applies.

---

## What the demo shows

A 3:00–3:30 walkthrough across four stages:

| Stage | Account | Beats |
|---|---|---|
| **Launch** | Tomi · Participant | Daremaster video plays cold; the pitch is delivered over the static landing; participant accepts the Dare; locked tabs unlock; first feed post lands. |
| **Day 3** | Tomi · Participant | Dashboard tour (Hype rank + Testimonials KPI + quality checklist); fills the form one field at a time; uploads the video; submits; testimonial count auto-bumps; Hype rank ticks up. |
| **Day 14** | Gabo · Admin | Admin checks the Hype Ranking; opens the Daremaster card; gets two flat trivial posts; opens Admin Review; tunes the formula (quality vs quantity + per-criterion rubric weights); sends snapshot to the Daremaster; loader plays; next generation produces the strong "Charlie's the dark horse" post; admin pins it. |
| **Completed** | Gabo · Admin | Audit Assistant has done its full pass; admin reviews submissions, overrides one score; clicks **Accept Scores**; the Confirm-the-winner ranking modal pops up; declares Patrick the winner; runs the Growth Insight Extractor; sends the bundle to the Daremaster; generates the winner-announcement post (with a "See the growth report" CTA back to `/insights`); opens Challenge Designer to draft the next Dare. |

The recording script with the full voice-over and stage directions is in `DEMO_SCRIPT.md`. The script is the user's working file for recording — **it is not part of the canonical product spec** and an AI tool planning Step 2 does not need to read it.

---

## Why this matters for Step 2

The recording is the **product surface**. Specific wording, scores, post phrasing, and the order of operations are what an outside viewer sees and judges.

NEXT_STEPS.md locks the divergence rule:

> Real-agent outputs are allowed to differ in tone, wording, or specific numbers from what the videos show. The README must document this: an outsider who reads the docs and watches the demo should understand exactly which parts are deterministic recordings and which parts are produced by live agents.

In practical terms, this means:

- A live LLM-backed Daremaster is **allowed** to produce a different "Charlie's the dark horse" post — different wording, different specific numbers, even a different framing — as long as the **structural beat** holds: admin sends snapshot → next post is sharper than the trivial variant. That's the moment the demo records, and that moment must keep working.
- A live Growth Insight Extractor may produce different quotes / case studies / drafts on each run. The shape (3 quotes, ~3 case studies, ~3 snippets, 2 LinkedIn drafts) and the page layout are fixed; the contents can vary.
- The README must declare which agents are live and which are mocked, so an outsider isn't confused when the live output diverges from the recording.

The recording is **locked**. We are not re-recording it as part of Step 2 or Step 3. If the live-agent work happens to produce a strictly better demo path, that's a bonus, not a requirement.

---

## What the recording does *not* show, and why it matters

A few moments in the demo flow rely on adjacent infrastructure that an AI tool should be aware of:

- **The `?act=` URL.** Each stage of the recording starts from a clean act URL (e.g. `/?act=gabo:day_14`). This calls `resetState()` (clears `dyd:state:v1` and `dyd:formula:v1`) and `setDemoStage(stage)` (rebuilds the snapshot from `mock-data.ts`). The URL is then stripped from the address bar and the page reloads. If you swap an agent and the recorded post is now a different shape, the act URL still rebuilds the world clean. It's a recording mechanism, not part of production.
- **Handoff loaders.** Stage 4 has a dual-handoff loader (audit final ~5 s, growth ~2 s) that sits between "send snapshot to Daremaster" and the next generation. The loader is decorative — it visualizes the agent-to-agent collaboration. The CTA on the winner post (`See the growth report`) currently attaches to *any* post the admin makes during the completed stage, regardless of loader state, so the demo doesn't break if timing slips.
- **The Daremaster's persona unification.** The agent that posts in the feed and the voice in the launch video are **the same persona** (called "Daremaster" everywhere user-visible). Earlier iterations split these into two named agents; treat the unification as the canonical state.

If a live LLM call shifts the wording of any of these moments, the demo still tells the right story — just with different sentences. That's the whole point of the divergence rule.
