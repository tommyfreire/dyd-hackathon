import { seedCompletedDb } from "@/server/world";
import type { Role } from "@/lib/types";

export async function seedCompleted(role: Role = "admin"): Promise<void> {
  await seedCompletedDb(role);
}
