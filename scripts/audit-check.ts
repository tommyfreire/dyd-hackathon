// Sanity-check the Audit Assistant against the canonical evidence packets.
// Run: npx tsx scripts/audit-check.ts
import { audit } from "../src/agents/audit-assistant";
import { evidencePackets, currentChallenge } from "../src/lib/mock-data";

for (const [pid, packet] of Object.entries(evidencePackets)) {
  const r = audit({ packet, contract: currentChallenge.auditContract });
  console.log(`${pid}: validated=${r.validatedItems} quality=${r.qualityScore} x${r.qualityMultiplier} -> ${r.suggestedFinalScore}  (${r.recommendation})`);
  console.log(`  rubric: ${r.rubricBreakdown.map(b => `${b.key}=${b.score}/${b.max}`).join(", ")}`);
  if (r.flags.length) console.log(`  flags:  ${r.flags.join(" | ")}`);
}
