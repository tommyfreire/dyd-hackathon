// Date formatters used throughout the UI. Deterministic so SSR and client
// don't drift.

import type { DemoStage } from "./demo-stages";

/** Demo's "now" anchor per stage. Lets `ago()` produce sane relative labels. */
export const STAGE_NOW: Record<DemoStage, string> = {
  launch:    "2026-04-28T18:00:00-03:00",
  day_3:     "2026-05-01T18:00:00-03:00",
  day_14:    "2026-05-12T18:00:00-03:00",
  completed: "2026-07-02T12:00:00-03:00",
};

export function demoNow(stage: DemoStage): number {
  return new Date(STAGE_NOW[stage]).getTime();
}

export function ago(iso: string, nowMs: number = Date.now()): string {
  const d = new Date(iso).getTime();
  const m = Math.floor((nowMs - d) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
