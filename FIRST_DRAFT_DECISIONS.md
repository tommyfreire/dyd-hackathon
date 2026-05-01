# DYD — First Draft Decisions

This document captures every product, design, and engineering decision made during the wireframe → first-draft phase. **Read this before touching code or making product calls.** Pair with `DYD_PRODUCT_CONTEXT.md` (the PRD) — that file says *what* DYD is; this file says *how* we are building the first version and *why*.

---

## 1. Stack & Repo

| Concern | Decision | Rationale |
|---|---|---|
| Framework | **Next.js 14 (App Router)** + TypeScript + React Server Components where useful | Easiest path from prototype → real backend. RSC + route handlers give us `/api/*` for free when Claude Code wires real APIs. Vercel-deployable. |
| Styling | **Tailwind CSS** + design tokens in `src/styles/tokens.css` | Token file is copied verbatim from the BairesDev design system (DS3). Tailwind reads CSS variables from it. No design drift. |
| UI primitives | **shadcn/ui** (Radix + Tailwind) | Copy-pasted into `src/components/ui/*`, owned by us. Claude Code can edit freely. |
| Icons | **lucide-react** | Per design system rules. |
| Fonts | **Outfit** (variable + static fallbacks) self-hosted in `/public/fonts` | BairesDev brand font. Already copied. |
| State | React state + URL state (`useSearchParams`) for tabs/role switcher. **No Redux, no Zustand for the MVP.** | Mock data is read once; admin actions are local-only. Add a real store only when the backend lands. |
| Data fetching | **`/src/lib/api.ts`** — typed fake API layer that returns mocks via `Promise.resolve(structuredClone(...))` with a 150–300ms artificial delay | One file to swap when the real backend exists. Functions match what the backend should expose. |
| Auth | **None.** A dev-only role switcher in the top bar (`Participant | Admin | Sponsor | Spectator`) writes to `localStorage` and gates UI. | Real SSO is post-MVP. The role switcher is a *feature* of the demo, not a bug. |
| AI | **Direct `window.claude.complete` calls** in the Challenge Designer and AI Audit Assistant panels (HTML preview build only). In the Next.js repo, these are wrapped in `/src/lib/ai.ts` with a TODO marker for Claude Code to swap to the Anthropic SDK. | Demos beautifully without a backend. Repo is honest about where the swap goes. |

---

## 2. Visual direction (which wireframe variants we promoted)

After exploring the wireframes (`DYD Wireframes v2.html`), we promoted this combo:

- **Landing → Variant B (poster manifesto):** big "DO YOU DARE." headline, video panel, reward card, "I DARE" CTA. More memorable for a demo than a dashboard hero.
- **Hype Ranking → Variant B (twin meters):** every participant shows a **Hype bar** *and* an **Audit bar** side by side. This is the single most important visual idea in the product — it telegraphs "self-reported ≠ truth" before the user reads a word of copy.
- **Admin Review → Variant B (Bob vs Patrick split):** the admin landing screen is the side-by-side compare of #1 and #2, not an inbox queue. Inbox queue still exists as a secondary view.
- **Notification, Registration, Feed, Participant Dashboard, Agents, Insights:** single canonical layout each — variants from wireframes deliberately collapsed for the first draft.

**Theme:** dark only. The brand reads premium dark; "Do You Dare" reads mysterious dark. A light mode is not on the MVP roadmap.

**Brand:** BairesDev branded throughout — logo top-left of sidebar, the 8px orange top bar on every full-page surface, orange period (`.`) on the headline, Outfit bold display.

---

## 3. Information architecture

Sidebar nav, in order:

1. **Challenge** (`/`) — landing page; the hero of the app.
2. **Hype Ranking** (`/ranking`)
3. **Feed** (`/feed`)
4. **My Dashboard** (`/dashboard`) — only visible when role is Participant.
5. **Admin Review** (`/admin`) — only visible when role is Admin.
6. **AI Agents** (`/agents`)
7. **Growth Insights** (`/insights`)

Top bar (always visible):
- Logo + "DYD" wordmark
- **Role switcher** (dev only, but always shown in MVP)
- DYD #001 challenge pill (status: "OPEN")
- Notification bell with the Daremaster announcement

Modals / overlays:
- **Registration modal** — opens from any "I Dare" CTA. Multi-step: rules → strike warning → confirm.
- **Notification dropdown** — bell click. Shows the launch announcement. Has its own "View Challenge" CTA.

---

## 4. Mock data

Single source: **`src/lib/mock-data.ts`**. Exports:

