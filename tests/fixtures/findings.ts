// Sample audit findings + matching audit contract for trace-route tests.

import type { AuditFindings } from "@/agents/types";
import type { AuditContract } from "@/lib/types";

const RUBRIC = [
  { key: "clarity", label: "Clarity of testimonial", weight: 20 },
  { key: "businessImpact", label: "Business impact", weight: 30 },
  { key: "clientRelevance", label: "Client relevance", weight: 20 },
  { key: "specificity", label: "Specificity of the result", weight: 20 },
  { key: "permissionCompleteness", label: "Permission and usage readiness", weight: 10 },
];

export const sampleAuditContract: AuditContract = {
  challengeId: "dyd-001",
  name: "The Testimonial Hunt",
  primaryMetric: {
    key: "testimonial_count",
    label: "Number of testimonials",
    type: "number",
    higherIsBetter: true,
  },
  evidence: {
    acceptedTypes: ["video", "zip", "text"],
    requiredFields: [
      "clientName",
      "clientCompany",
      "clientRole",
      "permissionToUse",
      "businessImpactSummary",
    ],
  },
  auditMode: "ai_assisted_human_approved",
  rubric: RUBRIC,
  redFlags: [
    "missing_client_permission",
    "unclear_business_impact",
    "duplicate_submission",
  ],
  finalScoreFormula: "validated_metric * quality_multiplier",
  finalDecisionOwner: "admins",
};

export const sampleAuditFindings: AuditFindings = {
  participantId: "p-patrick",
  declaredMetric: 9,
  validatedItems: 9,
  rejectedItems: 0,
  qualityScore: 95,
  suggestedFinalScore: 9.5,
  flags: [],
  recommendation: "Strong candidate for winner",
  adminStatus: "pending",
  rubricBreakdown: [
    { key: "clarity", label: "Clarity of testimonial", score: 18, max: 20 },
    { key: "businessImpact", label: "Business impact", score: 29, max: 30 },
    { key: "clientRelevance", label: "Client relevance", score: 20, max: 20 },
    { key: "specificity", label: "Specificity of the result", score: 18, max: 20 },
    { key: "permissionCompleteness", label: "Permission and usage readiness", score: 10, max: 10 },
  ],
  trace: [
    "Declared metric: 9 testimonials.",
    "Items submitted: 9.",
    "No red flags. All 9 items pass validation.",
    "Validated items: 9 (rejected 0).",
    "Rubric weighted score: 95/100.",
    "Recommendation: Strong candidate for winner. Final decision requires admin approval.",
  ],
};

export const flaggedAuditFindings: AuditFindings = {
  participantId: "p-bob",
  declaredMetric: 18,
  validatedItems: 11,
  rejectedItems: 7,
  qualityScore: 51,
  suggestedFinalScore: 6.3,
  flags: ["3 testimonials under 10s", "4 missing permission confirmation"],
  recommendation: "Needs manual review",
  adminStatus: "pending",
  rubricBreakdown: [
    { key: "clarity", label: "Clarity of testimonial", score: 11, max: 20 },
    { key: "businessImpact", label: "Business impact", score: 16, max: 30 },
    { key: "clientRelevance", label: "Client relevance", score: 14, max: 20 },
    { key: "specificity", label: "Specificity of the result", score: 2, max: 20 },
    { key: "permissionCompleteness", label: "Permission and usage readiness", score: 8, max: 10 },
  ],
  trace: [
    "Declared metric: 18 testimonials.",
    "Items submitted: 18.",
    "Red flags: 3 testimonials under 10s; 4 missing permission confirmation.",
    "Validated items: 11 (rejected 7).",
    "Rubric weighted score: 51/100.",
    "Recommendation: Needs manual review. Final decision requires admin approval.",
  ],
};
