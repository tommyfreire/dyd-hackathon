"use client";

import { useEffect, type ReactNode } from "react";
import { RoleProvider } from "@/lib/role-context";
import { StageProvider } from "@/lib/stage-context";
import { ToastProvider } from "@/components/ui/Toast";
import { applyActFromUrl } from "@/lib/act-url";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyActFromUrl();
  }, []);
  return (
    <StageProvider>
      <RoleProvider>
        <ToastProvider>
          <div className="app">
            <div className="app-topbar-orange" />
            <TopBar />
            <Sidebar />
            <main className="app-main">{children}</main>
          </div>
        </ToastProvider>
      </RoleProvider>
    </StageProvider>
  );
}
