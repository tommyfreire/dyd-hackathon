"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { BotMessageCard } from "@/components/ui/BotMessageCard";
import { Disclaimer, PageHead } from "@/components/shell/PageHead";
import { useRole } from "@/lib/role-context";
import { useStage } from "@/lib/stage-context";
import { getHypeRanking } from "@/lib/api";
import type { RankingEntry } from "@/lib/types";
import type { DemoStage } from "@/lib/demo-stages";

export function RankingPage() {
  const { user } = useRole();
  const { stage } = useStage();
  const [rows, setRows] = useState<RankingEntry[]>([]);

  useEffect(() => {
    getHypeRanking("dyd-001").then(setRows);
  }, []);

  const sceneLabel = SCENE_LABEL[stage];
  const botBeat = BOT_BEAT[stage];

  return (
    <div>
      <PageHead
        eyebrow={sceneLabel ?? "Hype ranking"}
        title="Live leaderboard"
        sub="Self-reported progress, live. The Hype Ranking is not the final ranking — admin review with the AI Audit Assistant decides the winner."
      />
      {botBeat && <BotMessageCard message={botBeat} />}
      <Disclaimer>This ranking is based on self-reported progress. Final results may change after human review.</Disclaimer>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="rank-row rank-row-header">
          <div style={headerCell}>#</div>
          <div style={headerCell}>Participant</div>
          <div style={headerCell}>Hype (self-reported)</div>
          <div style={{ ...headerCell, textAlign: "right" }}>Status</div>
        </div>
        {rows.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--fg-3)", fontSize: 14 }}>
            No registered participants yet. The board fills as Daredevils accept the challenge.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rank-row rank-row-2col">
            <div className={`rank-num ${r.hypeRank === 1 ? "top1" : ""}`}>
              {r.hypeRank.toString().padStart(2, "0")}
            </div>
            <div className="rank-meta">
              <Avatar initials={r.avatarInitials} size="md" />
              <div style={{ minWidth: 0 }}>
                <div className="rank-meta-name">
                  {r.name}
                  {user && r.userId === user.id && (
                    <span className="pill" style={{ marginLeft: 6, fontSize: 9 }}>YOU</span>
                  )}
                </div>
                <div className="rank-meta-role">{r.role}</div>
              </div>
            </div>
            <div className="meter-block">
              <div className="meter-row">
                <span>Hype</span>
                <span className="val">{r.selfReportedValue}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill-orange"
                  style={{ width: `${r.hypeProgress}%` }}
                />
              </div>
            </div>
            <div className="rank-actions">
              <MovementPill movement={r.movement} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementPill({ movement }: { movement: RankingEntry["movement"] }) {
  if (movement === "up") {
    return (
      <span className="pill pill-green">
        <Icon name="arrowUp" size={11} /> moved up
      </span>
    );
  }
  if (movement === "down") {
    return (
      <span className="pill pill-red">
        <Icon name="arrowDown" size={11} /> moved down
      </span>
    );
  }
  if (movement === "new") {
    return <span className="pill pill-orange">New entry</span>;
  }
  return <span className="pill" style={{ color: "var(--fg-4)" }}>No movement</span>;
}

const SCENE_LABEL: Partial<Record<DemoStage, string>> = {
  launch:    "Launch — The board is forming",
  day_3:     "Day 3 — First moves",
  day_14:    "Day 14 — Competition heats up",
  completed: "Final standings (snapshot)",
};

const BOT_BEAT: Partial<Record<DemoStage, string>> = {
  day_3:  "First moves are in. The board is taking shape.",
  day_14: "Bob leads with 18 self-reported testimonials. Quality can still flip the board.",
};

const headerCell: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--fg-4)",
  letterSpacing: 1.5,
  textTransform: "uppercase",
};