- `currentChallenge: Challenge` — DYD #001 The Testimonial Hunt, with the full audit contract inline.
- `participants: Participant[]` — Bob, Patrick, Alice, Charlie + 12 padding participants for the ranking. Bob is #1 in Hype, Patrick is #2 in Hype but #1 in Audit.
- `feedPosts: FeedPost[]` — 12 posts mixing Hype Bot, participant updates, employee comments, deadline reminders.
- `auditResults: Record<string, AuditResult>` — full audit data for Bob and Patrick (matches PRD §"Suggested Score Logic"); partial for Alice and Charlie.
- `evidenceSubmissions: EvidenceSubmission[]` — 4–6 sample submissions.
- `agents: AgentSnapshot[]` — Designer / Hype Bot / Audit / Insight Extractor with sample IO.
- `growthAssets: GrowthAssetBundle` — the 21 approved testimonials → 6 quotes → 3 case studies → 5 snippets → 4 LI posts breakdown from the PRD.
- `currentUser: User` — derived from the role switcher.

Types live in **`src/lib/types.ts`** (lifted directly from the PRD's TypeScript suggestions). Do not redefine these types in components — import them.

---

## 5. Fake API contract

`src/lib/api.ts` exports the surface Claude Code will replace with real fetches:

```ts
// Reads
getChallenge(id: string): Promise<Challenge>
getParticipants(challengeId: string): Promise<Participant[]>
getHypeRanking(challengeId: string): Promise<RankingEntry[]>
getFeed(challengeId: string, cursor?: string): Promise<FeedPage>
getMySubmission(challengeId: string, userId: string): Promise<EvidenceSubmission | null>
getAuditQueue(challengeId: string): Promise<AuditResult[]>
getAuditResult(participantId: string): Promise<AuditResult>
getAgents(): Promise<AgentSnapshot[]>
getGrowthAssets(challengeId: string): Promise<GrowthAssetBundle>

// Writes (mutate in-memory; persist to localStorage so demo state survives refresh)
register(challengeId: string, userId: string): Promise<void>
updateSelfReport(challengeId: string, userId: string, value: number): Promise<Participant>
submitEvidence(challengeId: string, userId: string, draft: EvidenceDraft): Promise<EvidenceSubmission>
postFeedComment(challengeId: string, content: string): Promise<FeedPost>
react(postId: string, kind: ReactionKind): Promise<FeedPost>
adminApprove(participantId: string): Promise<AuditResult>
adminReject(participantId: string, reason: string): Promise<AuditResult>
adminOverrideScore(participantId: string, score: number): Promise<AuditResult>
adminIssueStrike(participantId: string, reason: string): Promise<Participant>
adminDeclareWinner(participantId: string): Promise<Challenge>
```

Every function is **typed end-to-end**. Every function has a 150–300ms artificial delay so loading states are real. Writes mutate an in-memory store *and* push to `localStorage` under `dyd:state:v1` — so the demo survives reload.

When Claude Code adds the backend, it should:
1. Replace each function body with a `fetch()` call to a route handler in `/app/api/*`.
2. Keep the signatures *exactly* the same.
3. Build the route handlers + DB layer to honor the same shapes.

---

## 6. AI agents — what's real vs mocked

| Agent | First draft behavior | Real behavior (post-MVP) |
|---|---|---|
| **Challenge Designer** | Real `window.claude.complete` call. User types a one-line growth goal; we send a structured system prompt that asks for JSON matching `Challenge` shape; we render the result inline. | Server-side Anthropic SDK call with the same prompt. Persists draft challenge. |
| **Hype Bot** | Mocked. Pre-written posts already in the feed. A "Generate post" button on the Agents panel can call Claude live to write a new one. | Cron-triggered server function that posts to the feed. |
| **AI Audit Assistant** | Real `window.claude.complete` call **for the Bob vs Patrick comparison only.** Fed pre-extracted "transcripts" + audit contract; asked to return JSON with score + flags + recommendation. The rest of the queue uses pre-baked mocks. | Server-side: video → audio → transcript → Claude → human approval. |
| **Insight Extractor** | Mocked. Static `growthAssets` bundle. | Server-side batch job over approved evidence. |

Every agent panel shows: purpose, sample input, current output, status, last action time. Real and mocked agents are visually identical so swapping is invisible to the user.

---

## 7. Interaction depth (what works for real)

- **Registration:** writes to `participants[]`, flips the user to Registered, unlocks `My Dashboard`.
- **Self-report update:** rewrites the participant's `selfReportedValue`, recomputes Hype rank, animates the bar.
- **Evidence upload:** file picker accepts but does not transmit. Stores filename + size. Status flips to "Uploaded".
- **Feed comment:** posts as the current user, prepends to the feed.
- **Reactions:** click to increment/decrement, optimistic.
- **Admin Approve / Reject / Override:** updates `auditResults[participantId]`, recomputes final ranking. The Bob vs Patrick split shows the Audit bar shifting in real time.
- **Issue Strike:** flips `strikeRisk` flag on participant; appears in dashboard.
- **Declare Winner:** locks the challenge, shows winner ribbon, unlocks Insights page.

What does **not** work:
- No real auth, file storage, video processing, transcription, notifications, CRM, or email.
- No persistence beyond `localStorage`.

---

## 8. Component boundaries

```
src/
  app/                      # Next.js App Router
    layout.tsx              # Top bar + sidebar shell
    page.tsx                # Challenge landing
    ranking/page.tsx
    feed/page.tsx
    dashboard/page.tsx      # Participant only
    admin/page.tsx          # Admin only
    agents/page.tsx
    insights/page.tsx
  components/
    ui/                     # shadcn primitives
    shell/                  # TopBar, Sidebar, RoleSwitcher, NotificationBell
    challenge/              # HeroPoster, RewardCard, RulesPanel, RegisterModal, VideoPanel
    ranking/                # HypeAuditMeter, RankingRow, MomentumBadge, RankingDisclaimer
    feed/                   # FeedPost, FeedComposer, ReactionRow, BotAvatar
    dashboard/              # ProgressCard, EvidenceList, EvidenceChecklist, SelfReportInput
    admin/                  # BobVsPatrick, AuditQueue, AuditCard, ScoreOverride, FlagList
    agents/                 # AgentCard, ChallengeDesignerPanel, AuditAssistantPanel
    insights/               # AssetBundleCard, QuoteCard, CaseStudyCard, MetricsRow
  lib/
    types.ts                # All TS types
    mock-data.ts            # All mocks
    api.ts                  # Fake API
    ai.ts                   # window.claude.complete wrapper (TODO: swap for SDK)
    utils.ts                # cn() etc
  styles/
    tokens.css              # BairesDev DS3 tokens (DO NOT EDIT)
    globals.css             # Tailwind + tokens import
public/
  brand/                    # logos, symbols
  fonts/                    # Outfit
```

**Rule for Claude Code:** never edit `src/styles/tokens.css`. If a value is missing, add it as a Tailwind extension in `tailwind.config.ts`, never as a new CSS variable.

---

## 9. Copy decisions (locked)

These exact strings are used throughout. Don't paraphrase.

- **App tagline:** "Turn growth into a company-wide game."
- **Challenge headline:** "DO YOU DARE."
- **Challenge subtitle:** "Collect client stories. Create marketing impact. Climb the Hype Ranking."
- **Primary CTA:** "I Dare" (button label) / "Accept the Dare" (modal confirm)
- **Hype Ranking disclaimer (always visible on the ranking page):** "This ranking is based on self-reported progress. Final results may change after human review."
- **Audit Assistant label:** "AI-assisted review. Final decision requires admin approval."
- **Strike warning (registration modal):** "By joining this DYD, you commit to participating before the final deadline. If you submit no valid evidence, admins may issue a DYD Strike that can affect future challenge eligibility."
- **Insights page kicker:** "DYD does not end with a winner. It ends with reusable growth assets."

---

## 10. What Claude Code should do *first*

1. `npm create next-app@latest` (TS, App Router, Tailwind, src dir, import alias `@/*`).
2. Install: `lucide-react`, `clsx`, `class-variance-authority`, `tailwind-merge`, `@radix-ui/*` (whatever shadcn pulls).
3. Copy `src/styles/tokens.css` into the new repo verbatim.
4. Copy `/public/brand/*` and `/public/fonts/*`.
5. Set up `tailwind.config.ts` to read CSS variables from `tokens.css`.
6. Copy `src/lib/types.ts`, `mock-data.ts`, `api.ts` as-is. Compile-check.
7. Copy each route's `page.tsx` and its component dependencies.
8. Run. Should look identical to the HTML prototype.
9. Then start the *real* work: build `/app/api/*` route handlers + persistence + auth + agent execution.

The HTML prototype in this project (`DYD App.html`) is the visual + interaction spec. The Next.js sources in `/src` and `/public` are the seed. The PRD (`DYD_PRODUCT_CONTEXT.md`) is the product spec. **All three must agree.** When Claude Code finds a conflict, the PRD wins on product, this file wins on engineering, the HTML wins on visual.

---

## 11. Out of scope for first draft

Explicitly *not* in the first draft, by design:

- Real authentication / SSO
- Real file storage (S3, etc.)
- Real video transcription / generation
- Real email or Slack notifications
- Multi-challenge support (only DYD #001 exists)
- Challenge creation flow as a real feature (only the AI Designer panel mocks it)
- Mobile layouts (desktop-first; mobile is post-MVP)
- Internationalization
- Accessibility audit (basic semantic HTML + ARIA on interactive elements only)
- Tests (none — this is a prototype)
- Analytics / telemetry

If the hackathon judges ask "where is X" and X is on this list, the answer is: "Out of scope for the first draft, in the roadmap."
