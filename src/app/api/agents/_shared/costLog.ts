// Module-scoped session log for live Anthropic calls.
//
// Lives for the lifetime of the Node process. The live-test script resets it
// at the start of every run and prints `getSessionLog()` at the end. Cache
// hits are NOT recorded here — they cost $0 and would clutter the report.
//
// `recordCall` is invoked from inside `callAnthropic` after a successful
// provider response is parsed for usage, regardless of whether the route's
// downstream validator accepts or rejects the content (we still got billed).

export interface CallRecord {
  agent: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
}

const log: CallRecord[] = [];

export function recordCall(entry: Omit<CallRecord, "timestamp">): void {
  log.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export function getSessionLog(): readonly CallRecord[] {
  return log;
}

export function resetSessionLog(): void {
  log.length = 0;
}

export function totalCost(): number {
  return log.reduce((sum, entry) => sum + entry.cost, 0);
}

export function totalCalls(): number {
  return log.length;
}
