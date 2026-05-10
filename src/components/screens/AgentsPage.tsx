"use client";

// /agents — admin-only control panel.
//
// Three to four agents live as cards here. Challenge Designer, Daremaster,
// and the Audit Agent (which just links to /admin) are always shown for
// admins. The Growth Insight Extractor only appears once the challenge has
// finished.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { PageHead } from "@/components/shell/PageHead";
import { useRole } from "@/lib/role-context";
import { useStage } from "@/lib/stage-context";
import {
  generateDaremasterPost,
  getAgents,
  getChallenge,
  getGrowthInsightSent,
  getDaremasterInsightSent,
  postDaremasterMessage,
  setFeedPostPinned,
  type DaremasterMode,
} from "@/lib/api";
import type { AgentKind, AgentSnapshot, FeedPost } from "@/lib/types";
import type { DaremasterPost } from "@/agents/types";
import { DesignerModal } from "./DesignerModal";

const AGENT_COLOR: Record<AgentKind, string> = {
  daremaster:         "agent-orange",
  audit_assistant:    "agent-blue",
  challenge_designer: "agent-green",
  insight_extractor:  "agent-purple",
};

export function AgentsPage() {
  const { role } = useRole();
  const { stage } = useStage();
  const [agents, setAgents] = useState<AgentSnapshot[]>([]);
  const [openDesigner, setOpenDesigner] = useState(false);
  const [growthSent, setGrowthSent] = useState(false);
  const [winnerDeclared, setWinnerDeclared] = useState(false);

  useEffect(() => {
    getAgents().then(setAgents);
  }, []);

  // Re-poll growth-insight flag so the NEW pill drops away the moment Gabo
  // hits "Send insights to Daremaster" on /insights.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const [sent, challenge] = await Promise.all([
        getGrowthInsightSent(),
        getChallenge("dyd-001"),
      ]);
      if (cancelled) return;
      setGrowthSent(sent);
      setWinnerDeclared(!!challenge.winnerId);
    };
    tick();
    const refresh = () => tick();
    window.addEventListener("dyd:state-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("dyd:state-changed", refresh);
    };
  }, []);

  if (role !== "admin") {
    return (
      <div>
        <PageHead
          eyebrow="AI agents"
          title="Admin only"
          sub="The agent control panel is reserved for admins. Switch to Admin in the top bar to access it."
        />
      </div>
    );
  }

  const byId = (id: AgentKind) => agents.find((a) => a.id === id);

  return (
    <div>
      <PageHead
        eyebrow="AI agents"
        title="The admin's control panel"
        sub="Agents run DYD in the background. From here you trigger them and see what they produce."
      />
      <div className="grid-2" style={{ gap: 20 }}>
        {byId("challenge_designer") && (
          <ChallengeDesignerCard
            snapshot={byId("challenge_designer")!}
            onOpen={() => setOpenDesigner(true)}
          />
        )}
        {byId("daremaster") && <DaremasterCard snapshot={byId("daremaster")!} />}
        {byId("audit_assistant") && <AuditAgentCard snapshot={byId("audit_assistant")!} />}
        {stage === "completed" && winnerDeclared && byId("insight_extractor") && (
          <InsightExtractorCard snapshot={byId("insight_extractor")!} growthSent={growthSent} />
        )}
      </div>
      <DesignerModal open={openDesigner} onClose={() => setOpenDesigner(false)} />
    </div>
  );
}

// ─── Card frame ─────────────────────────────────────────────────────────────

