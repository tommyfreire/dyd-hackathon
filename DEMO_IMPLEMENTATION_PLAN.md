# DYD Demo Implementation Plan

## Purpose

This document defines the next implementation pass for the DYD hackathon demo.

It explains:

- the exact demo timeline;
- how each screen should behave at each stage;
- which UI changes are required;
- how the participant and admin flows should work;
- how the AI Agents page should support the demo;
- which bugs or inconsistencies need to be fixed.

This document should be treated as the main source of truth for the next round of implementation work.

---

# General Comments

Before implementing the stage-specific demo flow, apply these general decisions across the app.

## Remove “mock” wording from the UI

Even though many things are mocked internally, remove every visible mention of:

- `mock`
- `mocked`
- `simulated`
- or similar wording

The UI should not explain that things are mocked. That is understood for the MVP/demo.

## Keep only Participant and Admin roles

The Sponsor and Spectator accounts add no real value for the current demo.

Only keep:

- Participant
- Admin

## Rename accounts

Change the admin account name to "Gabo".

Change the participant account name to "Tomi".

## Participant dashboard evidence flow

In the participant dashboard page, make it clear that the participant should upload and update **one testimonial at a time**.

The wording should be singular where appropriate.

## Hype Ranking simplification

In the Hype Ranking page:

- remove the Audit column;
- keep the ranking simpler;
- for status, show how many places each participant moved up or down from the previous demo stage.

## Reintroduce the Audit Agent

We previously removed the Audit Agent because there is already an Admin Review page.

However, bring the Audit Agent back into the AI Agents page.

The Audit Agent can simply act as another way to access the Admin Review page, but its presence enriches the AI Agents page and makes the agent layer feel more complete.

## Growth Insight Extractor availability

The Growth Insight Extractor appears only after the challenge has finished.

This applies to:

- the agent card;
- the left navigation tab.

Before the challenge is finished, the Growth Insight Extractor should not appear as a fully available page.

Once the challenge is finished:

- the Growth Insight Extractor becomes available;
- initially, it shows no generated content;
- it only shows a brief explanation of what the agent does;
- it includes a button to trigger the extractor;
- once the button is clicked, the full report appears.

---

# Demo Timeline

The demo has four stages:

1. `Launch`
2. `Day 3`
3. `Day 14`
4. `Challenge Finished`

The app should make it easy to reset and retry the demo.

Whenever the demo goes back to the initial `Launch` phase, everything should reset and be ready to record again.

---

# Stage 1 — Launch

## Demo story

Tomi, the participant, lands on the Challenge page and sees the new Daremaster video.

The initial view is only the Challenge Landing page.

At this point:

- the remaining pages in the left navigation bar are not clickable yet;
- the only two available actions are:
  - opening/playing the video;
  - clicking the `I Dare` button.

Tomi scrolls down to read the challenge specifications.

Then Tomi clicks `I Dare`, accepts the challenge, and the green “You’re in” state appears.

After Tomi accepts:

- the `Open my dashboard` button appears;
- the rest of the left navigation pages become unlocked;
- the demo briefly shows the Hype Ranking;
- the Hype Ranking only shows the registered participants;
- the Feed only shows the opening Daremaster message;
- Tomi posts a quick message.

---

# Stage 2 — Day 3

## Demo story

Tomi enters his dashboard to upload a new testimonial.

He:

- updates his self-reported progress;
- uploads the corresponding evidence video;
- fills the mandatory fields.

That is all that needs to be shown in this stage.

---

# Stage 3 — Day 14

## Demo story

Gabo, the admin, goes to the Hype Ranking.

Now things are getting more interesting.

The Hype Ranking should show a more active stage of the challenge.

There should be a new Daremaster message at the top saying something about the current leader and/or the state of the competition.

The number of testimonials for Day 14 should be adapted so it feels realistic for the new timeline.

The demo then continues with Gabo going to the AI Agents page.

Gabo clicks on the Hype Bot to generate a message for the feed.

The first generated message is trivial and not very valuable.

Gabo clicks `Re-generate`.

The second generated message is still not good enough.

Before generating again, Gabo goes to the Admin Review page through the Audit Agent.

At this stage, the Admin Review page is not as complete as it will be after the challenge has finished.

In Day 14, the Admin Review page should mainly allow the admin to:

- configure or review the scoring formula;
- evaluate the current snapshot of participant uploads;
- send that snapshot to the Hype Bot.

