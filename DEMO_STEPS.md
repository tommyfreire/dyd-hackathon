# DYD Demo Steps

## Purpose

This document defines the exact demo flow for the DYD hackathon MVP.

The main goal is to guide implementation priorities. The product PRD explains what DYD is. This file explains what the video demo must show, which screens need polish, which states must be pre-seeded, and which features can remain mocked.

The demo should feel like a short product story, not a set of disconnected screens.

---

# Demo Summary

DYD is an internal, AI-powered, gamified growth challenge platform for BairesDev.

The demo follows one employee who receives a new growth challenge, joins it, participates in the public Hype Ranking, and later sees how admin review and AI assistance turn the challenge into validated marketing assets.

The narrative should be:

```text
A BairesDev employee receives a mysterious growth challenge, joins it, competes through a public Hype Ranking, submits testimonial evidence, and then sees how AI-assisted human review turns the competition into validated marketing assets.
```

---

# Main Demo Challenge

## Challenge

**DYD #001 — The Testimonial Hunt**

## Premise

Collect valuable client testimonials that show how BairesDev created real business impact.

## Reward

Trip to Buenos Aires + dinner with leadership.

## Growth Goal

Generate reusable marketing assets:

- client testimonials
- campaign quotes
- potential case studies
- LinkedIn content ideas
- landing page copy
- sales enablement snippets

## Primary Metric

Number of client testimonials collected.

## Key Rule

The public leaderboard is a **Hype Ranking** based on self-reported progress.

It is not the final ranking.

Final results are decided after human admin review, assisted by AI.

Quality can beat quantity.

---

# Demo Length

Target demo length: **3 to 5 minutes**.

The app should support a smooth click-through recording without requiring real backend integrations.

---

# Demo Roles

## Participant

Main user for the first part of the demo.

Suggested participant name:

**Sofía Rodríguez**  
Role: Customer Success Manager

The participant can:

- view the challenge
- register
- see the Hype Ranking
- comment/react
- update progress
- upload mocked evidence

## Admin

Used in the second part of the demo.

Suggested admin name:

**Valentina Ruiz**  
Role: Growth Operations Lead

The admin can:

- review participants
- inspect AI-assisted audit results
- compare Bob vs Patrick
- approve final ranking
- view generated growth insights

## DYD Bot / Daremaster

AI bot personality used for:

- challenge announcement
- registration confirmation
- Hype Ranking comments
- social feed updates
- transition copy
- dramatic narrative beats

Tone:

- mysterious
- premium
- competitive
- professional
- not childish
- not toxic

---

# Demo Mode Requirement

The MVP should include an easy way to switch demo states.

This can be implemented as a visible or hidden control.

Suggested label:

```text
Demo State
```

Suggested states:

1. `launch`
2. `registered`
3. `early_hype`
4. `participant_progress`
5. `competition_heats_up`
6. `admin_review`
7. `completed`

This is not a production feature. It exists only to make the hackathon demo easy to record.

Alternative implementation:

A simple role/state switcher in the top bar:

```text
Viewing as: Participant | Admin
Demo Stage: Launch | Day 1 | Day 10 | Final Review | Completed
```

This is acceptable for the MVP.

---

# Core Screens Needed

The demo should prioritize polish on these screens:

1. Challenge Landing Page
2. Registration Modal
3. Hype Ranking
4. Social Feed
5. Participant Dashboard
6. Admin / AI Audit Panel
7. Final Ranking
8. Growth Insights Page

The following can be lightweight:

- settings
- user profile
- full challenge creation flow
- real file upload backend
- real auth
- real notification system

---

# What Can Be Mocked

The MVP can mock the following:

- authentication
- user sessions
- real notifications
- video generation
- video playback
- file storage
- video transcription
- AI model calls
- evidence analysis
- admin permissions
- Slack/email integrations
- CRM integrations
- database persistence

The UI should make the workflow feel real, but the data can be pre-seeded.

---

# Required Pre-Seeded Data

## Challenge

```json
{
  "id": "dyd-001",
  "title": "The Testimonial Hunt",
  "number": "DYD #001",
  "description": "Collect valuable client testimonials that show how BairesDev created real business impact.",
  "reward": "Trip to Buenos Aires + dinner with leadership",
  "registrationDeadline": "May 10, 2026",
  "submissionDeadline": "May 30, 2026",
  "primaryMetric": "Client testimonials collected",
  "status": "active"
}
```

