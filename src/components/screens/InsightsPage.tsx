"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHead } from "@/components/shell/PageHead";
import { useToast } from "@/components/ui/Toast";
import { useRole } from "@/lib/role-context";
import { useStage } from "@/lib/stage-context";
import { getGrowthAssets, getGrowthInsightSent, sendGrowthInsightSnapshot } from "@/lib/api";
import type { InsightBundle } from "@/agents/types";

const BUNDLE_KEY = "dyd:insight-bundle:v1";

function loadCachedBundle(): InsightBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BUNDLE_KEY);
    return raw ? (JSON.parse(raw) as InsightBundle) : null;
  } catch {
    return null;
  }
}

function saveCachedBundle(bundle: InsightBundle): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUNDLE_KEY, JSON.stringify(bundle));
  } catch {}
}

// Module-scoped so a navigation away mid-run doesn't lose the in-flight
// extraction. On return, the page rehydrates from this promise.
let inFlightExtraction: Promise<InsightBundle> | null = null;

function runExtraction(): Promise<InsightBundle> {
  if (inFlightExtraction) return inFlightExtraction;
  inFlightExtraction = (async () => {
    try {
      await new Promise((res) => setTimeout(res, 5000));
      const bundle = await getGrowthAssets("dyd-001");
      saveCachedBundle(bundle);
      return bundle;
    } finally {
      inFlightExtraction = null;
    }
  })();
  return inFlightExtraction;
}

