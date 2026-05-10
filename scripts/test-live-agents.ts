#!/usr/bin/env -S tsx
/**
 * test-live-agents.ts — the only place real Anthropic calls originate.
 *
 * Run modes:
 *   npm run test:live                 # full E2E, all four agents
 *   npm run test:live -- --only daremaster
 *   npm run test:live -- --only insight-extractor
 *   npm run test:live -- --json       # machine-readable output
 *
 * Pre-flight (no key set): every route returns 503, total cost $0, exit 0.
 * Post-flight (key set):   every route returns 200, total cost ~$0.04 cold.
 *
 * Architect note: this script is the discipline that protects the budget.
 * The cost log inside callAnthropic records every successful provider
 * response. Cache hits do not log. Failures dump the first ~200 chars of
 * the model's raw output so you can triage without re-running.
 */

import {
  getSessionLog,
  resetSessionLog,
  totalCalls,
  totalCost,
  type CallRecord,
} from "@/app/api/agents/_shared/costLog";
import { formatUsd } from "@/app/api/agents/_shared/pricing";

// ────────────────────────────────────────────────────────────────────────────
// IMPLEMENTER TODO BLOCK — fill these imports in once the wiring is ready.
//
// Comment them out at the top so the skeleton type-checks even with TODOs
// open. Restore them as you wire each agent.
// ────────────────────────────────────────────────────────────────────────────
//
// import { seedAll } from "@/server/seed";
// import {
//   buildDaremasterSnapshot,
//   buildDaremasterSnapshotWithAudit,
//   getInsightInput,
//   getAuditTraceInput,
//   sendDaremasterSnapshot,
//   sendGrowthInsightSnapshot,
// } from "@/server/actions/agents";
// import { adminDeclareWinner } from "@/server/actions/challenge";
// import { POST as daremasterRoute } from "@/app/api/agents/daremaster/route";
// import { POST as insightExtractorRoute } from "@/app/api/agents/insight-extractor/route";
// import { POST as challengeDesignerRoute } from "@/app/api/agents/challenge-designer/route";
// import { POST as auditTraceRoute } from "@/app/api/agents/audit-assistant/trace/route";

// ────────────────────────────────────────────────────────────────────────────
// CLI
// ────────────────────────────────────────────────────────────────────────────

