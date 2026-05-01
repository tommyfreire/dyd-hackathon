# DYD — Do You Dare?

## Product Context

DYD stands for **Do You Dare?**

DYD is an internal BairesDev hackathon product concept. It is an AI-powered company-wide growth challenge platform.

The idea is that BairesDev leadership periodically launches internal challenges connected to marketing or growth. Employees can register before a deadline, compete in a fun and social way, self-report their progress, upload evidence, and appear in a dynamic public ranking.

The product should feel like a mix between:

- an internal growth campaign platform;
- a gamified competition hub;
- a social feed;
- a leaderboard;
- and an AI-assisted growth operations tool.

The MVP should not be huge. It should be a solid base that can be iterated later.

The app needs a UI because the hackathon requires a video demo.

---

## Core Product Statement

**DYD turns every employee into a potential growth contributor through AI-powered internal challenges.**

Employees are invited to compete in short, exciting, company-wide challenges that produce real growth assets: testimonials, leads, referrals, case studies, content ideas, market intelligence, or campaign amplification.

---

## Main Demo Challenge

For the MVP/demo, use one active challenge:

## DYD #001 — The Testimonial Hunt

### Challenge Premise

Collect valuable client testimonials that show how BairesDev created real business impact.

### Growth/Marketing Goal

Generate reusable marketing assets:

- client testimonials;
- social proof;
- campaign quotes;
- case study leads;
- sales enablement snippets;
- landing page material;
- LinkedIn post ideas.

### Reward

Trip to Buenos Aires + dinner with leadership.

### Primary Metric

Number of client testimonials collected.

### Important Rule

The public ranking is not the final result.

The visible ranking is called the **Hype Ranking**. It is based on self-reported progress and is intentionally tentative.

Final results are decided only after human admin review.

Quality matters more than raw quantity.

Example:

- Bob self-reports 18 testimonials.
- Patrick self-reports 9 testimonials.
- Bob appears first in the Hype Ranking.
- Patrick appears below Bob.
- After review, Patrick may win because his testimonials are longer, more specific, include clear business impact, and have permission to be used.

---

## MVP Scope

The MVP should implement a polished prototype, not a full production system.

### Required MVP Features

1. Challenge landing page
2. Video placeholder for the DYD Bot / Daremaster announcement
3. Registration flow
4. Hype Ranking
5. Social feed
6. Participant dashboard
7. Evidence upload mock UI
8. Admin review panel
9. AI agents panel
10. Growth insights page

### Not Required for MVP

The following can be mocked:

- real authentication;
- real video generation;
- real video transcription;
- real file storage;
- real AI model calls;
- real notifications;
- real CRM integration;
- real admin permissions;
- real audit automation.

The product should be designed in a way that these can be added later.

---

## Main User Roles

## 1. Sponsor

Usually the CEO or a growth leader.

The sponsor launches the challenge and gives it visibility.

The sponsor does not need to manually audit every submission.

## 2. Challenge Owner

Person responsible for configuring and managing the challenge.

Can define:

- title;
- description;
- reward;
- deadlines;
- rules;
- scoring rubric;
- evidence requirements;
- auditors;
- challenge status.

## 3. Participant

An employee who registers for a challenge before the registration deadline.

Can:

- join the challenge;
- self-report progress;
- upload evidence;
- appear on the Hype Ranking;
- comment in the feed;
- submit final evidence.

## 4. Spectator

Any employee who is not necessarily participating.

Can:

- view the challenge;
- view the Hype Ranking;
- comment;
- react;
- follow the competition.

A user does not need to be registered to participate socially.

## 5. Admin / Auditor

Human reviewer who validates evidence and approves final results.

Can:

- review participant submissions;
- see AI-suggested scores;
- see AI-detected flags;
- approve evidence;
- reject evidence;
- override scores;
- declare final winners.

---

## Key Product Decisions

## No Checkpoints

There are no formal checkpoints.

Checkpoints add complexity and are not necessary for the MVP.

Participants can update their self-reported progress whenever they want before the final deadline.

The Hype Ranking updates based on self-reported progress.

Final review happens after the submission deadline.

---

## Hype Ranking

The Hype Ranking is the public, dynamic leaderboard.

It is based on self-reported progress.

It is designed to create competition, tension, and engagement.

It should always include a disclaimer:

> This is a Hype Ranking based on self-reported progress. Final results may change after human review.

