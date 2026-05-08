"use client";

// /agents — admin-only control panel.
//
// Three to four agents live as cards here. Challenge Designer, Hype Bot, and
// the Audit Agent (which just links to /admin) are always shown for admins.
// The Growth Insight Extractor only appears once the challenge has finished.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { PageHead } from "@/components/shell/PageHead";
import { useRole } from "@/lib/role-context";
import { useStage } from "@/lib/stage-context";
import {
  buildHypeBotSnapshot,
  getAgents,
  getAuditQueue,
  getGrowthInsightSent,
  getHypeBotInsightSent,
  getParticipants,
  postHypeBotMessage,
  setFeedPostPinned,
} from "@/lib/api";
import * as hypeBot from "@/agents/hype-bot";
import type { AgentKind, AgentSnapshot, AuditResult, FeedPost, Participant } from "@/lib/types";
import type { HypeBotPost } from "@/agents/types";
import { DesignerModal } from "./DesignerModal";

const AGENT_COLOR: Record<AgentKind, string> = {
  hype_bot:           "agent-orange",
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

  useEffect(() => {
    getAgents().then(setAgents);
  }, []);

  // Re-poll growth-insight flag so the NEW pill drops away the moment Gabo
  // hits "Send insights to Hype Bot" on /insights.
  useEffect(() => {
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
        {byId("hype_bot") && <HypeBotCard snapshot={byId("hype_bot")!} />}
        {byId("audit_assistant") && <AuditAgentCard snapshot={byId("audit_assistant")!} />}
        {stage === "completed" && byId("insight_extractor") && (
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

// ─── Hype Bot ──────────────────────────────────────────────────────────────

const TRIVIAL_VARIANTS: string[] = [
  "The Hype Ranking is heating up. Keep going — every testimonial counts.",
  "Numbers are climbing. Stay focused, the deadline is approaching.",
  "Daredevils are moving fast. Don't fall behind.",
];

/** Builds the final-stage winner post. Scores stay between the audit and the admin. */
async function buildWinnerPost(): Promise<string> {
  const [audits, parts] = await Promise.all([
    getAuditQueue("dyd-001"),
    getParticipants("dyd-001"),
  ]);
  const find = (id: string): { a: AuditResult | undefined; p: Participant | undefined } => ({
    a: audits.find((x) => x.participantId === id),
    p: parts.find((x) => x.id === id),
  });
  const bob = find("p-bob");
  const pat = find("p-patrick");
  const patValidated = pat.a?.validatedItems ?? 0;
  const bobLead = bob.p?.selfReportedValue ?? 0;
  return (
    `Patrick wins DYD #001. ${patValidated} polished testimonials, every story validated, business impact named in every clip. ` +
    `Bob's ${bobLead}-strong Hype lead held for two weeks, but the audit's quality blend tipped the board. ` +
    `Marketing has already turned the corpus into reusable assets — quotes, case studies, sales snippets, LinkedIn drafts.`
  );
}

/** Builds the strong "Charlie dark horse" Day-14 post. No scores leaked. */
async function buildInsightPost(): Promise<string> {
  const [audits, parts] = await Promise.all([
    getAuditQueue("dyd-001"),
    getParticipants("dyd-001"),
  ]);
  const find = (id: string): { a: AuditResult | undefined; p: Participant | undefined } => ({
    a: audits.find((x) => x.participantId === id),
    p: parts.find((x) => x.id === id),
  });
  const bob = find("p-bob");
  const cha = find("p-charlie");
  const bobLead = bob.p?.selfReportedValue ?? 0;
  const charlieValidated = cha.a?.validatedItems ?? 0;
  return (
    `Charlie is the dark horse. ${charlieValidated} clean testimonials, perfect permissions, every story specific. ` +
    `Bob leads the Hype Ranking with ${bobLead} self-reported — but the audit weighs quality just as hard, ` +
    `and on substance both Patrick and Charlie are ahead of him. Quality is rewriting the leaderboard.`
  );
}

function HypeBotCard({ snapshot }: { snapshot: AgentSnapshot }) {
  const { stage } = useStage();
  const t = useToast();
  const [draft, setDraft] = useState<HypeBotPost | null>(null);
  const [posted, setPosted] = useState<FeedPost | null>(null);
  const [pinning, setPinning] = useState(false);
  const [trivialIdx, setTrivialIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  // Day 14: Audit-Agent insight handoff state.
  const [insightSent, setInsightSent] = useState(false);
  const [insightReady, setInsightReady] = useState(false);
  const [auditWorking, setAuditWorking] = useState(false);
  // Completed: dual handoff state (audit 5s, growth 2s).
  const [growthSent, setGrowthSent] = useState(false);
  const [auditFinalReady, setAuditFinalReady] = useState(false);
  const [growthReady, setGrowthReady] = useState(false);
  const [auditFinalLoading, setAuditFinalLoading] = useState(false);
  const [growthLoading, setGrowthLoading] = useState(false);
  const auditTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auditFinalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const growthTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCompleted = stage === "completed";
  const bothFinalReady = auditFinalReady && growthReady;

  // Poll the audit snapshot flag (Day-14 handoff).
  useEffect(() => {
    if (isCompleted) return;
    let cancelled = false;
    const tick = async () => {
      const sent = await getHypeBotInsightSent();
      if (cancelled) return;
      setInsightSent((prev) => {
        if (sent && !prev && !insightReady) {
          setAuditWorking(true);
          if (auditTimer.current) clearTimeout(auditTimer.current);
          auditTimer.current = setTimeout(() => {
            setAuditWorking(false);
            setInsightReady(true);
          }, 4000);
        }
        return sent;
      });
    };
    tick();
    const refresh = () => tick();
    window.addEventListener("dyd:state-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("dyd:state-changed", refresh);
      if (auditTimer.current) clearTimeout(auditTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);

  // Completed: when growth flag flips true, kick BOTH loaders (audit 5s, growth 2s).
  useEffect(() => {
    if (!isCompleted) return;
    let cancelled = false;
    const tick = async () => {
      const v = await getGrowthInsightSent();
      if (cancelled) return;
      setGrowthSent((prev) => {
        if (v && !prev && !bothFinalReady) {
          setAuditFinalLoading(true);
          setGrowthLoading(true);
          if (auditFinalTimer.current) clearTimeout(auditFinalTimer.current);
          if (growthTimer.current) clearTimeout(growthTimer.current);
          auditFinalTimer.current = setTimeout(() => {
            setAuditFinalLoading(false);
            setAuditFinalReady(true);
          }, 5000);
          growthTimer.current = setTimeout(() => {
            setGrowthLoading(false);
            setGrowthReady(true);
          }, 2000);
        }
        return v;
      });
    };
    tick();
    const refresh = () => tick();
    window.addEventListener("dyd:state-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("dyd:state-changed", refresh);
      if (auditFinalTimer.current) clearTimeout(auditFinalTimer.current);
      if (growthTimer.current) clearTimeout(growthTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);

  const generate = async () => {
    setGenerating(true);
    setPosted(null);
    try {
      const snap = await buildHypeBotSnapshot();
      const base = hypeBot.generate(snap);
      let content: string;
      if (isCompleted && bothFinalReady) {
        content = await buildWinnerPost();
      } else if (!isCompleted && insightReady) {
        content = await buildInsightPost();
      } else {
        content = TRIVIAL_VARIANTS[trivialIdx % TRIVIAL_VARIANTS.length];
        setTrivialIdx((i) => i + 1);
      }
      // Brand-new posts have no reactions until people engage with them.
      // The preview should mirror what the feed will actually look like.
      const freshReactions = { fire: 0, clap: 0, rocket: 0, eyes: 0, trophy: 0 };
      setDraft({ ...base, content, reactions: freshReactions });
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
    const fp = await postHypeBotMessage(draft, false, cta);
    setPosted(fp);
    setDraft(null);
    t.push("Daremaster post added to the feed.", "success");
  };

  const regenerate = () => {
    generate();
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

  const blocked = generating || auditWorking || auditFinalLoading || growthLoading;

  return (
    <AgentCardFrame snapshot={snapshot}>
      <ActionPanel
        action={
          <button
            className="btn btn-primary btn-sm"
            disabled={blocked}
            onClick={generate}
          >
            <Icon name="sparkles" size={14} />{" "}
            {generating ? "Generating…" : draft ? "Re-generate" : "Generate next post"}
          </button>
        }
        hint="Reads ranking + deadline state and drafts a contextual broadcast. You review before posting."
      />

      {/* Day-14 audit handoff (gated to non-completed stages). */}
      {!isCompleted && !insightSent && !auditWorking && !insightReady && (
        <div className="agent-note" style={{ marginTop: 12 }}>
          <Icon name="sparkles" size={12} />
          <span>
            For a sharper post, use the <strong>AI Audit Assistant</strong> and send the current snapshot to the Daremaster.
            The next draft will reflect what's really happening on the board.
          </span>
        </div>
      )}

      {!isCompleted && auditWorking && (
        <div className="audit-working">
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          <span>Audit Agent working…</span>
        </div>
      )}

      {/* Completed: dual handoff loaders + readiness pills. */}
      {isCompleted && !growthSent && !bothFinalReady && (
        <div className="agent-note" style={{ marginTop: 12 }}>
          <Icon name="sparkles" size={12} />
          <span>
            Run the <strong>Growth Insight Extractor</strong> and send its bundle to the Daremaster to unlock the winner announcement.
          </span>
        </div>
      )}
      {isCompleted && (auditFinalLoading || growthLoading || (growthSent && !bothFinalReady)) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div className={`audit-working${auditFinalReady ? " is-done" : ""}`}>
            {auditFinalReady ? (
              <Icon name="check" size={14} />
            ) : (
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            )}
            <span>{auditFinalReady ? "Audit Agent insight loaded." : "Info arriving from the Audit Agent…"}</span>
          </div>
          <div
            className={`audit-working${growthReady ? " is-done" : ""}`}
            style={{
              background: "rgba(143,213,191,0.06)",
              borderColor: "rgba(143,213,191,0.20)",
              color: "var(--bd-green-300)",
            }}
          >
            {growthReady ? (
              <Icon name="check" size={14} />
            ) : (
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            )}
            <span>{growthReady ? "Growth Agent insight loaded." : "Info arriving from the Growth Insight Extractor…"}</span>
          </div>
        </div>
      )}

      {!isCompleted && insightReady && !auditWorking && !draft && !posted && (
        <div className="agent-note" style={{ marginTop: 12, borderColor: "rgba(143,213,191,0.30)", background: "rgba(143,213,191,0.06)" }}>
          <Icon name="check" size={12} />
          <span>Audit Agent insight loaded. Generate again for a stronger post.</span>
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
          <button className="btn btn-ghost btn-sm" disabled={generating || auditWorking} onClick={regenerate}>
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
  reactions: HypeBotPost["reactions"];
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
