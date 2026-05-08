"use client";

import { Icon, ROLE_ICONS } from "@/components/ui/Icon";
import { useRole } from "@/lib/role-context";
import { NotificationBell } from "./NotificationBell";
import type { Role } from "@/lib/types";

const ACCOUNT_LABEL: Record<Role, string> = {
  participant: "Tomi · Participant",
  admin:       "Gabo · Admin",
  sponsor:     "Tomi · Participant",
  spectator:   "Tomi · Participant",
};

export function TopBar() {
  const { role } = useRole();
  return (
    <header className="app-header">
      <div className="tb-left">
        <span className="tb-challenge-pill">
          <span className="tb-status-dot" />
          DYD #001 · Open
        </span>
        <span className="muted-2" style={{ fontSize: 12 }}>·</span>
        <span className="muted" style={{ fontSize: 13 }}>The Testimonial Hunt</span>
      </div>
      <div className="tb-right">
        <span className="tb-account-badge">
          <Icon name={ROLE_ICONS[role] ?? "user"} size={14} />
          {ACCOUNT_LABEL[role] ?? ACCOUNT_LABEL.participant}
        </span>
        <NotificationBell />
        <button className="tb-icon-btn" aria-label="Settings">
          <Icon name="settings" />
        </button>
      </div>
    </header>
  );
}
