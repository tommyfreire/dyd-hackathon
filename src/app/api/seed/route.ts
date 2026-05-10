import { NextResponse } from "next/server";
import { coerceStage } from "@/lib/demo-stages";
import { seedAll } from "@/server/seed";
import type { Role } from "@/lib/types";

function parseRole(raw: string | null): Role {
  if (raw === "admin" || raw === "participant") return raw;
  return "participant";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const stage = coerceStage(url.searchParams.get("stage"));
  const role = parseRole(url.searchParams.get("role"));

  try {
    await seedAll(stage, role);
    return NextResponse.json({ ok: true, stage, role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
