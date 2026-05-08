"use client";

// Hidden recording-setup mechanism. Reads a `?act=` query param on app load,
// configures the world to match (stage + account + optional flags), strips
// the param from the URL, and reloads. Designed to be invisible during
// recording — there are no on-screen controls.
//
// Format:  ?act=<account>:<stage>[:<flags>]
//   <account> ∈ { tomi, gabo }
//   <stage>   ∈ { launch, day_3, day_14, completed }
//   <flags>   comma-separated subset of { hype, growth }
//
// The `hype` flag name is preserved for the user's URL muscle memory; it
// flips the Daremaster's audit-snapshot-sent flag (daremasterInsightSent).
//
// Examples:
//   /?act=tomi:launch
//   /?act=gabo:day_14
//   /?act=gabo:day_14:hype           — also flips daremasterInsightSent
//   /?act=gabo:completed:hype,growth — flips both handoff flags

import {
  resetState,
  setDemoStage,
  setRole as apiSetRole,
  sendDaremasterSnapshot,
  sendGrowthInsightSnapshot,
} from "./api";
import { coerceStage } from "./demo-stages";
import type { Role } from "./types";

const ROLE_KEY = "dyd:role:v1";

const ACCOUNT_TO_ROLE: Record<string, Role> = {
  tomi: "participant",
  gabo: "admin",
};

export function applyActFromUrl(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const act = url.searchParams.get("act");
  if (!act) return;

  const [accountStr, stageStr, ...rest] = act.toLowerCase().split(":");
  const role = ACCOUNT_TO_ROLE[accountStr];
  if (!role || !stageStr) {
    console.warn(
      `[dyd] Invalid ?act= value: "${act}". Expected <tomi|gabo>:<stage>[:flags].`
    );
    return;
  }

  const stage = coerceStage(stageStr);
  const flags = rest.join(",").split(",").filter(Boolean);

  resetState();
  setDemoStage(stage);
  // Mutation inside apiSetRole is synchronous; the Promise return only delays
  // the resolved value, which we don't need here.
  apiSetRole(role);
  window.localStorage.setItem(ROLE_KEY, role);

  if (flags.includes("hype")) sendDaremasterSnapshot();
  if (flags.includes("growth")) sendGrowthInsightSnapshot();

  url.searchParams.delete("act");
  const cleanSearch = url.searchParams.toString();
  const cleanUrl =
    url.pathname + (cleanSearch ? `?${cleanSearch}` : "") + url.hash;
  window.history.replaceState({}, "", cleanUrl);
  window.location.reload();
}