Gabo sends the current snapshot to the Hype Bot.

Then Gabo goes back to the AI Agents page.

The previous note offering insight from the Audit Agent should no longer be there.

Instead, a loading state should appear, something like:

```text
Audit Agent working...
```

For demo purposes, the loading state should last around 2 seconds.

Then Gabo clicks `Generate next post` again.

This time, the generated Hype Bot post is no longer trivial.

It should be a stronger, more insightful message about Charlie being a dark horse and the competition becoming more interesting.

Gabo accepts the message.

After accepting, an option to pin the message appears.

Gabo pins the message and goes to the Feed.

In the Feed:

- there are now many messages;
- the Hype Bot message is pinned at the top.

---

# Stage 4 — Challenge Finished

## Demo story

Gabo has a notification saying that the Audit Agent is ready for final assessments.

Gabo clicks the notification and is redirected to the Admin Review page.

Now the Admin Review page has the full final-review view.

Gabo:

- enters the `All Submissions` tab;
- navigates through submissions;
- overrides a score;
- declares Patrick the winner.

After declaring Patrick the winner, a notification appears saying that the Growth Insight Extractor is now available.

Gabo goes to the AI Agents page.

Then he clicks on `Growth Insights` in the left navigation bar.

At first, the Growth Insights page only shows:

- an explanation of what the agent will do;
- a button to trigger it.

Gabo clicks the trigger button.

The page loads for around 2 seconds.

Then the final Growth Insights report appears.

After that, Tomi enters the Feed.

The Feed has a pinned Daremaster post saying that the challenge has finished, results are being reviewed, and everyone should hold tight.

Then a new message arrives announcing the winner.

The winner announcement should offer a clickable link to show all the Growth Insights crafted by the Growth Insight Extractor.

The demo finishes with Gabo entering the Challenge Designer to create a new challenge.

---

# Page-Specific Changes

---

# Challenge Page

## Launch stage

### General changes

Change the dates:

```text
Register by: May 18
Submit by: June 29
```

### Participant view

In the empty space below the `I Dare` button, add a small UX hint indicating that the challenge specifications are below.

This should remove any doubt about the page structure.

It should not be too large or noisy.

Before Tomi accepts the challenge:

- the remaining three tabs in the left navigation bar should be darker;
- those tabs should not be clickable;
- the `Open my dashboard` button should not be visible.

After Tomi accepts the challenge:

- the remaining tabs become clickable;
- the tabs become visually active/white;
- the `Open my dashboard` button appears.

### Admin view

Remove the `I Dare` button for admins.

Admins do not participate in challenges.

---

# Hype Ranking

## General changes

Remove the Audit column.

The Hype Ranking should be simpler.

Instead of an audit column, use a status/movement indicator showing how many places each participant moved up or down from the previous demo stage.

Example status ideas:

```text
↑ 2 places
↓ 1 place
No movement
New entry
```

---

# Feed

## General changes

### Fix new post ordering bug

There is currently a bug when creating a new post.

The post is added to the feed, but not at the top.

New posts should appear at the top of the feed.

### Reduce repeated “just now” posts

There are too many posts labeled `just now`.

This may be causing or contributing to the ordering issue.

Make timestamps more coherent per demo stage.

---

## Launch feed state

After Tomi accepts the challenge, the Feed should show only the opening Daremaster post.

Adapt the current Daremaster message because the timeline is now longer than 14 days.

---

## Day 3 feed state

The pinned post should be from the Daremaster.

It should say that the first moves are being made and that there are 48 hours left to register.

Keep the Mateo Vega comment:

```text
Love this one...
```

Add another comment of the same nature.

The feed order should be:

1. Pinned Daremaster post
2. Mateo Vega comment
3. Another positive participant comment
4. Initial Daremaster opening post

---

## Day 14 feed state

The pinned Daremaster post at the top should talk about Charlie being a dark horse.

It should include more insight into how the participants are doing, in order to make the competition feel more exciting.

This is the stronger post generated after the Hype Bot receives insight from the Audit Agent.

---

# Participant Dashboard

## Launch / Day 3

Adapt the wording so that everything is singular.

The evidence flow should clearly communicate that testimonials are uploaded **one at a time**.

Use wording such as:

```text
Upload one testimonial
```

```text
Add testimonial evidence
```

```text
Update this testimonial
```

