import { describe, expect, it } from "vitest";
import { getTestPrisma, installSeedDbHooks } from "./helpers";

installSeedDbHooks();

describe("seedLaunch", () => {
  it("creates the launch DB state with no registered participants or audits", async () => {
    const { seedLaunch } = await import("@/server/seed/launch");
    const prisma = await getTestPrisma();

    await seedLaunch("participant");

    const [state, registeredCount, auditCount, feedPosts] = await Promise.all([
      prisma.challengeState.findUnique({ where: { challengeId: "dyd-001" } }),
      prisma.participant.count({ where: { registered: true } }),
      prisma.auditResult.count(),
      prisma.feedPost.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    expect(state?.currentStage).toBe("launch");
    expect(state?.currentUserId).toBe("u-sofia");
    expect(state?.daremasterInsightSent).toBe(false);
    expect(registeredCount).toBe(0);
    expect(auditCount).toBe(0);
    expect(feedPosts).toHaveLength(1);
    expect(feedPosts[0].author).toBe("Daremaster");
    expect(feedPosts[0].pinned).toBe(true);
  });
});
