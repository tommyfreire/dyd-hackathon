"use server";

import {
  buildDaremasterSnapshotDb,
  buildDaremasterSnapshotWithAuditDb,
  getAgentsDb,
  getAuditTraceInputDb,
  getDaremasterFallbackFactsDb,
  getDaremasterInsightSentDb,
  getGrowthInsightSentDb,
  getInsightInputDb,
  sendDaremasterSnapshotDb,
  sendGrowthInsightSnapshotDb,
} from "@/server/world";

export async function getAgents() {
  return getAgentsDb();
}

export async function buildDaremasterSnapshot() {
  return buildDaremasterSnapshotDb();
}

export async function buildDaremasterSnapshotWithAudit() {
  return buildDaremasterSnapshotWithAuditDb();
}

export async function getDaremasterFallbackFacts() {
  return getDaremasterFallbackFactsDb();
}

export async function getInsightInput() {
  return getInsightInputDb();
}

export async function getAuditTraceInput(participantId: string) {
  return getAuditTraceInputDb(participantId);
}

export async function sendDaremasterSnapshot() {
  return sendDaremasterSnapshotDb();
}

export async function getDaremasterInsightSent() {
  return getDaremasterInsightSentDb();
}

export async function sendGrowthInsightSnapshot() {
  return sendGrowthInsightSnapshotDb();
}

export async function getGrowthInsightSent() {
  return getGrowthInsightSentDb();
}