export function InsightsPage() {
  const { role } = useRole();
  const { stage } = useStage();
  const t = useToast();
  const [data, setData] = useState<InsightBundle | null>(null);
  const [running, setRunning] = useState(false);
  const [sentToHype, setSentToHype] = useState(false);
  const [sending, setSending] = useState(false);

  const trigger = async () => {
    setRunning(true);
    try {
      const bundle = await runExtraction();
      setData(bundle);
      // A re-run produces a new bundle; the Send-to-Daremaster affordance
      // should re-appear so the admin can ship this one.
      setSentToHype(false);
    } finally {
      setRunning(false);
    }
  };

  const sendToDaremaster = async () => {
    setSending(true);
    try {
      await sendGrowthInsightSnapshot();
      setSentToHype(true);
      t.push("Insights sent. The Daremaster will use them on the next post.", "success");
    } finally {
      setSending(false);
    }
  };

  // On mount: if an extraction is in-flight, attach to it; else hydrate from
  // the localStorage cache; else stay on the empty landing.
  useEffect(() => {
    if (inFlightExtraction) {
      setRunning(true);
      inFlightExtraction
        .then((bundle) => {
          setData(bundle);
          setSentToHype(false);
        })
        .finally(() => setRunning(false));
      return;
    }
    const cached = loadCachedBundle();
    if (cached) {
      setData(cached);
      getGrowthInsightSent().then(setSentToHype);
    }
  }, []);

  // Participants land directly on the report once the challenge has ended —
  // they reach this page via the winner-announcement link in the feed.
  useEffect(() => {
    if (stage === "completed" && role === "participant" && !data && !running) {
      getGrowthAssets("dyd-001").then((bundle) => {
        setData(bundle);
        saveCachedBundle(bundle);
      });
    }
  }, [stage, role, data, running]);

  // The extractor only runs once the challenge has finished.
  if (stage !== "completed") {
    if (role !== "admin") {
      return (
        <div>
          <PageHead
            eyebrow="Growth insights"
            title="Coming soon"
            sub="Growth insights become available once the challenge ends."
          />
        </div>
      );
    }
    return (
      <div>
        <PageHead
          eyebrow="Growth insights"
          title="Available once the challenge ends"
          sub="The Growth Insight Extractor mines the approved evidence corpus. It turns the testimonials into reusable marketing assets — but only after the audit closes."
        />
      </div>
    );
  }

  // Pre-trigger landing for admin only.
  if (!data && role === "admin") {
    return (
      <div>
        <PageHead
          eyebrow="Growth insights"
          title="Reusable assets, not just a winner"
          sub="DYD does not end with a winner. It ends with reusable growth assets — quotes, case studies, sales snippets, LinkedIn drafts."
        />
        <div className="card" style={{ padding: 28, marginTop: 8 }}>
          <div className="eyebrow-mini">Growth Insight Extractor</div>
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, marginTop: 10, maxWidth: 620 }}>
            Click trigger to mine the approved testimonials. The agent extracts top quotes, builds case-study leads, drafts LinkedIn posts, and surfaces sales snippets — everything Marketing and Growth need to turn this Dare into pipeline.
          </p>
          <button className="btn btn-primary btn-lg" disabled={running} onClick={trigger} style={{ marginTop: 20 }}>
            <Icon name="sparkles" size={16} />{" "}
            {running ? "Extracting insights…" : "Run Growth Insight Extractor"}
          </button>
          {running && (
            <div className="audit-working" style={{ marginTop: 18, color: "var(--bd-orange)", background: "rgba(246,97,53,0.06)", borderColor: "rgba(246,97,53,0.20)" }}>
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              <span>Mining quotes, case studies, sales snippets, and LinkedIn drafts…</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <PageHead
        eyebrow="Growth insights"
        title="Reusable assets, not just a winner"
        sub="DYD does not end with a winner. It ends with reusable growth assets."
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          padding: "10px 14px",
          background: "rgba(246,97,53,0.06)",
          border: "1px solid rgba(246,97,53,0.20)",
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
          <span style={{ color: "var(--bd-orange)", fontWeight: 700 }}>Generated by Growth Insight Extractor</span>
          {" · "}
          {new Date(data.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        </div>
        {role === "admin" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {sentToHype ? (
              <span className="pill pill-green">
                <Icon name="check" size={12} /> Sent to Daremaster
              </span>
            ) : (
              <button className="btn btn-primary btn-sm" disabled={sending} onClick={sendToDaremaster}>
                <Icon name="send" size={12} /> {sending ? "Sending…" : "Send insights to Daremaster"}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" disabled={running} onClick={trigger}>
              <Icon name="reset" size={12} /> {running ? "Re-extracting…" : "Re-run extractor"}
            </button>
          </div>
        )}
      </div>
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <Kpi label="Submitted"  value={data.totals.submitted} sub="all evidence packages" />
        <Kpi label="Approved"   value={data.totals.approved}  sub="post human review" />
        <Kpi label="Marketing assets generated" value={data.totals.quotes + data.totals.caseStudies + data.totals.snippets + data.totals.linkedinPosts} sub="quotes, snippets, posts, case studies" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="eyebrow-mini">Top quotes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            {data.topQuotes.map((q, i) => (
              <div
                key={i}
                style={{
                  padding: 14,
                  background: "var(--surface-0)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                }}
              >
                <p style={{ fontSize: 14, color: "var(--fg-1)", lineHeight: 1.55, margin: 0 }}>
                  &ldquo;{q.quote}&rdquo;
                </p>
                <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 8 }}>
                  — <strong style={{ color: "var(--fg-2)" }}>{q.client}</strong>, {q.company}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="eyebrow-mini">Case studies</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              {data.caseStudies.map((cs, i) => (
                <div key={i}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cs.title}</div>
                  <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.5 }}>
                    {cs.summary}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="eyebrow-mini">Sales snippets</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {data.snippets.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span className="pill pill-orange" style={{ fontSize: 9 }}>{s.tag}</span>
                  <span style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="eyebrow-mini">LinkedIn drafts</div>
        <div className="grid-2" style={{ marginTop: 14, gap: 14 }}>
          {data.linkedinPosts.map((p, i) => (
            <div
              key={i}
              style={{
                padding: 14,
                background: "var(--surface-0)",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{p.title}</div>
              <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55, margin: 0 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 32,
          padding: "32px 28px",
          textAlign: "center",
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(246,97,53,0.10), rgba(246,97,53,0.02))",
          border: "1px solid rgba(246,97,53,0.30)",
        }}
      >
        <h2
          style={{
            fontSize: 36,
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          DYD turns internal competition<br />
          into external growth<span style={{ color: "var(--bd-orange)" }}>.</span>
        </h2>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-delta">{sub}</div>
    </div>
  );
}