The Hype Ranking is intentionally not guaranteed to match the final result.

This creates a fun uncertainty: a participant with fewer but higher-quality submissions can still win.

---

## Final Ranking

The Final Ranking is determined after human admin review.

The AI Audit Assistant can recommend scores, but humans make the final decision.

The final ranking can differ from the Hype Ranking.

---

## Registration Rules

Participants must register before the registration deadline.

They cannot wait to see if they are doing well and then register later.

The registration page/modal must clearly explain:

- registration deadline;
- submission deadline;
- challenge rules;
- reward;
- evidence requirements;
- self-reported ranking disclaimer;
- final human review process;
- participation expectations;
- possible DYD Strike if someone registers and submits no valid evidence.

---

## DYD Strike

A DYD Strike is a soft penalty.

If a participant registers but submits no valid evidence, admins may issue a DYD Strike.

A DYD Strike may affect eligibility for future DYDs.

This should not be automatic or permanent.

Admins decide whether to issue a strike.

Reasons not to automatically punish:

- illness;
- project emergency;
- client work priority;
- legitimate inability to participate.

---

## Evidence

For The Testimonial Hunt, accepted evidence can include:

- video testimonials;
- ZIP file containing multiple testimonials;
- text notes;
- permission confirmation;
- business impact summary;
- client metadata.

Required fields:

- client name;
- client company;
- client role;
- permission to use testimonial;
- business impact summary;
- uploaded evidence.

For the MVP, evidence upload can be mocked.

The UI should show uploaded files and review statuses.

Possible evidence statuses:

- Not submitted
- Uploaded
- Pending review
- AI reviewed
- Approved
- Rejected
- Needs clarification

---

## AI Agents

DYD should feel agentic.

The product has four AI-powered agents.

These agents can be mocked for the MVP but should be represented clearly in the UI and product architecture.

---

# Agent 1: Challenge Designer

## Purpose

Helps leadership turn a rough growth idea into a complete DYD challenge.

## Input Example

> I want employees to collect client testimonials for marketing.

## Output

The Challenge Designer generates:

- challenge title;
- challenge description;
- business goal;
- reward suggestion;
- registration deadline;
- submission deadline;
- rules;
- scoring rubric;
- evidence requirements;
- red flags;
- Hype Ranking disclaimer;
- internal notification copy;
- DYD Bot video script;
- social feed launch message.

## Demo Behavior

In the MVP, this can be shown as an AI panel where a sponsor prompt becomes a complete challenge configuration.

---

# Agent 2: Hype Bot

## Purpose

Keeps the challenge alive socially.

The Hype Bot generates:

- leaderboard updates;
- reminder messages;
- motivational posts;
- playful competitive comments;
- deadline reminders;
- dramatic but professional challenge updates.

## Example Hype Bot Messages

- “Bob is leading with 18 testimonials. But remember: quality can flip the board.”
- “Patrick just uploaded new evidence. The leaderboard may not tell the full story.”
- “48 hours left. The Dare is still open.”
- “Charlie is a dark horse. Fewer testimonials, but potentially stronger stories.”
- “The Hype Ranking is heating up. Final audit will decide the real winner.”

## Tone

- fun;
- mysterious;
- competitive;
- professional;
- not childish;
- not toxic.

---

# Agent 3: AI Audit Assistant

## Important Clarification

The AI Audit Assistant is not the final judge.

It does not decide the winner.

It assists human admins.

Final decisions require human approval.

## Purpose

The AI Audit Assistant helps admins review submitted evidence based on the challenge's audit contract.

It can:

- summarize evidence;
- analyze transcript text;
- check required fields;
- detect red flags;
- suggest quality scores;
- suggest final score;
- explain why someone may rank above another participant;
- recommend whether evidence should be approved, rejected, or manually reviewed.

## MVP Simplification

For the MVP, real video processing can be mocked.

The app does not need to actually process video.

The UI can show pre-generated AI audit results.

Possible mocked behavior:

- show fake transcript snippets;
- show fake AI quality score;
- show fake detected flags;
- show fake suggested final score;
- allow admin to approve, reject, or override.

## Real Future Implementation

For real implementation, the system could:

1. Upload video.
2. Extract audio.
3. Transcribe audio.
4. Analyze transcript using the audit contract.
5. Detect red flags.
6. Suggest a score.
7. Require human admin approval.

