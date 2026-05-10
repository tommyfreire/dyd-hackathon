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
import {
  getRawProviderOutputs,
  resetRawProviderOutputs,
} from "@/app/api/agents/_shared/anthropic";
import { loadEnvConfig } from "@next/env";
import { formatUsd } from "@/app/api/agents/_shared/pricing";

loadEnvConfig(process.cwd());

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

async function loadDeps() {
  const [
    seed,
    agentActions,
    challengeActions,
    daremaster,
    insightExtractor,
    challengeDesigner,
    auditTrace,
  ] = await Promise.all([
    import("@/server/seed"),
    import("@/server/actions/agents"),
    import("@/server/actions/challenge"),
    import("@/app/api/agents/daremaster/route"),
    import("@/app/api/agents/insight-extractor/route"),
    import("@/app/api/agents/challenge-designer/route"),
    import("@/app/api/agents/audit-assistant/trace/route"),
  ]);
  return {
    seedAll: seed.seedAll,
    buildDaremasterSnapshotWithAudit: agentActions.buildDaremasterSnapshotWithAudit,
    getInsightInput: agentActions.getInsightInput,
    getAuditTraceInput: agentActions.getAuditTraceInput,
    sendDaremasterSnapshot: agentActions.sendDaremasterSnapshot,
    adminDeclareWinner: challengeActions.adminDeclareWinner,
    daremasterRoute: daremaster.POST,
    insightExtractorRoute: insightExtractor.POST,
    challengeDesignerRoute: challengeDesigner.POST,
    auditTraceRoute: auditTrace.POST,
  };
}

async function callRoute(
  agent: string,
  route: (req: Request) => Promise<Response>,
  body: unknown,
  path: string
): Promise<RunResult> {
  const rawBefore = getRawProviderOutputs().length;
  const res = await route(jsonRequest(body, path));
  const result = await toResult(agent, res);
  if (!res.ok) {
    const raw = getRawProviderOutputs().slice(rawBefore).at(-1);
    if (raw?.text) result.rawOutputSnippet = raw.text.slice(0, 200);
  }
  return result;
}

const RUNNERS: AgentRunner[] = [
  {
    name: "daremaster",
    run: async () => {
      const deps = await loadDeps();
      await deps.seedAll("day_14", "admin");
      await deps.sendDaremasterSnapshot();
      const insightSnapshot = await deps.buildDaremasterSnapshotWithAudit();
      const insight = await callRoute(
        "daremaster:insight",
        deps.daremasterRoute,
        { snapshot: insightSnapshot, mode: "insight" },
        "/api/agents/daremaster"
      );

      await deps.seedAll("completed", "admin");
      await deps.adminDeclareWinner("p-patrick");
      const winnerSnapshot = await deps.buildDaremasterSnapshotWithAudit();
      const winner = await callRoute(
        "daremaster:winner",
        deps.daremasterRoute,
        { snapshot: winnerSnapshot, mode: "winner" },
        "/api/agents/daremaster"
      );

      return [insight, winner];
    },
  },
  {
    name: "insight-extractor",
    run: async () => {
      const deps = await loadDeps();
      await deps.seedAll("completed", "admin");
      await deps.adminDeclareWinner("p-patrick");
      const input = await deps.getInsightInput();
      return [
        await callRoute(
          "insight-extractor",
          deps.insightExtractorRoute,
          input,
          "/api/agents/insight-extractor"
        ),
      ];
    },
  },
  {
    name: "challenge-designer",
    run: async () => {
      const deps = await loadDeps();
      return [
        await callRoute(
          "challenge-designer",
          deps.challengeDesignerRoute,
          { prompt: "A LinkedIn post about a deal we just closed" },
          "/api/agents/challenge-designer"
        ),
      ];
    },
  },
  {
    name: "audit-trace",
    run: async () => {
      const deps = await loadDeps();
      await deps.seedAll("completed", "admin");
      const results: RunResult[] = [];
      for (const participantId of ["p-patrick", "p-bob", "p-alice", "p-charlie"]) {
        const input = await deps.getAuditTraceInput(participantId);
        if (!input) {
          results.push({
            agent: `audit-trace:${participantId.replace(/^p-/, "")}`,
            status: 0,
            error: "missing audit trace input",
          });
          continue;
        }
        results.push(
          await callRoute(
            `audit-trace:${participantId.replace(/^p-/, "")}`,
            deps.auditTraceRoute,
            input,
            "/api/agents/audit-assistant/trace"
          )
        );
      }
      return results;
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

function baseAgent(agent: string): string {
  return agent.startsWith("audit-trace:") ? "audit-trace" : agent.split(":")[0];
}

function pairRecords(runResults: RunResult[], log: readonly CallRecord[]): Array<CallRecord | undefined> {
  const byAgent = new Map<string, CallRecord[]>();
  for (const entry of log) {
    const list = byAgent.get(entry.agent) ?? [];
    list.push(entry);
    byAgent.set(entry.agent, list);
  }
  return runResults.map((result) => {
    const exact = byAgent.get(result.agent);
    if (exact?.length) return exact.shift();
    const base = byAgent.get(baseAgent(result.agent));
    return base?.shift();
  });
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
  const records = pairRecords(runResults, log);
  for (const [idx, r] of runResults.entries()) {
    const rec = records[idx];
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
  const records = pairRecords(runResults, log);
  const payload = {
    timestamp: new Date().toISOString(),
    runs: runResults.map((r, idx) => {
      const rec = records[idx];
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
  resetRawProviderOutputs();

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

  // Dry run: with no key, every route should return the explicit missing-key
  // status and cost must stay at zero. That is a successful pre-flight.
  if (!process.env.ANTHROPIC_API_KEY) {
    const allMissingKey = allResults.every((r) => r.status === 503);
    return allMissingKey && totalCalls() === 0 ? 0 : 1;
  }

  // Live run: non-zero if any runner failed (status not 2xx).
  const allOk = allResults.every((r) => r.status >= 200 && r.status < 300);
  return allOk ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
