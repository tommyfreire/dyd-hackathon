import { seedDay3Db } from "@/server/world";
import type { Role } from "@/lib/types";

export async function seedDay3(role: Role = "participant"): Promise<void> {
  await seedDay3Db(role);
}