The agent should mostly analyze text and structured metadata, not rely on full video understanding in the MVP.

---

# Agent 4: Growth Insight Extractor

## Purpose

Turns the challenge outcome into useful marketing/growth material.

After the challenge ends, this agent extracts:

- best testimonials;
- strongest quotes;
- campaign angles;
- potential case studies;
- sales enablement snippets;
- LinkedIn post drafts;
- landing page copy ideas;
- recurring objections or benefits mentioned by clients;
- growth insights.

## Example Output

- 34 testimonials submitted
- 21 approved testimonials
- 6 strong campaign quotes
- 3 potential case studies
- 5 sales enablement snippets
- 4 LinkedIn post ideas

This agent is important because it proves that DYD is not just a competition. It produces real growth assets.

---

## Audit Contract

Each DYD must define an Audit Contract.

The Audit Contract allows the AI Audit Assistant to be generic and reusable.

Do not hardcode the audit logic only for “The Testimonial Hunt”.

Each challenge should define:

- primary metric;
- accepted evidence types;
- required fields;
- scoring rubric;
- red flags;
- final scoring formula;
- audit mode;
- final decision owner.

Example:

```json
{
  "challengeId": "dyd-001",
  "name": "The Testimonial Hunt",
  "primaryMetric": {
    "key": "testimonial_count",
    "label": "Number of testimonials",
    "type": "number",
    "higherIsBetter": true
  },
  "evidence": {
    "acceptedTypes": ["video", "zip", "text"],
    "requiredFields": [
      "clientName",
      "clientCompany",
      "clientRole",
      "permissionToUse",
      "businessImpactSummary"
    ]
  },
  "auditMode": "ai_assisted_human_approved",
  "rubric": [
    {
      "key": "clarity",
      "label": "Clarity of testimonial",
      "weight": 20
    },
    {
      "key": "businessImpact",
      "label": "Business impact",
      "weight": 30
    },
    {
      "key": "clientRelevance",
      "label": "Client relevance",
      "weight": 20
    },
    {
      "key": "specificity",
      "label": "Specificity of the result",
      "weight": 20
    },
    {
      "key": "permissionCompleteness",
      "label": "Permission and usage readiness",
      "weight": 10
    }
  ],
  "redFlags": [
    "testimonial_under_10_seconds",
    "missing_client_permission",
    "unclear_business_impact",
    "duplicate_submission",
    "not_related_to_bairesdev"
  ],
  "finalScoreFormula": "validated_metric * quality_multiplier",
  "finalDecisionOwner": "admins"
}
```

---

## Suggested Score Logic

The MVP can use a simple conceptual scoring model.

Final Score:

```text
validated_metric * quality_multiplier
```

Example:

Bob:

- declared metric: 18 testimonials;
- validated items: 11;
- quality score: 46/100;
- quality multiplier: 0.55;
- suggested final score: 6.05.

Patrick:

- declared metric: 9 testimonials;
- validated items: 9;
- quality score: 91/100;
- quality multiplier: 1.15;
- suggested final score: 10.35.

This demonstrates why Patrick can beat Bob despite having fewer testimonials.

---

## Sample Participants

Use these sample participants in the demo.

## Bob

- role: Account Executive
- self-reported progress: 18 testimonials
- evidence status: Pending review
- Hype Ranking: #1
- AI quality score: 46/100
- flags:
  - 7 testimonials under minimum quality threshold
  - 4 missing permission confirmation
  - weak business impact in several testimonials
- suggested final score: 6.05
- admin recommendation: Needs manual review

## Patrick

- role: Delivery Manager
- self-reported progress: 9 testimonials
- evidence status: Uploaded
- Hype Ranking: #2
- AI quality score: 91/100
- flags: none
- suggested final score: 10.35
- admin recommendation: Strong candidate for winner

## Alice

- role: Customer Success Manager
- self-reported progress: 7 testimonials
- evidence status: Pending review
- Hype Ranking: #3
- AI quality score: 78/100
- flags:
  - 1 missing permission confirmation
- suggested final score: 7.8
- admin recommendation: Good submission

## Charlie

- role: Engineering Manager
- self-reported progress: 6 testimonials
- evidence status: Uploaded
- Hype Ranking: #4
- AI quality score: 88/100
- flags: none
- suggested final score: 7.92
- admin recommendation: Dark horse candidate

