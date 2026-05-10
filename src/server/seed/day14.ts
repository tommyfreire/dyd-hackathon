import { seedDay14Db } from "@/server/world";
import type { Role } from "@/lib/types";

export async function seedDay14(role: Role = "admin"): Promise<void> {
  await seedDay14Db(role);
}