## Participants

### Sofía Rodríguez

```json
{
  "name": "Sofía Rodríguez",
  "role": "Customer Success Manager",
  "registered": true,
  "selfReportedProgress": 3,
  "evidenceStatus": "Uploaded",
  "badge": "First mover"
}
```

### Bob

```json
{
  "name": "Bob",
  "role": "Account Executive",
  "registered": true,
  "selfReportedProgress": 18,
  "evidenceStatus": "Pending review",
  "badge": "On fire",
  "hypeRank": 1,
  "aiQualityScore": 46,
  "suggestedFinalScore": 6.05,
  "flags": [
    "7 testimonials under minimum quality threshold",
    "4 missing permission confirmations",
    "Weak business impact in several testimonials"
  ],
  "recommendation": "Needs manual review"
}
```

### Patrick

```json
{
  "name": "Patrick",
  "role": "Delivery Manager",
  "registered": true,
  "selfReportedProgress": 9,
  "evidenceStatus": "AI reviewed",
  "badge": "Quality threat",
  "hypeRank": 2,
  "aiQualityScore": 91,
  "suggestedFinalScore": 10.35,
  "flags": [],
  "recommendation": "Strong candidate for winner"
}
```

### Alice

```json
{
  "name": "Alice",
  "role": "Customer Success Manager",
  "registered": true,
  "selfReportedProgress": 7,
  "evidenceStatus": "Pending review",
  "badge": "Rising",
  "hypeRank": 3,
  "aiQualityScore": 78,
  "suggestedFinalScore": 7.8,
  "flags": [
    "1 missing permission confirmation"
  ],
  "recommendation": "Good submission"
}
```

### Charlie

```json
{
  "name": "Charlie",
  "role": "Engineering Manager",
  "registered": true,
  "selfReportedProgress": 6,
  "evidenceStatus": "AI reviewed",
  "badge": "Dark horse",
  "hypeRank": 4,
  "aiQualityScore": 88,
  "suggestedFinalScore": 7.92,
  "flags": [],
  "recommendation": "Dark horse candidate"
}
```

---

# Required Global Copy

## Hype Ranking Disclaimer

This disclaimer must be visible anywhere the Hype Ranking appears:

```text
This is a Hype Ranking based on self-reported progress. Final results may change after human review.
```

## Audit Assistant Disclaimer

This disclaimer must be visible in the admin review panel:

```text
AI-assisted review. Final decision requires admin approval.
```

## Registration Commitment Copy

```text
By joining this DYD, you commit to participating before the final deadline. If you submit no valid evidence, admins may issue a DYD Strike that can affect future challenge eligibility.
```

## Growth Insight Copy

```text
DYD does not end with a winner. It ends with reusable growth assets.
```

## Core Narrative Line

Use this line in the admin or final ranking scene:

```text
Bob won the Hype Ranking. Patrick won the evidence.
```

---

# Scene-by-Scene Demo Flow

---

## Scene 1 — The Dare Drops

## User Role

Participant

## Demo State

`launch`

## Screen

Challenge Landing Page

## Goal

Show that a new DYD challenge has been launched and immediately create curiosity.

## What should be visible

- “A new DYD has been unlocked”
- DYD #001 — The Testimonial Hunt
- Reward: Trip to Buenos Aires + dinner with leadership
- Registration deadline
- Submission deadline
- DYD Bot / Daremaster video placeholder
- CTA button: `I Dare`
- short challenge description
- high-level rules
- Hype Ranking disclaimer

## DYD Bot video placeholder copy

```text
BairesDev has changed the way many clients build software.
Now we need their stories.

Collect the strongest client testimonials.
Turn client love into growth.

Do you dare?
```

## Visual Priority

This screen must feel polished and exciting. It is the first impression of the product.

## Implementation Notes

The video can be a styled placeholder. It does not need to play a real video.

Use a premium dark dashboard style with a mysterious but professional feel.

---

## Scene 2 — The Official Commitment

## User Role

Participant

## Demo State

`launch` → `registered`

## Screen

Registration Modal

## Trigger

Participant clicks:

```text
I Dare
```

## Goal