interface AgentCardFrameProps {
  snapshot: AgentSnapshot;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

function AgentCardFrame({ snapshot, children, headerRight }: AgentCardFrameProps) {
  return (
    <div className={`agent-card ${AGENT_COLOR[snapshot.id] ?? ""}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="agent-avatar"><Icon name="sparkles" size={20} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {snapshot.name}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {snapshot.purpose.split(".")[0]}
          </div>
        </div>
        {headerRight}
      </div>
      <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, marginTop: 14 }}>
        {snapshot.purpose}
      </p>
      {children}
    </div>
  );
}

// ─── Challenge Designer ─────────────────────────────────────────────────────

function ChallengeDesignerCard({ snapshot, onOpen }: { snapshot: AgentSnapshot; onOpen: () => void }) {
  return (
    <AgentCardFrame snapshot={snapshot}>
      <ActionPanel
        action={
          <button className="btn btn-primary btn-sm" onClick={onOpen}>
            <Icon name="sparkles" size={14} /> Draft a new challenge
          </button>
        }
        hint="Turns a one-line growth idea from leadership into a full challenge brief: rules, rubric, deadlines, and bot script."
      />
    </AgentCardFrame>
  );
}

// ─── Audit Agent (links to /admin) ──────────────────────────────────────────

function AuditAgentCard({ snapshot }: { snapshot: AgentSnapshot }) {
  const router = useRouter();
  return (
    <AgentCardFrame snapshot={snapshot}>
      <ActionPanel
        action={
          <button className="btn btn-primary btn-sm" onClick={() => router.push("/admin")}>
            <Icon name="shield" size={14} /> Open Admin Review
          </button>
        }
        hint="Scores every submission against the audit contract and powers the scoring formula. Admin keeps the final say in /admin."
      />
    </AgentCardFrame>
  );
}

// ─── Daremaster ────────────────────────────────────────────────────────────

function DaremasterCard({ snapshot }: { snapshot: AgentSnapshot }) {
  const { stage } = useStage();
  const t = useToast();
  const [draft, setDraft] = useState<DaremasterPost | null>(null);
  const [posted, setPosted] = useState<FeedPost | null>(null);
  const [pinning, setPinning] = useState(false);
  const [trivialIdx, setTrivialIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [insightSent, setInsightSent] = useState(false);
  const [growthSent, setGrowthSent] = useState(false);
  const isCompleted = stage === "completed";

  useEffect(() => {
    if (isCompleted) return;
    let cancelled = false;
    const tick = async () => {
      const sent = await getDaremasterInsightSent();
      if (!cancelled) setInsightSent(sent);
    };
    tick();
    const refresh = () => tick();
    window.addEventListener("dyd:state-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("dyd:state-changed", refresh);
    };
  }, [isCompleted]);

  useEffect(() => {
    if (!isCompleted) return;
    let cancelled = false;
    const tick = async () => {
      const v = await getGrowthInsightSent();
      if (!cancelled) setGrowthSent(v);
    };
    tick();
    const refresh = () => tick();
    window.addEventListener("dyd:state-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("dyd:state-changed", refresh);
    };
  }, [isCompleted]);

  const generate = async (fresh = false) => {
    const alreadySawOutput = !!(draft || posted);
    setGenerating(true);
    setPosted(null);
    try {
      let mode: DaremasterMode;
      if (isCompleted && growthSent) mode = "winner";
      else if (!isCompleted && insightSent) mode = "insight";
      else {
        mode = "trivial";
        setTrivialIdx((i) => i + 1);
      }
      const post = await generateDaremasterPost(mode, {
        trivialIdx,
        fresh: fresh || alreadySawOutput,
      });
      setDraft(post);
    } finally {
      setGenerating(false);
    }
  };

  const accept = async () => {
    if (!draft) return;
    // Any post the Daremaster makes during the completed stage carries the
    // CTA back to the Growth Insights report — the audience never has to
    // click it during the demo, but the link makes the loop visible.
    const cta = isCompleted
      ? { label: "See the growth report", href: "/insights" }
      : undefined;
    const fp = await postDaremasterMessage(draft, false, cta);
    setPosted(fp);
    setDraft(null);
    t.push("Daremaster post added to the feed.", "success");
  };

  const regenerate = () => {
    generate(true);
  };

  const pin = async () => {
    if (!posted) return;
    setPinning(true);
    try {
      await setFeedPostPinned(posted.id, true);
      setPosted({ ...posted, pinned: true });
      t.push("Pinned to the top of the feed.", "success");
    } finally {
      setPinning(false);
    }
  };

  const blocked = generating;

  return (
    <AgentCardFrame snapshot={snapshot}>
      <ActionPanel
        action={
          <button
            className="btn btn-primary btn-sm"
            disabled={blocked}
            onClick={() => generate()}
          >
            <Icon name="sparkles" size={14} />{" "}
            {generating ? "Generating…" : draft ? "Re-generate" : "Generate next post"}
          </button>
        }
        hint="Reads ranking + deadline state and drafts a contextual broadcast. You review before posting."
      />

      {!isCompleted && !insightSent && (
        <div className="agent-note" style={{ marginTop: 12 }}>
          <Icon name="sparkles" size={12} />
          <span>
            For a sharper post, use the <strong>AI Audit Assistant</strong> and send the current snapshot to the Daremaster.
            The next draft will reflect what's really happening on the board.
          </span>
        </div>
      )}

      {!isCompleted && insightSent && !draft && !posted && (
        <div className="agent-note" style={{ marginTop: 12, borderColor: "rgba(143,213,191,0.30)", background: "rgba(143,213,191,0.06)" }}>
          <Icon name="check" size={12} />
          <span>The Daremaster is enriched with the Audit Agent's findings. Generate the next post for a sharper read.</span>
        </div>
      )}

      {isCompleted && !growthSent && (
        <div className="agent-note" style={{ marginTop: 12 }}>
          <Icon name="sparkles" size={12} />
          <span>
            Run the <strong>Growth Insight Extractor</strong> and send its bundle to the Daremaster to unlock the winner announcement.
          </span>
        </div>
      )}

      {isCompleted && growthSent && !draft && !posted && (
        <div className="agent-note" style={{ marginTop: 12, borderColor: "rgba(143,213,191,0.30)", background: "rgba(143,213,191,0.06)" }}>
          <Icon name="check" size={12} />
          <span>The Daremaster is enriched with the Growth Agent's findings. Generate the winner announcement.</span>
        </div>
      )}

      {draft && !posted && (
        <FeedCardPreview
          content={draft.content}
          reactions={draft.reactions}
          pinned={false}
          cta={isCompleted ? { label: "See the growth report", href: "/insights" } : undefined}
        />
      )}

      {draft && !posted && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-success btn-sm" onClick={accept}>
            <Icon name="check" size={14} /> Accept suggestion
          </button>
          <button className="btn btn-ghost btn-sm" disabled={generating} onClick={regenerate}>
            <Icon name="reset" size={14} /> Re-generate
          </button>
        </div>
      )}

      {posted && (
        <>
          <FeedCardPreview
            content={posted.content}
            reactions={posted.reactions}
            pinned={!!posted.pinned}
            cta={posted.cta}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            {!posted.pinned ? (
              <button className="btn btn-primary btn-sm" disabled={pinning} onClick={pin}>
                <Icon name="trophy" size={14} /> {pinning ? "Pinning…" : "Pin this post"}
              </button>
            ) : (
              <span className="pill pill-orange">Pinned at the top of the feed</span>
            )}
          </div>
        </>
      )}
    </AgentCardFrame>
  );
}

// ─── Growth Insight Extractor ──────────────────────────────────────────────

function InsightExtractorCard({ snapshot, growthSent }: { snapshot: AgentSnapshot; growthSent: boolean }) {
  const router = useRouter();
  return (
    <AgentCardFrame snapshot={snapshot} headerRight={!growthSent && <span className="agent-new-pill">NEW</span>}>
      <ActionPanel
        action={
          <button className="btn btn-primary btn-sm" onClick={() => router.push("/insights")}>
            <Icon name="barChart" size={14} /> Open Growth Insights
          </button>
        }
        hint="Mines approved evidence packets for top quotes, case studies, sales snippets, and LinkedIn drafts."
      />
    </AgentCardFrame>
  );
}

// ─── Shared mini-components ────────────────────────────────────────────────

function ActionPanel({ action, hint }: { action: React.ReactNode; hint: string }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px dashed var(--border)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "var(--fg-4)" }}>
        Trigger
      </div>
      <div>{action}</div>
      <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}

interface FeedCardPreviewProps {
  content: string;
  reactions: DaremasterPost["reactions"];
  pinned: boolean;
  cta?: { label: string; href: string };
}

function FeedCardPreview({ content, reactions, pinned, cta }: FeedCardPreviewProps) {
  const router = useRouter();
  return (
    <div className={`feed-card feed-card-preview ${pinned ? "pinned" : ""}`} style={{ marginTop: 12 }}>
      <div className="feed-head">
        <Avatar bot size="md" />
        <div style={{ flex: 1 }}>
          <div className="feed-author">
            Daremaster
            <span className="pill pill-orange" style={{ marginLeft: 8, fontSize: 9 }}>BOT</span>
            {pinned && <span className="pill" style={{ marginLeft: 8, fontSize: 9 }}>PINNED</span>}
            <span className="pill" style={{ marginLeft: 8, fontSize: 9 }}>PREVIEW</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-4)" }}>DYD Bot · just now</div>
        </div>
      </div>
      <div className="feed-content">{content}</div>
      {cta && (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => router.push(cta.href)}
        >
          <Icon name="sparkles" size={14} /> {cta.label}
        </button>
      )}
      <div className="feed-reactions">
        <span className="reaction"><span className="reaction-icon">🔥</span><span>{reactions.fire}</span></span>
        <span className="reaction"><span className="reaction-icon">👏</span><span>{reactions.clap}</span></span>
        <span className="reaction"><span className="reaction-icon">🚀</span><span>{reactions.rocket}</span></span>
        <span className="reaction"><span className="reaction-icon">👀</span><span>{reactions.eyes}</span></span>
        <span className="reaction"><span className="reaction-icon">🏆</span><span>{reactions.trophy}</span></span>
      </div>
    </div>
  );
}
