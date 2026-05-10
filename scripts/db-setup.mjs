#!/usr/bin/env node
// Bootstrap the local Postgres setup end-to-end.
//
// Steps:
//   1. ensure .env exists (copy from .env.example if missing)
//   2. docker compose up -d --wait     (boots Postgres and blocks on healthcheck)
//   3. prisma migrate dev --name init  (creates / advances the dev schema)
//   4. CREATE DATABASE dyd_test        (idempotent — survives re-runs)
//   5. prisma migrate deploy           (applies migrations to dyd_test)
//   6. npm run db:seed -- launch participant
//      (calls the implementer's seed CLI; safe to skip if the script
//       isn't wired yet — the script will warn and continue)
//
// Re-runnable. Each step is idempotent.

import { execSync, spawnSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const ENV_FILE = resolve(REPO_ROOT, ".env");
const ENV_EXAMPLE = resolve(REPO_ROOT, ".env.example");

const DEV_URL = "postgresql://dyd:dyd@localhost:5433/dyd?schema=public";
const TEST_URL = "postgresql://dyd:dyd@localhost:5433/dyd_test?schema=public";

function step(label) {
  console.log(`\n→ ${label}`);
}

function sh(cmd, env = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: REPO_ROOT, env: { ...process.env, ...env } });
}

function trySh(cmd, env = {}) {
  console.log(`  $ ${cmd}`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
  });
  return result.status === 0;
}

// 1. .env
if (!existsSync(ENV_FILE)) {
  step(".env not found, copying from .env.example");
  if (!existsSync(ENV_EXAMPLE)) {
    console.error("  ✗ .env.example missing; cannot bootstrap.");
    process.exit(1);
  }
  copyFileSync(ENV_EXAMPLE, ENV_FILE);
  console.log("  ✓ .env created");
}

// 2. Docker
step("Ensuring Postgres container is healthy (docker compose up -d --wait)");
try {
  sh("docker compose up -d --wait");
} catch {
  console.error("\n✗ Docker is required. Start Docker Desktop and re-run `npm run db:setup`.");
  process.exit(1);
}

// 3. Dev migrations
step("Applying migrations to dev database");
sh("npx prisma migrate dev --name init", { DATABASE_URL: DEV_URL });

// 4. Test database
step("Ensuring test database `dyd_test` exists");
const created = trySh(
  `docker compose exec -T postgres psql -U dyd -d dyd -c "CREATE DATABASE dyd_test;"`
);
if (!created) {
  console.log("  (already exists, continuing)");
}

// 5. Test migrations
step("Applying migrations to test database");
sh("npx prisma migrate deploy", { DATABASE_URL: TEST_URL });

// 6. Initial seed
step("Seeding initial empty-Tomi launch state");
const seeded = trySh("npm run --silent db:seed -- launch participant", { DATABASE_URL: DEV_URL });
if (!seeded) {
  console.log(
    "  ⚠ db:seed not wired yet (or failed). The DB schema is ready, but tables are empty.\n" +
      "    First-run users will need to hit /?act=tomi:launch in the browser to populate."
  );
}

console.log("\n✓ db:setup complete.");
console.log("  Next: npm run dev");
console.log("  Inspect: npm run db:studio");
