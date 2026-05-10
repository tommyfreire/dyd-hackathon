"use server";

import {
  seedAllDb,
  seedCompletedDb,
  seedDay14Db,
  seedDay3Db,
  seedLaunchDb,
  truncateWorld,
} from "@/server/world";
import type { DemoStage } from "@/lib/demo-stages";
import type { Role } from "@/lib/types";

export async function seedAll(stage: DemoStage, role: Role) {
  return seedAllDb(stage, role);
}

export async function seedLaunch(role?: Role) {
  return seedLaunchDb(role);
}

export async function seedDay3(role?: Role) {
  return seedDay3Db(role);
}

export async function seedDay14(role?: Role) {
  return seedDay14Db(role);
}

export async function seedCompleted(role?: Role) {
  return seedCompletedDb(role);
}

export async function resetState() {
  return truncateWorld();
}
