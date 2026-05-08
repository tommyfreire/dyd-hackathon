"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconProps } from "@/components/ui/Icon";
import { useRole } from "@/lib/role-context";
import { useStage } from "@/lib/stage-context";
import { Logo } from "./Logo";
import { getChallenge, getParticipants } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: IconProps["name"];
  pill?: string;
  locked?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { role, user } = useRole();
  const { stage } = useStage();
  const [tomiRegistered, setTomiRegistered] = useState(false);
  const [winnerDeclared, setWinnerDeclared] = useState(false);

  // Track whether the current participant has accepted the Dare. At Launch
  // before they accept, every non-Challenge tab is locked. We listen to
  // `dyd:state-changed` (dispatched by every API mutation) so the unlock
  // happens the instant register() commits — no route change required.
  useEffect(() => {
    if (!user || role !== "participant") {
      setTomiRegistered(false);
      return;
    }
    const refresh = () => {
      getParticipants("dyd-001").then((ps) => {
        const me = ps.find((p) => p.userId === user.id);
        setTomiRegistered(!!(me && me.registered));
      });
    };
    refresh();
    window.addEventListener("dyd:state-changed", refresh);
    return () => window.removeEventListener("dyd:state-changed", refresh);
  }, [user, role, stage]);

  // Track winner-declared so the Growth Insights tab unlocks the moment the
  // admin clicks "Declare winner" on /admin (mirroring the Day-14 unlock
  // pattern via the dyd:state-changed event).
  useEffect(() => {
    const refresh = () => {
      getChallenge().then((c) => setWinnerDeclared(!!c.winnerId));
    };
    refresh();
    window.addEventListener("dyd:state-changed", refresh);
    return () => window.removeEventListener("dyd:state-changed", refresh);
  }, [stage]);

  const isParticipant = role === "participant";
  // At Launch, the participant only sees the Challenge tab until they accept
  // the Dare. Admin always has full access; once stage advances past Launch
  // the rest of the surface is open regardless.
  const lockedForParticipant = isParticipant && stage === "launch" && !tomiRegistered;

  const items: NavItem[] = [
    { href: "/",         label: "Challenge",      icon: "flame" },
    { href: "/ranking",  label: "Hype Ranking",   icon: "trophy", locked: lockedForParticipant },
    { href: "/feed",     label: "Feed",           icon: "messageSquare", locked: lockedForParticipant },
  ];
  if (isParticipant) {
    items.push({ href: "/dashboard", label: "My Dashboard", icon: "user", locked: lockedForParticipant });
  }
  // Admin-only: the agent control panel + the growth-assets dashboard. The
  // participant never sees these — they live the social/competitive UX while
  // the admin orchestrates the agents in the background.
  if (role === "admin") {
    items.push({ href: "/admin",     label: "Admin Review",   icon: "shield",   pill: "AI" });
    items.push({ href: "/agents",    label: "AI Agents",      icon: "sparkles", pill: "AGENTS" });
    // Growth Insights only unlocks once the admin has declared a winner —
    // before that there's no approved corpus for the extractor to mine.
    if (stage === "completed" && winnerDeclared) {
      items.push({ href: "/insights", label: "Growth Insights", icon: "barChart" });
    }
  }

  return (
    <aside className="app-sidebar">
      <Logo />
      <div className="nav-section">DYD #001</div>
      {items.map((it) => {
        const active = pathname === it.href;
        if (it.locked) {
          return (
            <span
              key={it.href}
              className="nav-link nav-link-locked"
              title="Accept the Dare to unlock"
              aria-disabled="true"
            >
              <Icon name={it.icon} className="nav-icon" />
              <span>{it.label}</span>
            </span>
          );
        }
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`nav-link ${active ? "active" : ""}`}
          >
            <Icon name={it.icon} className="nav-icon" />
            <span>{it.label}</span>
            {it.pill && <span className="nav-pill">{it.pill}</span>}
          </Link>
        );
      })}
    </aside>
  );
}
