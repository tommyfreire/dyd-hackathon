"use server";

import {
  adminIssueStrikeDb,
  getHypeRankingDb,
  getParticipantsDb,
  registerDb,
  updateSelfReportDb,
} from "@/server/world";

export async function getParticipants(challengeId?: string) {
  return getParticipantsDb(challengeId);
}

export async function getHypeRanking(challengeId?: string) {
  return getHypeRankingDb(challengeId);
}

export async function register(challengeId: string, userId: string) {
  return registerDb(challengeId, userId);
}

export async function updateSelfReport(challengeId: string, userId: string, value: number) {
  return updateSelfReportDb(challengeId, userId, value);
}

export async function adminIssueStrike(participantId: string, reason: string) {
  void reason;
  return adminIssueStrikeDb(participantId);
}
