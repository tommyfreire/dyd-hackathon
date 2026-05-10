import { seedCompleted } from "./completed";
import { seedDay14 } from "./day14";
import { seedDay3 } from "./day3";
import { seedLaunch } from "./launch";
import type { DemoStage } from "@/lib/demo-stages";
import type { Role } from "@/lib/types";

export { seedCompleted, seedDay14, seedDay3, seedLaunch };

export async function seedAll(stage: DemoStage, role: Role): Promise<void> {
  switch (stage) {
    case "launch":
      await seedLaunch(role);
      return;
    case "day_3":
      await seedDay3(role);
      return;
    case "day_14":
      await seedDay14(role);
      return;
    case "completed":
      await seedCompleted(role);
      return;
  }
}