---

## Main UI Screens

## 1. Notification / Announcement

Purpose:
Show that a new DYD has been launched.

Content:

- “A new DYD has been unlocked.”
- challenge title;
- reward teaser;
- CTA: “View Challenge”;
- sender: DYD Bot or Daremaster.

---

## 2. Challenge Landing Page

Purpose:
Main challenge page.

Content:

- title: DYD #001 — The Testimonial Hunt
- video placeholder for DYD Bot announcement
- reward card
- registration deadline
- submission deadline
- CTA: “I Dare”
- rules
- scoring explanation
- evidence requirements
- Hype Ranking disclaimer

Important copy:

> This Hype Ranking is based on self-reported progress. Final results may change after human review.

---

## 3. Registration Modal

Purpose:
User joins the challenge.

Content:

- registration deadline;
- submission deadline;
- challenge commitment;
- DYD Strike explanation;
- evidence requirements;
- final review explanation.

CTA:

- “Accept & Join Challenge”

---

## 4. Hype Ranking

Purpose:
Public tentative ranking.

Columns:

- rank;
- participant;
- role;
- self-reported progress;
- evidence status;
- momentum badge;
- comments/reactions.

Disclaimer required.

Example badges:

- On fire
- Quality threat
- Rising
- Dark horse
- Needs evidence
- Awaiting review

---

## 5. Social Feed

Purpose:
Make the challenge feel alive.

Anyone can comment, even non-participants.

Post types:

- Hype Bot update;
- participant update;
- employee comment;
- admin announcement;
- deadline reminder;
- ranking movement.

Reactions:

- fire;
- clap;
- rocket;
- eyes;
- trophy.

---

## 6. Participant Dashboard

Purpose:
Registered user manages their participation.

Content:

- status: Registered
- self-reported metric input
- uploaded evidence list
- progress update form
- evidence checklist
- CTA: “Update Progress”
- CTA: “Submit Evidence”

Checklist:

- client name provided;
- company provided;
- role provided;
- permission confirmed;
- business impact summary included;
- evidence uploaded.

---

## 7. Admin / Auditor Panel

Purpose:
Human admins review submissions with AI assistance.

Content:

- participant list;
- declared metric;
- evidence status;
- AI quality score;
- AI flags;
- suggested final score;
- recommended ranking;
- admin actions.

Admin actions:

- Approve
- Reject
- Override Score
- Request clarification
- Issue DYD Strike
- Declare winner

Important label:

> AI-assisted review. Final decision requires admin approval.

---

## 8. Agent Operations Panel

Purpose:
Show the agentic nature of the product.

Content:

- Challenge Designer card
- Hype Bot card
- AI Audit Assistant card
- Growth Insight Extractor card

Each card should show:

- purpose;
- sample input;
- sample output;
- status;
- latest action.

---

## 9. Growth Insights Page

Purpose:
Show what marketing/growth got from the challenge.

Content:

- winner;
- total submissions;
- approved testimonials;
- rejected testimonials;
- best quotes;
- potential case studies;
- LinkedIn post ideas;
- sales snippets;
- campaign copy suggestions.

Example output:

```text
DYD generated:
- 34 submitted testimonials
- 21 approved testimonials
- 6 strong campaign quotes
- 3 potential case studies
- 5 sales enablement snippets
- 4 LinkedIn post ideas
```

---

## Data Model Suggestions

The implementation can use mock data.

Suggested objects:

## Challenge

```ts
type Challenge = {
  id: string;
  number: string;
  title: string;
  description: string;
  sponsor: string;
  reward: string;
  registrationDeadline: string;
  submissionDeadline: string;
  status: "draft" | "open" | "in_progress" | "review" | "completed";
  primaryMetricLabel: string;
  primaryMetricKey: string;
  hypeRankingDisclaimer: string;
  auditContract: AuditContract;
};
```

## Participant

```ts
type Participant = {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  registered: boolean;
  selfReportedValue: number;
  evidenceStatus:
    | "not_submitted"
    | "uploaded"
    | "pending_review"
    | "ai_reviewed"
    | "approved"
    | "rejected"
    | "needs_clarification";
  hypeRank: number;
  finalRank?: number;
  badges: string[];
  strikeRisk?: boolean;
};
```

## EvidenceSubmission

