-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "avatarInitials" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sponsor" TEXT NOT NULL,
    "reward" TEXT NOT NULL,
    "rewardSubtitle" TEXT NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "primaryMetricLabel" TEXT NOT NULL,
    "primaryMetricKey" TEXT NOT NULL,
    "hypeRankingDisclaimer" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "evidenceRequirements" JSONB NOT NULL,
    "auditContract" JSONB NOT NULL,
    "winnerId" TEXT,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeState" (
    "challengeId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "currentUserId" TEXT NOT NULL,
    "daremasterInsightSent" BOOLEAN NOT NULL DEFAULT false,
    "growthInsightSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChallengeState_pkey" PRIMARY KEY ("challengeId")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatarInitials" TEXT NOT NULL,
    "registered" BOOLEAN NOT NULL,
    "selfReportedValue" INTEGER NOT NULL,
    "evidenceStatus" TEXT NOT NULL,
    "hypeRank" INTEGER NOT NULL,
    "finalRank" INTEGER,
    "badges" JSONB NOT NULL,
    "strikeRisk" BOOLEAN NOT NULL DEFAULT false,
    "strikeIssued" BOOLEAN NOT NULL DEFAULT false,
    "movement" TEXT NOT NULL DEFAULT 'flat',

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidencePacket" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "declaredMetric" INTEGER NOT NULL,

    CONSTRAINT "EvidencePacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientCompany" TEXT NOT NULL,
    "clientRole" TEXT NOT NULL,
    "lengthSeconds" INTEGER NOT NULL,
    "hasPermission" BOOLEAN NOT NULL,
    "hasBusinessImpact" BOOLEAN NOT NULL,
    "hasMetric" BOOLEAN NOT NULL,
    "snippet" TEXT NOT NULL,
    "impactSummary" TEXT NOT NULL,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceSubmission" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "files" JSONB NOT NULL,
    "clientName" TEXT,
    "clientCompany" TEXT,
    "clientRole" TEXT,
    "permissionToUse" BOOLEAN NOT NULL,
    "businessImpactSummary" TEXT NOT NULL,

    CONSTRAINT "EvidenceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditResult" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "declaredMetric" INTEGER NOT NULL,
    "validatedItems" INTEGER NOT NULL,
    "rejectedItems" INTEGER NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "qualityMultiplier" DOUBLE PRECISION,
    "suggestedFinalScore" DOUBLE PRECISION NOT NULL,
    "overrideScore" DOUBLE PRECISION,
    "flags" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL,
    "adminStatus" TEXT NOT NULL,
    "rubricBreakdown" JSONB,
    "trace" JSONB,

    CONSTRAINT "AuditResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorRole" TEXT,
    "authorType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "reactions" JSONB NOT NULL,
    "comments" JSONB,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvidencePacket_participantId_key" ON "EvidencePacket"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceSubmission_participantId_key" ON "EvidenceSubmission"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditResult_participantId_key" ON "AuditResult"("participantId");

-- CreateIndex
CREATE INDEX "Participant_challengeId_idx" ON "Participant"("challengeId");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");

-- CreateIndex
CREATE INDEX "EvidenceItem_packetId_idx" ON "EvidenceItem"("packetId");

-- CreateIndex
CREATE INDEX "EvidenceSubmission_challengeId_idx" ON "EvidenceSubmission"("challengeId");

-- CreateIndex
CREATE INDEX "AuditResult_challengeId_idx" ON "AuditResult"("challengeId");

-- CreateIndex
CREATE INDEX "FeedPost_challengeId_idx" ON "FeedPost"("challengeId");

-- CreateIndex
CREATE INDEX "FeedPost_createdAt_idx" ON "FeedPost"("createdAt");

-- AddForeignKey
ALTER TABLE "ChallengeState" ADD CONSTRAINT "ChallengeState_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeState" ADD CONSTRAINT "ChallengeState_currentUserId_fkey" FOREIGN KEY ("currentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidencePacket" ADD CONSTRAINT "EvidencePacket_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "EvidencePacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResult" ADD CONSTRAINT "AuditResult_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResult" ADD CONSTRAINT "AuditResult_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
