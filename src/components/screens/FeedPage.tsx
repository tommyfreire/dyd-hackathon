"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { PageHead } from "@/components/shell/PageHead";
import { useRole } from "@/lib/role-context";
import { useStage } from "@/lib/stage-context";
import { ago, demoNow } from "@/lib/format";
import { getFeed, getHypeRanking, postFeedComment, react } from "@/lib/api";
import type { FeedPost, RankingEntry, ReactionKind } from "@/lib/types";

const REACTIONS: { kind: ReactionKind; icon: string }[] = [
  { kind: "fire",   icon: "🔥" },
  { kind: "clap",   icon: "👏" },
  { kind: "rocket", icon: "🚀" },
  { kind: "eyes",   icon: "👀" },
  { kind: "trophy", icon: "🏆" },
];

export function FeedPage() {
  const { user } = useRole();
  const { stage } = useStage();
  const router = useRouter();
  const nowMs = demoNow(stage);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  const refreshFeed = () => getFeed("dyd-001").then((r) => setPosts(r.posts));

  useEffect(() => {
    refreshFeed();
    getHypeRanking("dyd-001").then(setRanking);
  }, []);

  if (!user) return null;

  const submit = async () => {
    if (!draft.trim()) return;
    await postFeedComment("dyd-001", draft.trim());
    setDraft("");
    refreshFeed();
  };

  const onReact = async (id: string, kind: ReactionKind) => {
    await react(id, kind);
    refreshFeed();
  };

  return (
    <div>
      <PageHead
        eyebrow="Social feed"
        title="The Dare, live"
        sub="Daremaster commentary, participant moves, and team reactions — all the chatter around DYD #001."
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
        <div>
          <div className="composer">
            <Avatar
              initials={user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              size="md"
            />
            <textarea
              placeholder={`What's on your mind, ${user.name.split(" ")[0]}? (Enter to post · Shift+Enter for a new line)`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="composer-actions">
              <button className="btn btn-primary btn-sm" onClick={submit} disabled={!draft.trim()}>
                <Icon name="send" size={14} /> Post
              </button>
            </div>
          </div>
          <div className="feed-list">
            {posts.map((p) => (
              <div key={p.id} className={`feed-card ${p.pinned ? "pinned" : ""}`}>
                <div className="feed-head">
                  <Avatar
                    initials={p.authorType === "bot" ? null : p.author.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    size="md"
                    bot={p.authorType === "bot"}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="feed-author">
                      {p.author}
                      {p.authorType === "bot" && <span className="pill pill-orange" style={{ marginLeft: 8, fontSize: 9 }}>BOT</span>}
                      {p.authorType === "admin" && <span className="pill pill-blue" style={{ marginLeft: 8, fontSize: 9 }}>ADMIN</span>}
                      {p.pinned && <span className="pill" style={{ marginLeft: 8, fontSize: 9 }}>PINNED</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-4)" }}>{p.authorRole || ""} · {ago(p.createdAt, nowMs)}</div>
                  </div>
                </div>
                <div className="feed-content">{p.content}</div>
                {p.cta && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 12 }}
                    onClick={() => router.push(p.cta!.href)}
                  >
                    <Icon name="sparkles" size={14} /> {p.cta.label}
                  </button>
                )}
                <div className="feed-reactions">
                  {REACTIONS.map((r) => (
                    <button key={r.kind} className="reaction" onClick={() => onReact(p.id, r.kind)}>
                      <span className="reaction-icon">{r.icon}</span>
                      <span>{p.reactions[r.kind] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside style={{ position: "sticky", top: 96 }}>
          <div className="card">
            <div className="eyebrow-mini">Top of the hype</div>
            <div className="mini-rank" style={{ marginTop: 12 }}>
              {ranking.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--fg-4)", padding: "8px 12px" }}>
                  No registered participants yet.
                </div>
              )}
              {ranking.slice(0, 5).map((r) => (
                <div key={r.id} className="mini-rank-row">
                  <span className="mini-rank-num">{r.hypeRank}</span>
                  <div>
                    <div className="mini-rank-name">{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-4)" }}>
                      {r.selfReportedValue} {r.selfReportedValue === 1 ? "testimonial" : "testimonials"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
