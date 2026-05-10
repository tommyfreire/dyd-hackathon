"use server";

import {
  adminDeclareWinnerDb,
  getChallengeDb,
  getCurrentUserDb,
  getNotificationsDb,
  setRoleDb,
} from "@/server/world";
import type { Role } from "@/lib/types";

export async function getChallenge(id?: string) {
  return getChallengeDb(id);
}

export async function getCurrentUser() {
  return getCurrentUserDb();
}

export async function setRole(role: Role) {
  return setRoleDb(role);
}

export async function getNotifications() {
  return getNotificationsDb();
}

export async function adminDeclareWinner(participantId: string) {
  return adminDeclareWinnerDb(participantId);
}
