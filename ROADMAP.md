# DYD — Roadmap to production

This document describes what's still needed to take DYD from the current build to a real product that BairesDev could run internally across many concurrent challenges, with real users, real admins, real submissions, and real LLM cost at scale.

The list is organized into three tiers. Tier 1 items block a real launch. Tier 2 items are highly desirable and become painful to live without. Tier 3 items are quality-of-life and polish.

---

## Tier 1 — Required for production

### Authentication and sessions

Today there are two seeded users (Tomi, Gabo) and the active account is selected by a URL parameter. A real deployment needs:

- SSO integration with BairesDev's identity provider (Okta or Azure AD).
- Session management, refresh, and logout.
- A real `role` system beyond the two-role shim. Admin permissions probably need to split into Growth Ops (orchestrates agents) vs HR (declares winners, ships rewards).
- Per-user audit log of admin actions (overrides, winner declarations, etc.).

### Multi-tenant / multi-challenge data model

Today every screen hardcodes the challenge id `dyd-001`. To run more than one Dare concurrently:

- Introduce an `activeChallengeId` concept end-to-end. The current challenge is always implicit; in production each participant sees their challenges, each admin sees their org's challenges, and the agent input assembly is keyed on the active challenge.
- The Prisma schema is already multi-row friendly (the Challenge table has an id), but Participants, EvidencePackets, AuditResults, and FeedPosts need consistent challenge-scoping in every query.
- Multi-org isolation: each BairesDev department, country, or business unit might run its own Dares.

### Real evidence pipeline

The Audit Assistant currently reads pre-computed booleans (`hasMetric`, `hasPermission`, `lengthSeconds`, etc.) from seeded evidence rows. In production these signals would arrive from real testimonial videos:

- Object storage for video uploads (S3 or equivalent).
- Async transcription pipeline.
- LLM-driven signal extraction upstream of the audit (does this clip mention a metric? does it have client permission to publish? does it name a business outcome?).
- The audit then scores the extracted signals — same code, real inputs.

### Challenge Designer publish pipeline

The agent already drafts a real brief. Publish is a stub. To make Publish do what the UI promises:

- Persist a new `Challenge` row and scaffold its evidence/audit/participant tables.
- Trigger Daremaster launch-video generation for the new Dare (text-to-video service, or a templated render with voice synthesis).
- Switch the new challenge into the `activeChallengeId` slot.
- Broadcast the launch post on the feed.
- Send the company-wide registration notification.
- Start the registration and submission timers.

### Hosted database, deployment, observability

- Hosted Postgres (Neon, Supabase, or self-hosted RDS).
- Deployment pipeline (Vercel or equivalent), staging + prod environments, env var promotion.
- Migrations management (Prisma Migrate in CI). The schema-first + raw SQL migration pattern we use locally maps directly — `prisma/migrations/` becomes the audit trail for every prod schema change.
- Preserve the dev/test database split in CI: spin up a Postgres service per workflow run, point `DATABASE_URL_TEST` at it, and run the seed smoke tests against a clean schema every commit. Today that pattern runs on developer machines; production-grade discipline is making it run on every PR.
- Backups, point-in-time recovery, RTO/RPO targets.
- Metrics, structured logs, and an error tracker (Sentry).
- Uptime monitoring on the agent routes.

---

## Tier 2 — Should have

### Real notification delivery

Notifications are stored in the DB and rendered in the bell UI. There's no email, no Slack, no push. Production needs:

- Email transactional pipeline (Resend, Postmark, or equivalent).
- Slack delivery for handoff moments (snapshot sent, growth report ready, winner declared).
- Browser push for participants who opted in.
- Per-user preferences (which events trigger which channels).

### Live Daremaster broadcast cadence

Today the admin clicks "Generate next post" to fire the Daremaster. In production the Daremaster should run on a schedule (e.g. once a day during a Dare, more often near deadlines), or be reactively triggered by lifecycle events (deadline crossed, leaderboard re-shuffled, new evidence approved).

- Scheduling layer (cron, queue, or event-driven).
- Per-challenge cadence configuration.
- The admin still reviews/pins; the Daremaster just proposes.

### Per-challenge launch video

Today there's one launch video (`testimonialHunt.mp4`) shared across all Dares. Each new challenge needs its own Daremaster introduction. Couples with the publish pipeline in Tier 1.

### Agent infrastructure

The cost log and single-flight cache are in place, but production-grade ops needs:

- Per-org and per-agent rate limits.
- Retry/backoff on transient provider errors (today the route returns 502 and the UI falls back to deterministic).
- Persistent prompt + response audit log (which model? what tokens? for billing reconciliation and incident review).
- A cost-tracking dashboard per challenge or per org.
- Per-org / per-challenge prompt customization (different brand voice).

### Shared formula configuration

The scoring formula tuning lives in `localStorage` — per-browser. In production, formula config should be a property of the active challenge, shared across all admins reviewing the same Dare.

### Admin permissioning and audit trail

Today a single "admin" role can do everything. Production needs:

- Per-user audit trail (who overrode which score, who declared the winner).
- Optional approval workflows (Growth Ops proposes, HR confirms).

---

## Tier 3 — Nice to have

- Mobile / responsive layout below desktop widths.
- Accessibility audit: keyboard navigation, screen reader support, color contrast pass.
- Internationalization (BairesDev is Spanish/English/Portuguese in practice).
- Per-tenant Daremaster persona customization (voice, tone, name).
- Per-agent model override (Sonnet/Opus for higher-stakes outputs like the Challenge Designer or Growth Insight Extractor, Haiku for high-volume Daremaster posts).
- Re-import flow for the JSON briefs the Designer currently exports.
- Internal participant id rename `u-sofia` → `u-tomi`. The user-visible name changed early but the internal id didn't. Touches a long tail of files for zero user-visible benefit, so deferred.

---

## A note on Tier 1 scope

The single largest unblock for a real launch is **the evidence pipeline** — without real transcription and signal extraction, the Audit Assistant is operating on hand-coded booleans. Everything else in Tier 1 is engineering work with known shapes. The evidence pipeline is genuinely product-shaped: which signals do we actually need, how good is good-enough, where does the LLM extract vs. where does a human approve?

That's the next thing to think about hard if this gets greenlit beyond the hackathon.
