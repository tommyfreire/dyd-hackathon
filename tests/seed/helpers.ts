import { afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const TEST_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://dyd:dyd@localhost:5433/dyd_test?schema=public";

const TRUNCATE_SQL = `
  TRUNCATE TABLE
    "FeedPost",
    "AuditResult",
    "EvidenceSubmission",
    "EvidenceItem",
    "EvidencePacket",
    "Participant",
    "ChallengeState",
    "Challenge",
    "User"
  RESTART IDENTITY CASCADE
`;

let client: PrismaClient | null = null;

export async function getTestPrisma(): Promise<PrismaClient> {
  process.env.DATABASE_URL = TEST_URL;
  const db = await import("@/server/db");
  client = db.prisma;
  return client;
}

export async function resetTestDb(): Promise<PrismaClient> {
  const prisma = await getTestPrisma();
  await prisma.$executeRawUnsafe(TRUNCATE_SQL);
  return prisma;
}

export function installSeedDbHooks(): void {
  beforeEach(async () => {
    process.env.DATABASE_URL = TEST_URL;
    vi.resetModules();
    await resetTestDb();
  });

  afterAll(async () => {
    if (client) await client.$disconnect();
  });
}
