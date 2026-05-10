import { prisma } from "@/server/db";
import { DEMO_STAGES, type DemoStage } from "@/lib/demo-stages";
import { seedAll } from "@/server/seed";
import type { Role } from "@/lib/types";

const VALID_ROLES = new Set<Role>(["participant", "admin"]);

function parseStage(raw: string | undefined): DemoStage {
  if (raw && (DEMO_STAGES as readonly string[]).includes(raw)) return raw as DemoStage;
  throw new Error(`Invalid stage "${raw ?? ""}". Expected one of: ${DEMO_STAGES.join(", ")}`);
}

function parseRole(raw: string | undefined): Role {
  if (raw && VALID_ROLES.has(raw as Role)) return raw as Role;
  throw new Error('Invalid role. Expected "participant" or "admin".');
}

async function main() {
  const stage = parseStage(process.argv[2]);
  const role = parseRole(process.argv[3] ?? "participant");
  await seedAll(stage, role);
  console.log(`Seeded ${stage} for ${role}.`);
}

main()
  .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