Show that joining a DYD is a formal commitment, not just clicking a casual button.

## What should be visible

- registration deadline
- submission deadline
- accepted evidence formats
- evidence requirements
- Hype Ranking disclaimer
- final human review explanation
- DYD Strike explanation
- CTA: `Accept & Join Challenge`

## Required evidence copy

For The Testimonial Hunt, accepted evidence includes:

- video testimonials
- ZIP file
- text notes
- client permission confirmation
- business impact summary

## Required fields

- client name
- client company
- client role
- permission to use testimonial
- business impact summary
- uploaded evidence

## After Submit

Show success state with DYD Bot message:

```text
You’re in.

The Hype Ranking is now live. It is based on self-reported progress, so play bold — but remember: final results belong to the evidence.
```

CTA:

```text
Go to Hype Ranking
```

## Implementation Notes

Do not redirect instantly after registration. Show the success state first because it explains the Hype Ranking and gives personality to the product.

---

## Scene 3 — Day 1 Hype Ranking

## User Role

Participant

## Demo State

`early_hype`

## Screen

Hype Ranking

## Goal

Show the initial state of the competition.

At the start, there should be no meaningful ranking yet. The board should show registered participants waiting to make their first move.

## Section Title

```text
Day 1 — The Dare begins
```

## What should be visible

- registered participants
- empty or zero progress
- no final scores
- Hype Ranking disclaimer
- social feed with early excitement
- DYD Bot message

## Suggested empty/early ranking label

```text
Registered Daredevils
```

## Example participant rows

```text
Sofía Rodríguez — Registered — No progress yet
Bob — Registered — No progress yet
Patrick — Registered — No progress yet
Alice — Registered — No progress yet
Charlie — Registered — No progress yet
```

## DYD Bot message

```text
The board is quiet… for now. First updates will shape the chase.
```

## Example social comment

```text
Love this one. Friendly competition, real impact. Let’s go.
```

## Implementation Notes

Avoid showing an empty blank screen. Even if no progress exists yet, show registered participants and early social energy.

---

## Scene 4 — Participant Makes First Move

## User Role

Participant

## Demo State

`participant_progress`

## Screen

Participant Dashboard

## Goal

Show how a registered employee actually participates.

## What should be visible

- participant status: Registered
- self-reported progress input
- evidence upload mock area
- evidence checklist
- CTA: `Update Progress`
- CTA: `Submit Evidence`

## Example action

Sofía updates:

```text
Testimonials collected: 3
```

Mock uploaded file:

```text
client-stories.zip
```

Business impact summary:

```text
Clients mention faster team scaling, delivery speed, and reduced hiring bottlenecks.
```

Permission:

```text
Permission confirmed
```

## Checklist

- client name provided
- company provided
- role provided
- permission confirmed
- business impact summary included
- evidence uploaded

## After Submit

Show confirmation:

```text
Progress updated. You’re now on the Hype Ranking.
```

Optional DYD Bot message:

```text
First move made. The chase has started.
```

## Implementation Notes

No real upload is required. A mock uploaded file state is enough.

---

## Scene 5 — Fast Forward: Competition Heats Up

## User Role

Participant

## Demo State

`competition_heats_up`

## Screen

Hype Ranking + Social Feed

## Goal

Show that the challenge became competitive and socially engaging.

## Transition Label

```text
10 days later — The competition heats up
```

## Hype Ranking

Show this tentative ranking:

```text
1. Bob — 18 testimonials — Pending review — On fire
2. Patrick — 9 testimonials — Evidence uploaded — Quality threat
3. Alice — 7 testimonials — Pending review — Rising
4. Charlie — 6 testimonials — Evidence uploaded — Dark horse
5. Sofía Rodríguez — 3 testimonials — Uploaded — First mover
```

## Required Disclaimer

```text
This is a Hype Ranking based on self-reported progress. Final results may change after human review.
```

## Social Feed Examples

### DYD Bot

```text
Bob is leading with 18 testimonials. But remember: quality can flip the board.
```

### Patrick

```text
Quality over quantity. Let’s see what the review says.
```

### Charlie

```text
Don’t count out the dark horses.
```

### Alice

```text
Just uploaded 3 new testimonials from enterprise clients.
```

### Employee comment

```text
This is getting spicy.
```

