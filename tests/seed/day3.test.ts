import { describe, expect, it } from "vitest";
import { getTestPrisma, installSeedDbHooks } from "./helpers";

installSeedDbHooks();

describe("seedDay3", () => {
  it("creates Day 3 state with Tomi moving and no audits yet", async () => {
    const { seedDay3 } = await import("@/server/seed/day3");
    const prisma = await getTestPrisma();

    await seedDay3("participant");

    const [state, tomi, auditCount, feedCount] = await Promise.all([
      prisma.challengeState.findUnique({ where: { challengeId: "dyd-001" } }),
      prisma.participant.findUnique({ where: { id: "p-sofia" } }),
      prisma.auditResult.count(),
      prisma.feedPost.count(),
    ]);

    expect(state?.currentStage).toBe("day_3");
    expect(state?.currentUserId).toBe("u-sofia");
    expect(tomi?.registered).toBe(true);
    expect(tomi?.selfReportedValue).toBeGreaterThanOrEqual(1);
    expect(tomi?.evidenceStatus).toBe("uploaded");
    expect(auditCount).toBe(0);
    expect(feedCount).toBeGreaterThan(1);
  });
});
