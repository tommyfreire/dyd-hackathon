// DYD — AI helper
// Wraps window.claude.complete for prototype use. In the production repo, this
// should be replaced with a server-side call to the Anthropic SDK behind an
// API route handler. The function signatures stay identical.

declare global {
  interface Window {
    claude?: {
      complete: (
        input: string | { messages: { role: string; content: string }[] }
      ) => Promise<string>;
    };
  }
}

async function complete(prompt: string): Promise<string> {
  if (typeof window === "undefined" || !window.claude) {
    throw new Error("AI runtime unavailable");
  }
  return window.claude.complete(prompt);
}

// Challenge Designer — turn a one-line goal into a full challenge spec.
export async function designChallenge(goal: string): Promise<{
  title: string;
  description: string;
  reward: string;
  registrationDays: number;
  submissionDays: number;
  rules: string[];
  rubric: { key: string; label: string; weight: number }[];
  evidenceRequirements: string[];
  hypeBotLaunchScript: string;
}> {
  const prompt = `You are the DYD Challenge Designer. Turn the growth goal below into a complete internal-hackathon challenge for BairesDev. Reply ONLY with valid JSON matching this shape (no preamble):
{
  "title": string,
  "description": string,
  "reward": string,
  "registrationDays": number,
  "submissionDays": number,
  "rules": string[],
  "rubric": [{ "key": string, "label": string, "weight": number }],
  "evidenceRequirements": string[],
  "hypeBotLaunchScript": string
}

Rules: rubric weights must sum to 100. Tone: confident, plainspoken, slightly mysterious — never childish. The reward should feel premium. The script is one paragraph spoken by the DYD Bot to launch the challenge.

Goal: ${goal}`;
  const raw = await complete(prompt);
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

// Audit Assistant — score a participant's evidence summary.
export async function auditEvidence(args: {
  participantName: string;
  declaredMetric: number;
  evidenceSummary: string;
  rubric: { key: string; label: string; weight: number }[];
}): Promise<{
  qualityScore: number;
  qualityMultiplier: number;
  validatedItems: number;
  flags: string[];
  recommendation: string;
  rubricBreakdown: { key: string; score: number; note?: string }[];
}> {
  const prompt = `You are the DYD AI Audit Assistant. You do NOT make final decisions — you assist a human admin.

Audit ${args.participantName}'s testimonial submission against this rubric (weights sum to 100):
${args.rubric.map((r) => `- ${r.key} (${r.label}): ${r.weight} pts`).join("\n")}

Declared metric: ${args.declaredMetric} testimonials
Evidence summary: ${args.evidenceSummary}

Reply ONLY with valid JSON (no preamble):
{
  "qualityScore": number (0-100, weighted sum),
  "qualityMultiplier": number (0.4-1.2, derived from quality),
  "validatedItems": number (how many of declared survive review),
  "flags": string[] (concerns; empty if clean),
  "recommendation": "Strong candidate for winner" | "Good submission" | "Needs manual review" | "Reject",
  "rubricBreakdown": [{ "key": string, "score": number, "note": string }]
}`;
  const raw = await complete(prompt);
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}