```text
Submit testimonial
```

Avoid wording that implies uploading many testimonials at once, unless referring to total progress.

---

# Admin Review

## General principle

The current Admin Review view is strong, but it should only appear in full after the challenge has finished.

Before the challenge finishes, the Admin Review page should be more limited.

---

## Day 14 Admin Review behavior

At Day 14, the Admin Review page should mainly support the Hype Bot insight workflow.

The available functionality should include:

- scoring formula configuration;
- evaluation of the current snapshot of participant uploads;
- a button to send the snapshot to the Hype Bot.

Suggested button copy:

```text
Send snapshot to Hype Bot
```

or:

```text
Feed current snapshot to Hype Bot
```

## Why this exists

The Audit Agent inside the Admin Review page evaluates participants with the current snapshot of their uploads and applies the configured formula.

That analysis is then sent to the Hype Bot so it can create a more insightful and dramatic feed post.

---

## Challenge Finished Admin Review behavior

When the challenge has finished, the Admin Review page shows the full final-review view.

This includes:

- all submissions;
- score details;
- score override;
- final assessment;
- winner declaration.

Gabo should be able to:

- enter the `All Submissions` tab;
- navigate through submissions;
- override a score;
- declare Patrick the winner.

---

# AI Agents Page

---

## Challenge Designer Agent

Change the placeholder text in the one-line idea field.

Currently, the placeholder contains the exact text that will be typed during the demo.

Instead, the placeholder should briefly explain what belongs in the field.

Example placeholder:

```text
Describe the growth challenge idea in one sentence...
```

or:

```text
Write a one-line growth challenge idea for the agent to expand...
```

The exact demo input should not be visible as the placeholder.

---

## Hype Bot Agent

### Suggested commentary card

The suggested commentary card should look exactly like the way it will appear in the Feed page.

This helps the admin understand what will be posted.

### Do not auto-post generated commentary

The Hype Bot should not automatically post the generated commentary.

Instead, after generating a suggestion, show two buttons:

```text
Accept suggestion
```

```text
Re-generate
```

Only after the admin accepts the suggestion should it be sent to the Feed.

### Add optional Audit Agent insight workflow

The Hype Bot card should include an option or note offering insight from the Audit Agent page.

The demo behavior should be:

1. Gabo clicks `Generate next post`.
2. A trivial post with little value is generated.
3. Gabo clicks `Re-generate`.
4. Another trivial post is generated.
5. Before clicking `Re-generate` again, Gabo goes to the Admin Review page.
6. In the Admin Review page, Gabo configures the formula.
7. Gabo clicks `Send snapshot to Hype Bot`.
8. Gabo returns to the AI Agents page.
9. The note offering Audit Agent insight should no longer be visible.
10. A loading state appears:

```text
Audit Agent working...
```

11. The loading state lasts around 2 seconds.
12. Gabo clicks `Generate next post` again.
13. The post is now insightful and stronger.
14. The message talks about Charlie being a dark horse and gives more context about the competition.
15. Gabo clicks `Accept suggestion`.
16. After accepting, an option to pin the message appears.
17. Gabo pins the message.
18. The message appears pinned at the top of the Feed.

### Important implementation detail

The improved Hype Bot post should not appear until after the Admin Review page sends the current snapshot to the Hype Bot.

This makes the demo feel credible.

The insight should not be available instantly.

Use a short 2-second loading state to make the handoff feel real.

---

## Audit Agent

Bring back the Audit Agent in the AI Agents page.

Its main purpose for now is to provide another way to access the Admin Review page.

This enriches the AI Agents page and makes the agent layer feel more complete.

---

## Growth Insight Extractor Agent

The Growth Insight Extractor should appear only once the challenge is finished.

Before the challenge is finished:

- it should not be available as a full page;
- the left navigation tab should not be available.

After the challenge is finished:

- it appears in the AI Agents page;
- the left navigation tab becomes available;
- the Growth Insights page initially shows only a brief explanation and a trigger button;
- when the button is clicked, it loads for around 2 seconds;
- then the final report appears.

---

# Final Demo Ending

The demo ends with Gabo entering the Challenge Designer Agent to create a new challenge.

The new challenge one-line idea will be related to LinkedIn posts.

The Challenge Designer should take that one-line idea and produce a structured new DYD challenge.

This final moment should communicate that DYD is not a one-off challenge.

It is a repeatable growth-challenge engine.