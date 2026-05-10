// EvidencePacket fixtures used by validator and route tests.
//
// Two packets from different companies so caseStudies dedupe and grounding
// across companies can be exercised. `packetWithRejectedSignals` carries
// items with permission/impact gaps for audit-trace and fallback tests.

import type { EvidenceItem, EvidencePacket } from "@/agents/types";

function item(overrides: Partial<EvidenceItem> & Pick<EvidenceItem, "id">): EvidenceItem {
  return {
    clientName: "Marcus Lee",
    clientCompany: "Wells Fargo",
    clientRole: "VP Engineering",
    lengthSeconds: 110,
    hasPermission: true,
    hasBusinessImpact: true,
    hasMetric: true,
    snippet: "Lending platform shipped two quarters ahead of plan; $14M in originations unlocked.",
    impactSummary: "Lending platform shipped two quarters ahead of plan — $14M in originations unlocked in the first 90 days.",
    ...overrides,
  };
}

export const approvedPacketA: EvidencePacket = {
  participantId: "p-patrick",
  declaredMetric: 3,
  items: [
    item({ id: "ev-pat-1" }),
    item({ id: "ev-pat-2" }),
    item({ id: "ev-pat-3" }),
  ],
};

export const approvedPacketB: EvidencePacket = {
  participantId: "p-charlie",
  declaredMetric: 2,
  items: [
    item({
      id: "ev-charlie-1",
      clientName: "Tobias Engle",
      clientCompany: "Northwind Logistics",
      clientRole: "VP Engineering",
      snippet: "Asked us about the business outcome before writing any code — that was the differentiator.",
      impactSummary: "Tried four other vendors before BairesDev — only team that asked about business outcomes first.",
    }),
    item({
      id: "ev-charlie-2",
      clientName: "Tobias Engle",
      clientCompany: "Northwind Logistics",
      clientRole: "VP Engineering",
      snippet: "Embedded engineers act like ours — they push back when something looks wrong.",
      impactSummary: "Embedded engineers behave like in-house staff; pushed back on three flawed specs in the first month.",
    }),
  ],
};

export const smallApprovedCorpus: EvidencePacket[] = [approvedPacketA, approvedPacketB];

export const packetWithRejectedSignals: EvidencePacket = {
  participantId: "p-bob",
  declaredMetric: 4,
  items: [
    item({ id: "ev-bob-1" }),
    item({
      id: "ev-bob-noperm",
      clientName: "Anonymous",
      clientCompany: "Various Clients",
      clientRole: "VP",
      hasPermission: false,
      snippet: "Client said the team was great but never confirmed in writing.",
      impactSummary: "They were happy with the team.",
    }),
    item({
      id: "ev-bob-noimpact",
      clientName: "Various",
      clientCompany: "Acme Co",
      clientRole: "Buyer",
      lengthSeconds: 8,
      hasBusinessImpact: false,
      hasMetric: false,
      snippet: "Quick clip — no real content.",
      impactSummary: "Quick mention.",
    }),
    item({ id: "ev-bob-4" }),
  ],
};

export const totalItemCount = (packets: EvidencePacket[]) =>
  packets.reduce((sum, p) => sum + p.items.length, 0);