## Visual Priority

This scene should feel alive.

Use:

- reaction icons
- badges
- movement indicators
- short feed posts
- leaderboard tension

## Implementation Notes

This is one of the most important screens for the demo.

It should make DYD feel social, competitive, and fun.

---

## Scene 6 — Switch to Admin Review

## User Role

Admin

## Demo State

`admin_review`

## Screen

Admin / AI Audit Panel

## Goal

Show the most important product twist: the Hype Ranking is not the final truth.

Bob leads the Hype Ranking, but Patrick may win after evidence review.

## Required Header

```text
Final Review — The evidence decides
```

## Required Disclaimer

```text
AI-assisted review. Final decision requires admin approval.
```

## Main Layout

Use side-by-side comparison:

- Bob on the left
- Patrick on the right

This is better than a generic table for the demo because it makes the narrative obvious.

---

## Bob Review Card

```text
Bob
Account Executive

Declared: 18 testimonials
AI Quality Score: 46/100
Suggested Final Score: 6.05

Flags:
- 7 testimonials under minimum quality threshold
- 4 missing permission confirmations
- Weak business impact in several testimonials

Recommendation:
Needs manual review
```

---

## Patrick Review Card

```text
Patrick
Delivery Manager

Declared: 9 testimonials
AI Quality Score: 91/100
Suggested Final Score: 10.35

Flags:
- None

Recommendation:
Strong candidate for winner
```

---

## Required Narrative Line

```text
Bob won the Hype Ranking. Patrick won the evidence.
```

## Admin Actions

Show buttons:

- `Approve AI Recommendation`
- `Override Score`
- `Request Clarification`
- `Reject Evidence`

## Demo Action

Admin clicks:

```text
Approve AI Recommendation
```

Then show confirmation:

```text
Final ranking approved.
```

## Implementation Notes

The AI does not decide the winner. The admin approves the recommendation.

This distinction is important.

---

## Scene 7 — Final Ranking Flip

## User Role

Admin or Participant

## Demo State

`completed`

## Screen

Final Ranking

## Goal

Show that the final ranking can differ from the Hype Ranking.

## Layout

Show side-by-side comparison:

## Hype Ranking

```text
1. Bob — 18 testimonials
2. Patrick — 9 testimonials
3. Alice — 7 testimonials
4. Charlie — 6 testimonials
```

## Final Ranking

```text
1. Patrick — Final Score 10.35
2. Charlie — Final Score 7.92
3. Alice — Final Score 7.80
4. Bob — Final Score 6.05
```

## Required Explanation

```text
The Hype Ranking rewarded momentum. The Final Ranking rewarded validated impact.
```

## Visual Priority

This is a wow moment.

Make the ranking flip visually clear.

Use arrows, badges, or movement indicators if helpful.

---

## Scene 8 — Growth Insights Generated

## User Role

Admin

## Demo State

`completed`

## Screen

Growth Insights Page

## Goal

Prove that DYD is not just a game.

It produces reusable marketing and growth assets.

## Required Header

```text
Growth Package Generated
```

## Required Copy

```text
DYD does not end with a winner. It ends with reusable growth assets.
```

## Summary Metrics

```text
34 testimonials submitted
21 approved testimonials
6 campaign-ready quotes
3 potential case studies
5 sales enablement snippets
4 LinkedIn post ideas
```

## Example Best Quote

```text
“BairesDev helped us scale engineering capacity without slowing down delivery.”
```

## Example LinkedIn Post Idea

```text
What happens when companies need senior engineering talent fast?
Our clients told us directly.
```

## Example Case Study Lead

```text
Enterprise client reduced hiring bottlenecks by scaling with BairesDev in 3 weeks.
```

## Example Sales Snippet

```text
Use this quote when prospects ask about speed of team scaling and delivery continuity.
```

## Final Demo Message

End with:

```text
DYD turns internal competition into external growth.
```

---

# Demo Wow Moments

The demo should clearly include these wow moments.

## Wow Moment 1 — The Bot Challenge Drop

The challenge feels like an event, not a task.

The DYD Bot / Daremaster makes the product memorable.

## Wow Moment 2 — The Hype Ranking Comes Alive

The leaderboard and social feed create competitive tension.

The product feels fun and company-wide.