interface Args {
  only?: string;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only" && argv[i + 1]) {
      args.only = argv[i + 1];
      i++;
    } else if (a === "--json") {
      args.json = true;
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
Usage: npm run test:live -- [--only <agent>] [--json]

Agents: daremaster | insight-extractor | challenge-designer | audit-trace

Default: runs all four. With no ANTHROPIC_API_KEY set, every route returns
503 and total cost is $0 — that's the dry-run pre-flight.
`.trim());
}

// ────────────────────────────────────────────────────────────────────────────
// Run flow
// ────────────────────────────────────────────────────────────────────────────

interface RunResult {
  agent: string;
  status: number;
  rawOutputSnippet?: string;
  error?: string;
}

interface AgentRunner {
  name: string;
  run: () => Promise<RunResult[]>;
}

const RUNNERS: AgentRunner[] = [
  // ──────────────────────────────────────────────────────────────────────
  // IMPLEMENTER TODO — wire each runner.
  // Each runner: seed the appropriate stage, build inputs via server
  // actions, call POST(req), return one RunResult per call (e.g.
  // daremaster:insight + daremaster:winner are two results).
  // The seed call must precede the input build so the DB has fresh state.
  // ──────────────────────────────────────────────────────────────────────

  {
    name: "daremaster",
    run: async () => {
      // TODO:
      //   1. await seedAll("day_14", "admin");
      //   2. await sendDaremasterSnapshot();
      //   3. const snapshot = await buildDaremasterSnapshotWithAudit();
      //   4. const insightRes = await daremasterRoute(jsonRequest({ snapshot, mode: "insight" }));
      //   5. await seedAll("completed", "admin");
      //   6. await adminDeclareWinner("p-patrick");
      //   7. const winnerSnap = await buildDaremasterSnapshotWithAudit();
      //   8. const winnerRes = await daremasterRoute(jsonRequest({ snapshot: winnerSnap, mode: "winner" }));
      //   9. return [
      //        await toResult("daremaster:insight", insightRes),
      //        await toResult("daremaster:winner", winnerRes),
      //      ];
      return notWiredYet("daremaster");
    },
  },
  {
    name: "insight-extractor",
    run: async () => {
      // TODO:
      //   1. await seedAll("completed", "admin");
      //   2. await adminDeclareWinner("p-patrick");
      //   3. const input = await getInsightInput();
      //   4. const res = await insightExtractorRoute(jsonRequest(input));
      //   5. return [await toResult("insight-extractor", res)];
      return notWiredYet("insight-extractor");
    },
  },
  {
    name: "challenge-designer",
    run: async () => {
      // TODO:
      //   1. const res = await challengeDesignerRoute(jsonRequest({
      //        prompt: "A LinkedIn post about a deal we just closed",
      //      }));
      //   2. return [await toResult("challenge-designer", res)];
      return notWiredYet("challenge-designer");
    },
  },
  {
    name: "audit-trace",
    run: async () => {
      // TODO:
      //   1. await seedAll("completed", "admin");
      //   2. const participants = ["p-patrick", "p-bob", "p-charlie", "p-alice"];
      //   3. const results: RunResult[] = [];
      //   4. for (const id of participants) {
      //        const input = await getAuditTraceInput(id);
      //        const res = await auditTraceRoute(jsonRequest(input));
      //        results.push(await toResult(`audit-trace:${id.replace(/^p-/, "")}`, res));
      //      }
      //   5. return results;
      return notWiredYet("audit-trace");
    },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers used by the runners (the implementer fills the ones above; these
// are ready as-is)
// ────────────────────────────────────────────────────────────────────────────

/** Build a Request the route handler can ingest. */
export function jsonRequest(body: unknown, path = "/api/agents/test"): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Convert a route Response into a RunResult for the report. */
export async function toResult(agent: string, res: Response): Promise<RunResult> {
  if (res.ok) return { agent, status: res.status };
  const text = await res.text().catch(() => "");
  return {
    agent,
    status: res.status,
    rawOutputSnippet: text.slice(0, 200),
  };
}

/** Placeholder for unwired runners — keeps the dry-run output coherent. */
function notWiredYet(name: string): RunResult[] {
  return [{ agent: `${name}:unwired`, status: 0, error: "runner not wired yet — see TODO in scripts/test-live-agents.ts" }];
}

// ────────────────────────────────────────────────────────────────────────────
// Report
// ────────────────────────────────────────────────────────────────────────────

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function leftPad(s: string, n: number): string {
  return s.length >= n ? s : " ".repeat(n - s.length) + s;
}

function fmtNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function findRecord(log: readonly CallRecord[], agent: string): CallRecord | undefined {
  return log.find((entry) => entry.agent === agent);
}

function printTextReport(runResults: RunResult[], log: readonly CallRecord[]): void {
  console.log(`\n=== DYD live-agent test report ===`);
  console.log(new Date().toISOString());
  console.log("");
  console.log(
    pad("Agent", 24) +
      pad("Status", 8) +
      pad("Model", 22) +
      pad("In tok", 9) +
      pad("Out tok", 9) +
      pad("$", 9) +
      "Cum $"
  );
  console.log("─".repeat(86));

  let cumulative = 0;
  for (const r of runResults) {
    const rec = findRecord(log, r.agent);
    const inTok = rec ? fmtNumber(rec.inputTokens) : "—";
    const outTok = rec ? fmtNumber(rec.outputTokens) : "—";
    const cost = rec ? rec.cost : 0;
    cumulative += cost;
    console.log(
      pad(r.agent, 24) +
        pad(String(r.status || "—"), 8) +
        pad(rec?.model ?? "—", 22) +
        leftPad(inTok, 7) + "  " +
        leftPad(outTok, 7) + "  " +
        leftPad(formatUsd(cost), 8) + " " +
        leftPad(formatUsd(cumulative), 8)
    );
    if (r.rawOutputSnippet) {
      console.log(`  > raw output: ${JSON.stringify(r.rawOutputSnippet)}`);
    }
    if (r.error) {
      console.log(`  > error: ${r.error}`);
    }
  }

  console.log("");
  console.log(
    `TOTAL THIS RUN: ${totalCalls()} call${totalCalls() === 1 ? "" : "s"}   ${formatUsd(totalCost())}`
  );
  console.log("");
}

function printJsonReport(runResults: RunResult[], log: readonly CallRecord[]): void {
  const payload = {
    timestamp: new Date().toISOString(),
    runs: runResults.map((r) => {
      const rec = findRecord(log, r.agent);
      return {
        ...r,
        ...(rec ? {
          model: rec.model,
          inputTokens: rec.inputTokens,
          outputTokens: rec.outputTokens,
          cost: rec.cost,
        } : {}),
      };
    }),
    totals: {
      calls: totalCalls(),
      cost: totalCost(),
    },
  };
  console.log(JSON.stringify(payload, null, 2));
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  resetSessionLog();

  const runners = args.only
    ? RUNNERS.filter((r) => r.name === args.only)
    : RUNNERS;

  if (args.only && runners.length === 0) {
    console.error(`Unknown agent "${args.only}". Valid: ${RUNNERS.map((r) => r.name).join(", ")}`);
    return 2;
  }

  const allResults: RunResult[] = [];
  for (const runner of runners) {
    try {
      const results = await runner.run();
      allResults.push(...results);
    } catch (err) {
      allResults.push({
        agent: runner.name,
        status: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (args.json) {
    printJsonReport(allResults, getSessionLog());
  } else {
    printTextReport(allResults, getSessionLog());
  }

  // Exit code: non-zero if any runner failed (status not 2xx).
  const allOk = allResults.every((r) => r.status >= 200 && r.status < 300);
  return allOk ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