```ts
type EvidenceSubmission = {
  id: string;
  participantId: string;
  challengeId: string;
  files: EvidenceFile[];
  clientName?: string;
  clientCompany?: string;
  clientRole?: string;
  permissionToUse: boolean;
  businessImpactSummary: string;
  submittedAt: string;
};
```

## AuditResult

```ts
type AuditResult = {
  participantId: string;
  declaredMetric: number;
  validatedItems: number;
  rejectedItems: number;
  qualityScore: number;
  qualityMultiplier: number;
  suggestedFinalScore: number;
  flags: string[];
  recommendation: string;
  adminStatus: "pending" | "approved" | "rejected" | "overridden";
};
```

## FeedPost

```ts
type FeedPost = {
  id: string;
  author: string;
  authorType: "bot" | "participant" | "admin" | "employee";
  content: string;
  createdAt: string;
  reactions: {
    fire: number;
    clap: number;
    rocket: number;
    eyes: number;
    trophy: number;
  };
  comments?: FeedComment[];
};
```

---

## UI Tone

The UI should feel:

- premium;
- energetic;
- slightly mysterious;
- competitive;
- social;
- professional;
- modern;
- demo-ready.

Avoid making it too childish or too gamer-like.

This is an internal BairesDev product for a professional environment.

---

## Suggested Product Copy

## Main Slogan

```text
Do You Dare to turn growth into a company-wide game?
```

## Challenge Subtitle

```text
Collect client stories. Create marketing impact. Climb the Hype Ranking.
```

## Hype Ranking Disclaimer

```text
This ranking is based on self-reported progress. Final results may change after human review.
```

## Registration Warning

```text
By joining this DYD, you commit to participating before the final deadline. If you submit no valid evidence, admins may issue a DYD Strike that can affect future challenge eligibility.
```

## Audit Assistant Label

```text
AI-assisted review. Final decision requires admin approval.
```

## Growth Insights Label

```text
DYD does not end with a winner. It ends with reusable growth assets.
```

---

## Demo Narrative

The video demo should follow this story:

1. A new DYD notification appears.
2. The employee opens the challenge page.
3. The DYD Bot video introduces the challenge and reward.
4. The employee reads the rules and joins.
5. The employee sees the Hype Ranking.
6. The social feed shows competitive energy.
7. The participant updates progress and uploads evidence.
8. Admins enter the review panel.
9. The AI Audit Assistant compares Bob and Patrick.
10. Bob was leading the Hype Ranking, but Patrick has stronger evidence.
11. Admins approve the final ranking.
12. The Growth Insight Extractor turns submissions into marketing assets.

---

## Core Message for Hackathon Pitch

DYD is not just a leaderboard.

DYD is a growth engine.

It transforms employees into distributed growth contributors, uses AI agents to design and operate challenges, creates social competition, and turns employee-driven efforts into reusable marketing assets.

---

## Implementation Guidance

Prioritize frontend polish and narrative clarity.

Use mock data.

Do not overbuild backend logic.

The most important demo moments are:

1. The challenge page feels exciting.
2. The Hype Ranking creates tension.
3. The social feed makes it feel alive.
4. The admin panel proves that quality can beat quantity.
5. The agent panel makes the product clearly agentic.
6. The growth insights page proves business value.

---

## MVP Success Criteria

The MVP succeeds if a viewer understands:

- what DYD is;
- why employees would participate;
- how it connects to growth/marketing;
- why the ranking is fun but not final;
- how AI agents improve the workflow;
- how admins remain in control;
- how the final output becomes useful marketing material.

---

## Future Iterations

Possible future features:

- real SSO;
- Slack integration;
- email notifications;
- real AI video generation;
- real video transcription;
- real CRM integration;
- real file storage;
- challenge templates;
- recurring DYD seasons;
- badges and employee reputation;
- analytics dashboard;
- team-based DYDs;
- department-based competitions;
- marketplace of rewards;
- automatic campaign creation from Growth Insight Extractor.

---

## Final Product Definition

DYD is an internal, AI-powered, gamified growth challenge platform.

Leadership launches marketing or growth challenges.

Employees register before a deadline, compete publicly through a self-reported Hype Ranking, and submit evidence.

The community can comment and react, creating a fun competitive atmosphere.

AI agents help design challenges, generate hype, assist admins during review, and extract reusable growth insights.

Admins make final decisions.

The final result is not only a winner, but a package of useful assets for BairesDev growth and marketing.