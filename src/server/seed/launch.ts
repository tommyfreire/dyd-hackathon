import { seedLaunchDb } from "@/server/world";
import type { Role } from "@/lib/types";

export async function seedLaunch(role: Role = "participant"): Promise<void> {
  await seedLaunchDb(role);
}
