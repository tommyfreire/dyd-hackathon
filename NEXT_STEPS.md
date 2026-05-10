# DYD - Next Steps

This file is session scaffolding. The current product documentation lives in `README.md`, `PRODUCT.md`, and `ARCHITECTURE.md`.

## Status

- [x] Step 1 - Record the demo
  - [x] Removed visible stage/role switchers from the top bar.
  - [x] Added `?act=` setup URLs for deterministic stage/account setup.
  - [x] Recorded the four-stage demo surface.
- [x] Step 2 - Replace selected agent mocks with provider-ready implementations
  - [x] Added server-side `/api/agents/...` routes.
  - [x] Added validators, JSON extraction, provider wrapper, and cache.
  - [x] Preserved deterministic no-key fallbacks.
  - [x] Added mocked-provider automated tests.
- [x] Step 3 - Persistence pivot
  - [x] Added Postgres 16 + Prisma schema and SQL migration.
  - [x] Replaced localStorage-backed world state with server actions.
  - [x] Added deterministic DB seed flow for the four `?act=` URLs.
  - [x] Added seed smoke tests and README setup docs.

## Remaining Handoff Work

- Run/fill the updated manual QA log on a browser.
- Keep `STEP2_QA_LOG.md` as the clickthrough checklist for no-key demo QA.
- Before final submission, review auxiliary planning files and decide which are kept as appendices versus removed.

## Production TODO

- Real authentication and sessions.
- Multi-org / multi-challenge data model.
- Real evidence ingestion, transcription, and signal extraction upstream of the Audit Assistant.
- Hosted database and deployment pipeline.
- Monitoring, audit logs, backups, and admin permissioning.
- Mobile/responsive pass below desktop widths.
- Rename internal participant ids `u-sofia` / `p-sofia` to `u-tomi` / `p-tomi`. The user-visible name was changed during Step 1 but the internal ids were never refactored. Touches `src/lib/mock-data.ts`, `src/server/seed/*`, `src/server/world.ts`, `src/lib/api.ts` legacy role mapping, `src/agents/*` audit references, `prisma/migrations/*` literal SQL, ~10 test files, and persisted DB rows. Zero user-visible benefit so deferred from the hackathon build.