## Wow Moment 3 — Quality Beats Quantity

Bob leads the Hype Ranking, but Patrick wins after review.

This proves that DYD is not a shallow leaderboard.

## Wow Moment 4 — AI Assists, Humans Decide

The AI Audit Assistant recommends, but the admin approves.

This makes the product credible and safer.

## Wow Moment 5 — Growth Assets Are Generated

The final output is not just a winner.

The final output is usable marketing material.

---

# Implementation Priorities

## Highest Priority

Polish these:

1. Challenge Landing Page
2. Registration Modal
3. Hype Ranking
4. Social Feed
5. Admin Bob vs Patrick comparison
6. Growth Insights Page

## Medium Priority

Implement:

1. role/state switcher
2. participant progress update mock
3. evidence upload mock state
4. final ranking flip
5. reaction badges
6. bot message cards

## Low Priority

Can stay simple:

1. full profile pages
2. multiple challenge browsing
3. real forms validation
4. real uploaded files
5. real admin permissions
6. persistent comments
7. settings pages

---

# Features Not Worth Building Now

Do not invest time in:

- real authentication
- real backend
- real video processing
- real transcription
- real AI calls
- real Slack integration
- real CRM integration
- real email notifications
- real file storage
- multi-tenant permissions
- complex challenge builder
- checkpoints
- complex scoring engine
- production-ready database schema

Mock these instead.

---

# Suggested App Structure

If helpful, organize the app around demo states.

## Pages or Views

```text
/
  ChallengeLanding
  HypeRanking
  ParticipantDashboard
  AdminReview
  FinalRanking
  GrowthInsights
```

## Shared Components

```text
components/
  BotMessageCard
  ChallengeHero
  RegistrationModal
  HypeRankingTable
  SocialFeed
  ParticipantProgressCard
  EvidenceUploadMock
  AdminAuditComparison
  FinalRankingComparison
  GrowthInsightCard
  DemoStateSwitcher
  RoleSwitcher
```

## Mock Data

```text
data/
  challenge.ts
  participants.ts
  feedPosts.ts
  auditResults.ts
  growthInsights.ts
```

---

# Suggested Demo State Behavior

## `launch`

Shows:

- challenge landing
- unregistered participant state
- `I Dare` CTA

## `registered`

Shows:

- participant registered
- success message
- CTA to Hype Ranking

## `early_hype`

Shows:

- Day 1 ranking
- registered participants
- no meaningful progress yet
- early social feed

## `participant_progress`

Shows:

- participant dashboard
- progress update
- mock evidence upload

## `competition_heats_up`

Shows:

- Day 10 Hype Ranking
- Bob leading
- Patrick as quality threat
- social feed with competitive comments

## `admin_review`

Shows:

- admin review panel
- Bob vs Patrick comparison
- AI-assisted recommendation
- admin approval action

## `completed`

Shows:

- final ranking flip
- growth insights generated

---

# Important Product Principles

## 1. DYD is not a generic task manager

It should feel like an exciting company-wide growth event.

## 2. DYD is not only a leaderboard

The Hype Ranking is fun, but the final result depends on reviewed impact.

## 3. AI does not replace human judgment

AI assists admins. Humans approve final results.

## 4. The demo should emphasize growth value

The story should end with growth assets, not only with the winner.

## 5. Keep MVP scope tight

The goal is to create a strong demo foundation, not a complete enterprise system.

---

# Final Demo Flow Checklist

Use this as the recording checklist.

```text
[ ] Open participant landing page
[ ] Show new DYD challenge and bot video placeholder
[ ] Click I Dare
[ ] Show registration modal with rules
[ ] Accept and join challenge
[ ] Show bot success message
[ ] Go to Day 1 Hype Ranking
[ ] Show registered participants and early social feed
[ ] Open participant dashboard
[ ] Update progress and mock upload evidence
[ ] Fast-forward to Day 10
[ ] Show active Hype Ranking with Bob leading
[ ] Show social feed and bot tension
[ ] Switch to Admin view
[ ] Open AI Audit Panel
[ ] Compare Bob vs Patrick
[ ] Approve AI recommendation
[ ] Show final ranking flip
[ ] Open Growth Insights
[ ] Show generated marketing assets
[ ] End with “DYD turns internal competition into external growth”
```