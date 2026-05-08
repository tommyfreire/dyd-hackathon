"use client";

// Role context — replaces the App-level useState role switcher from the
// prototype. Persists the selected role to localStorage so reloads stay put.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "./api";
import type { Role, User } from "./types";

const ROLE_KEY = "dyd:role:v1";

interface RoleCtxValue {
  role: Role;
  user: User | null;
  setRole: (role: Role) => void;
  refreshUser: () => Promise<void>;
}

const RoleCtx = createContext<RoleCtxValue | null>(null);

function readRole(): Role {
  if (typeof window === "undefined") return "participant";
  try {
    const raw = window.localStorage.getItem(ROLE_KEY);
    if (raw === "admin" || raw === "participant") return raw;
    // Sponsor/spectator are no longer exposed; collapse to participant.
    if (raw === "sponsor" || raw === "spectator") return "participant";
  } catch {}
  return "participant";
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("participant");
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = readRole();
    setRoleState(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    api.setRole(role).then(setUser);
    try {
      window.localStorage.setItem(ROLE_KEY, role);
    } catch {}
  }, [role, hydrated]);

  const setRole = useCallback((next: Role) => setRoleState(next), []);

  const refreshUser = useCallback(async () => {
    const u = await api.getCurrentUser();
    setUser(u);
  }, []);

  const value = useMemo<RoleCtxValue>(
    () => ({ role, user, setRole, refreshUser }),
    [role, user, setRole, refreshUser]
  );

  return <RoleCtx.Provider value={value}>{children}</RoleCtx.Provider>;
}

export function useRole(): RoleCtxValue {
  const ctx = useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be used within <RoleProvider>");
  return ctx;
}
