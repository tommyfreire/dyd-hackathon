"use client";

// Stage context — exposes the current demo stage to components, and a setter
// that overwrites the world's snapshot to match. Pairs with role-context.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getDemoStage, setDemoStage } from "./api";
import { DEMO_STAGES, type DemoStage } from "./demo-stages";

interface StageCtxValue {
  stage: DemoStage;
  setStage: (s: DemoStage) => void;
}

const StageCtx = createContext<StageCtxValue | null>(null);

export function StageProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStageState] = useState<DemoStage>("launch");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStageState(getDemoStage());
    setHydrated(true);
  }, []);

  const setStage = useCallback((s: DemoStage) => {
    if (!(DEMO_STAGES as readonly string[]).includes(s)) return;
    setDemoStage(s);
    setStageState(s);
    // Force a hard reload so every screen re-fetches with the new snapshot.
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  const value = useMemo(() => ({ stage, setStage }), [stage, setStage]);

  // Don't render until hydrated so SSR + client agree.
  if (!hydrated) return <StageCtx.Provider value={value}>{children}</StageCtx.Provider>;
  return <StageCtx.Provider value={value}>{children}</StageCtx.Provider>;
}

export function useStage(): StageCtxValue {
  const ctx = useContext(StageCtx);
  if (!ctx) throw new Error("useStage must be used inside <StageProvider>");
  return ctx;
}
