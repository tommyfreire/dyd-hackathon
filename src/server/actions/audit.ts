"use server";

import {
  adminApproveDb,
  adminOverrideScoreDb,
  adminRejectDb,
  getAuditQueueDb,
  getAuditResultDb,
  runAuditDb,
} from "@/server/world";

export async function getAuditQueue(challengeId?: string) {
  return getAuditQueueDb(challengeId);
}

export async function getAuditResult(participantId: string) {
  return getAuditResultDb(participantId);
}

export async function adminApprove(participantId: string) {
  return adminApproveDb(participantId);
}

export async function adminReject(participantId: string, reason: string) {
  return adminRejectDb(participantId, reason);
}

export async function adminOverrideScore(participantId: string, score: number) {
  return adminOverrideScoreDb(participantId, score);
}

export async function runAudit(participantId: string) {
  return runAuditDb(participantId);
}
