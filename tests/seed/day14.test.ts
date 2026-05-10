import { describe, expect, it } from "vitest";
import { getTestPrisma, installSeedDbHooks } from "./helpers";

installSeedDbHooks();

describe("seedDay14", () => {
  it("creates Day 14 state with contender audits and no Daremaster handoff", async () => {
    const { seedDay14 } = await import("@/server/seed/day14");
    const prisma = await getTestPrisma();

    await seedDay14("admin");

    const [state, audits, packets, bob] = await Promise.all([
      prisma.challengeState.findUnique({ where: { challengeId: "dyd-001" } }),
      prisma.auditResult.findMany({ orderBy: { participantId: "asc" } }),
      prisma.evidencePacket.count(),
      prisma.participant.findUnique({ where: { id: "p-bob" } }),
    ]);

    expect(state?.currentStage).toBe("day_14");
    expect(state?.currentUserId).toBe("u-admin");
    expect(state?.daremasterInsightSent).toBe(false);
    expect(state?.growthInsightSent).toBe(false);
    expect(audits.map((a) => a.participantId)).toEqual([
      "p-alice",
      "p-bob",
      "p-charlie",
      "p-patrick",
    ]);
    expect(packets).toBe(4);
    expect(bob?.selfReportedValue).toBe(13);
  });
});
