"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { getAdminReviewOpened, getNotifications } from "@/lib/api";
import type { Notification } from "@/lib/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [adminReviewOpened, setAdminReviewOpened] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      getNotifications().then(setNotifs);
      setAdminReviewOpened(getAdminReviewOpened());
    };
    refresh();
    window.addEventListener("dyd:state-changed", refresh);
    return () => window.removeEventListener("dyd:state-changed", refresh);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visibleNotifs = adminReviewOpened
    ? notifs.filter((n) => n.id !== "n-audit-ready")
    : notifs;
  const unread = visibleNotifs.filter((n) => n.unread).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="tb-icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Icon name="bell" />
        {unread > 0 && <span className="dot" />}
      </button>
      {open && (
        <div className="notif-panel">
          <div
            style={{
              padding: "8px 12px 4px",
              fontSize: 11,
              color: "var(--fg-4)",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Notifications
          </div>
          {visibleNotifs.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.unread ? "unread" : ""}`}
              onClick={() => {
                router.push(n.href);
                setOpen(false);
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {n.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 6 }}>
                {n.body}
              </div>
              <div style={{ fontSize: 11, color: "var(--bd-orange)", fontWeight: 600 }}>
                {n.cta} →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
