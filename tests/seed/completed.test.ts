import { describe, expect, it } from "vitest";
import { getTestPrisma, installSeedDbHooks } from "./helpers";

installSeedDbHooks();

describe("seedCompleted", () => {
  it("creates completed-stage review state before the admin declares the winner", async () => {
    const { seedCompleted } = await import("@/server/seed/completed");
    const prisma = await getTestPrisma();

    await seedCompleted("admin");

    const [state, challenge, auditCount, packetCount] = await Promise.all([
      prisma.challengeState.findUnique({ where: { challengeId: "dyd-001" } }),
      prisma.challenge.findUnique({ where: { id: "dyd-001" } }),
      prisma.auditResult.count(),
      prisma.evidencePacket.count(),
    ]);

    expect(state?.currentStage).toBe("completed");
    expect(state?.currentUserId).toBe("u-admin");
    expect(state?.daremasterInsightSent).toBe(true);
    expect(state?.growthInsightSent).toBe(false);
    expect(challenge?.status).toBe("completed");
    expect(challenge?.winnerId).toBeNull();
    expect(auditCount).toBe(4);
    expect(packetCount).toBe(4);
  });
});
