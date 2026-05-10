"use server";

import { getMySubmissionDb, submitEvidenceDb } from "@/server/world";
import type { EvidenceDraft } from "@/lib/types";

export async function getMySubmission(challengeId: string, userId: string) {
  return getMySubmissionDb(challengeId, userId);
}

export async function submitEvidence(challengeId: string, userId: string, draft: EvidenceDraft) {
  return submitEvidenceDb(challengeId, userId, draft);
}
