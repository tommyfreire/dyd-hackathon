"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PageHead } from "@/components/shell/PageHead";
import { useRole } from "@/lib/role-context";
import { useStage } from "@/lib/stage-context";
import {
  adminDeclareWinner,
  adminOverrideScore,
  getAuditQueue,
  getDaremasterInsightSent,
  getParticipants,
  sendDaremasterSnapshot,
} from "@/lib/api";
import {
  computeFormulaScore,
  effectiveFinalScore,
  formulaTrace,
  loadFormula,
  qualityComponent,
  quantityComponent,
  saveFormula,
  type ScoringFormulaConfig,
} from "@/lib/formula";
import type { AuditResult, Participant } from "@/lib/types";

const RUBRIC_LABEL: Record<string, string> = {
  clarity: "Clarity",
  businessImpact: "Business impact",
  clientRelevance: "Client relevance",
  specificity: "Specificity",
  permissionCompleteness: "Permission",
};

export function AdminPage() {
  const { role } = useRole();
  const { stage } = useStage();
  const router = useRouter();
  const t = useToast();
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [parts, setParts] = useState<Participant[]>([]);
  const [tab, setTab] = useState<"compare" | "queue">("compare");
  const [formula, setFormula] = useState<ScoringFormulaConfig>(() => loadFormula());
  const [openId, setOpenId] = useState<string | null>(null);
  const [snapshotSent, setSnapshotSent] = useState(false);
  const [showInsightCta, setShowInsightCta] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);

  const refresh = useCallback(async () => {
    setAudits(await getAuditQueue("dyd-001"));
    setParts(await getParticipants("dyd-001"));
    setSnapshotSent(await getDaremasterInsightSent());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateFormula = (patch: Partial<ScoringFormulaConfig>) => {
    setFormula((f) => {
      const next = { ...f, ...patch };
      saveFormula(next);
      return next;
    });
  };

  if (role !== "admin") {
    return (
      <div>
        <PageHead
          eyebrow="Admin review"
          title="Admin only"
          sub="Switch to the Admin role from the top bar to review submissions."
        />
      </div>
    );
  }

  const findP = (id: string) => parts.find((p) => p.id === id);
  const findA = (id: string) => audits.find((a) => a.participantId === id);
  const onOverride = async (pid: string, score: number) => {
    await adminOverrideScore(pid, score);
    t.push(`Override saved for ${findP(pid)?.name ?? pid} → ${score.toFixed(1)}/10`, "success");
    refresh();
  };
  const onWinner = async (pid: string) => {
    await adminDeclareWinner(pid);
    t.push(`Winner declared: ${findP(pid)?.name ?? pid}`, "success");
    refresh();
    // Surface the next call-to-action: the Growth Insight Extractor is
    // now available — invite Gabo straight to /agents.
    setShowInsightCta(true);
  };

  const openParticipant = openId ? findP(openId) : null;
  const openAudit = openId ? findA(openId) : null;

  // Sorted ranking with live final scores. Used in the "Accept Scores" modal
  // and to decide who the "Declare winner" button proposes.
  const ranked = useMemo(() => {
    return audits
      .map((a) => {
        const p = parts.find((x) => x.id === a.participantId);
        return p ? { a, p, score: effectiveFinalScore(a, formula) } : null;
      })
      .filter((r): r is { a: AuditResult; p: Participant; score: number } => r !== null)
      .sort((a, b) => b.score - a.score);
  }, [audits, parts, formula]);
  const topRanked = ranked[0];

  // Pre-Day-14 stages: audits don't yet exist. Show a polite empty state.
  if (stage === "launch" || stage === "day_3") {
    return (
      <div>
        <PageHead
          eyebrow="Admin review"
          title="Audits not yet available"
          sub="The AI Audit Assistant runs once submissions start coming in. Check back at Day 14 to configure the scoring formula and feed insight to the Daremaster."
        />
      </div>
    );
  }

  const isFinished = stage === "completed";

  const onSendSnapshot = async () => {
    await sendDaremasterSnapshot();
    setSnapshotSent(true);
    t.push("Snapshot sent. The Daremaster will use it on the next post.", "success");
  };

  return (
    <div>
      <PageHead
        eyebrow="Admin review"
        title={isFinished ? "Quality vs quantity" : "Mid-challenge snapshot"}
        sub={
          isFinished
            ? "AI-assisted review. Final decision requires admin approval."
            : "Configure the scoring formula and review the current snapshot. The full review unlocks once the challenge ends."
        }
      />

      <FormulaPanel
        formula={formula}
        onChange={updateFormula}
        rubricTemplate={
          audits.find((a) => a.rubricBreakdown && a.rubricBreakdown.length)?.rubricBreakdown ?? []
        }
      />

      {/* Day 14: snapshot view + send-to-daremaster. No tabs, no winner. */}
      {!isFinished && (
        <SnapshotView
          audits={audits}
          parts={parts}
          formula={formula}
          snapshotSent={snapshotSent}
          onSendSnapshot={onSendSnapshot}
        />
      )}

      {isFinished && (
        <div className="tab-bar">
          <button className={`tab ${tab === "compare" ? "active" : ""}`} onClick={() => setTab("compare")}>
            {ranked.length >= 2
              ? `${ranked[0].p.name.split(" ")[0]} vs ${ranked[1].p.name.split(" ")[0]}`
              : "Top 2"}
          </button>
          <button className={`tab ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>
            All submissions ({audits.length})
          </button>
        </div>
      )}

      {isFinished && tab === "compare" && ranked.length >= 2 && (
        <>
          <div className="compare">
            <CompareView
              p={ranked[1].p}
              a={ranked[1].a}
              accent="orange"
              formula={formula}
              onOverride={onOverride}
            />
            <div className="compare-divider" />
            <CompareView
              p={ranked[0].p}
              a={ranked[0].a}
              accent="green"
              formula={formula}
              onOverride={onOverride}
            />
          </div>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 20,
              background: "rgba(246,97,53,0.06)",
              border: "1px solid rgba(246,97,53,0.20)",
              borderRadius: 12,
              gap: 16,
            }}
          >
            <div>
              <div className="eyebrow-mini">The takeaway</div>
              <div style={{ fontSize: 16, marginTop: 8, color: "var(--fg-1)" }}>
                {ranked[0].p.name.split(" ")[0]} edges {ranked[1].p.name.split(" ")[0]}{" "}
                <strong style={{ color: "var(--bd-green-300)" }}>{ranked[0].score.toFixed(1)}/10</strong>{" "}
                vs{" "}
                <strong>{ranked[1].score.toFixed(1)}/10</strong>{" "}
                under the current formula. Quality decided the board over Hype-only volume.
              </div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => setShowRankingModal(true)}>
              <Icon name="check" size={16} /> Accept Scores
            </button>
          </div>
        </>
      )}

      {isFinished && tab === "queue" && (
        <>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {audits.map((a, idx) => {
              const p = findP(a.participantId);
              if (!p) return null;
              const score = effectiveFinalScore(a, formula);
              return (
                <button
                  key={a.participantId}
                  onClick={() => setOpenId(a.participantId)}
                  className="queue-row"
                  style={{
                    borderBottom:
                      idx === audits.length - 1 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <div className="rank-meta">
                    <Avatar initials={p.avatarInitials} size="md" />
                    <div>
                      <div className="rank-meta-name">{p.name}</div>
                      <div className="rank-meta-role">{p.role}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-2)" }}>
                    Declared {a.declaredMetric} · validated {a.validatedItems} · {a.flags.length} flag(s) ·
                    quality {a.qualityScore}/100
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "var(--fg-1)", textAlign: "right" }}>
                    {score.toFixed(1)}
                    <span style={{ fontSize: 12, color: "var(--fg-4)", fontWeight: 600 }}>/10</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                    <StatusPill status={a.adminStatus} />
                    <span style={{ fontSize: 18, color: "var(--fg-4)", lineHeight: 1 }}>›</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn btn-primary btn-lg" onClick={() => setShowRankingModal(true)}>
              <Icon name="check" size={16} /> Accept Scores
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: "var(--fg-4)" }}>
        AI-assisted review. Final decision requires admin approval.
      </div>

      <Modal open={!!openId} onClose={() => setOpenId(null)} width={720}>
        {openParticipant && openAudit && (
          <div style={{ padding: 28 }}>
            <CompareView
              p={openParticipant}
              a={openAudit}
              accent="orange"
              formula={formula}
              onOverride={async (pid, score) => {
                await onOverride(pid, score);
              }}
              compact
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showRankingModal} onClose={() => setShowRankingModal(false)} width={560}>
        <div style={{ padding: 28 }}>
          <div className="eyebrow-mini">Final ranking</div>
          <h2 style={{ fontSize: 22, margin: "8px 0 6px", letterSpacing: "-0.01em" }}>
            Confirm the winner
          </h2>
          <p className="muted" style={{ fontSize: 13, margin: "0 0 20px" }}>
            Final scores under the current formula. The admin makes the call.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ranked.map(({ a, p, score }, idx) => (
              <div
                key={a.participantId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: idx === ranked.length - 1 ? "none" : "1px solid var(--border)",
                }}
              >
                <div style={{ fontWeight: 700, color: idx === 0 ? "var(--bd-green-300)" : "var(--fg-3)" }}>
                  #{idx + 1}
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-1)", fontWeight: idx === 0 ? 700 : 500 }}>
                  {p.name}
                </div>
                <div style={{ fontWeight: 700, color: "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>
                  {score.toFixed(1)}<span style={{ fontSize: 11, color: "var(--fg-4)" }}>/10</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => setShowRankingModal(false)}>
              Cancel
            </button>
            {topRanked && (
              <button
                className="btn btn-primary btn-lg"
                onClick={async () => {
                  setShowRankingModal(false);
                  await onWinner(topRanked.a.participantId);
                }}
              >
                <Icon name="trophy" size={16} /> Declare {topRanked.p.name.split(" ")[0]} the winner
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={showInsightCta} onClose={() => setShowInsightCta(false)} width={520}>
        <div className="cta-modal">
          <div className="cta-modal-icon"><Icon name="sparkles" size={28} /></div>
          <div className="eyebrow-mini">Growth Insight Extractor available</div>
          <h2 className="cta-modal-title">Turn this into pipeline.</h2>
          <p className="cta-modal-body">
            Patrick is the winner. The approved testimonials are ready to mine. The Growth Insight Extractor will turn the corpus into reusable marketing assets — quotes, case studies, sales snippets, LinkedIn drafts.
          </p>
          <div className="cta-modal-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                setShowInsightCta(false);
                router.push("/agents");
              }}
            >
              <Icon name="sparkles" size={16} /> Open AI Agents
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowInsightCta(false)}>
              Later
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Day-14 snapshot view ───────────────────────────────────────────────────

interface SnapshotViewProps {
  audits: AuditResult[];
  parts: Participant[];
  formula: ScoringFormulaConfig;
  snapshotSent: boolean;
  onSendSnapshot: () => void | Promise<void>;
}

function SnapshotView({ audits, parts, formula, snapshotSent, onSendSnapshot }: SnapshotViewProps) {
  // Sort by current effective score, descending.
  const ranked = [...audits]
    .map((a) => ({ a, p: parts.find((x) => x.id === a.participantId), score: effectiveFinalScore(a, formula) }))
    .filter((r) => r.p)
    .sort((a, b) => b.score - a.score);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow-mini">Current snapshot</div>
          <div style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 8, maxWidth: 540, lineHeight: 1.55 }}>
            Live evaluation of every participant against the current formula. Sending this snapshot to the Daremaster lets it generate an insightful next post about the state of the competition.
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={onSendSnapshot}
          disabled={snapshotSent}
        >
          <Icon name="send" size={14} />{" "}
          {snapshotSent ? "Snapshot sent" : "Send snapshot to Daremaster"}
        </button>
      </div>
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {ranked.map(({ a, p, score }, idx) => (
          <div
            key={a.participantId}
            className="queue-row"
            style={{
              borderBottom: idx === ranked.length - 1 ? "none" : "1px solid var(--border)",
              cursor: "default",
            }}
          >
            <div className="rank-meta">
              <Avatar initials={p!.avatarInitials} size="md" />
              <div>
                <div className="rank-meta-name">{p!.name}</div>
                <div className="rank-meta-role">{p!.role}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-2)" }}>
              Declared {a.declaredMetric} · validated {a.validatedItems} · {a.flags.length} flag(s) · quality {a.qualityScore}/100
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "var(--fg-1)", textAlign: "right" }}>
              {score.toFixed(1)}
              <span style={{ fontSize: 12, color: "var(--fg-4)", fontWeight: 600 }}>/10</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", textAlign: "right" }}>
              {a.recommendation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Formula panel ──────────────────────────────────────────────────────────

type RubricTemplate = NonNullable<AuditResult["rubricBreakdown"]>;

interface FormulaPanelProps {
  formula: ScoringFormulaConfig;
  onChange: (patch: Partial<ScoringFormulaConfig>) => void;
  rubricTemplate: RubricTemplate;
}

function FormulaPanel({ formula, onChange, rubricTemplate }: FormulaPanelProps) {
  const w = Math.round(formula.qualityWeight * 100);
  const [rubricOpen, setRubricOpen] = useState(false);
  const customized = !!formula.rubricWeights && Object.keys(formula.rubricWeights).length > 0;

  const updateRubricWeight = (key: string, value: number) => {
    const next: Record<string, number> = {
      ...defaultRubricWeights(rubricTemplate),
      ...(formula.rubricWeights ?? {}),
      [key]: Math.max(0, Math.round(value)),
    };
    onChange({ rubricWeights: next });
  };
  const resetRubric = () => onChange({ rubricWeights: undefined });

  return (
    <div className="formula-panel">
      <div className="formula-head">
        <div>
          <div className="eyebrow-mini">Scoring formula</div>
          <div className="formula-equation">
            <span>Final score</span>
            <span className="formula-eq">=</span>
            <button
              type="button"
              className={`formula-term formula-term-quality formula-term-clickable${rubricOpen ? " is-open" : ""}`}
              onClick={() => setRubricOpen((o) => !o)}
              onDoubleClick={() => setRubricOpen(true)}
              title="Click to configure how Quality is calculated"
            >
              Quality × {w}%
              <Icon name="settings" size={12} />
              {customized && <span className="formula-term-dot" aria-label="customized" />}
            </button>
            <span className="formula-plus">+</span>
            <span className="formula-term formula-term-quantity">Quantity × {100 - w}%</span>
            <span className="formula-scale">on a 0–10 scale</span>
          </div>
        </div>
        <div className="formula-hint">
          Live recompute. Move the slider to bias the challenge toward quality or quantity. Click <strong>Quality</strong> to tune its rubric.
        </div>
      </div>

      <div className="formula-controls formula-controls-single">
        <div className="formula-control">
          <div className="formula-control-label">
            <span>Quality vs quantity</span>
            <span className="formula-control-value">
              {w}% quality · {100 - w}% quantity
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={w}
            onChange={(e) => onChange({ qualityWeight: Number(e.target.value) / 100 })}
            className="formula-slider"
          />
          <div className="formula-slider-axis">
            <span>All quantity</span>
            <span>All quality</span>
          </div>
        </div>
      </div>

      {rubricOpen && rubricTemplate.length > 0 && (
        <RubricEditor
          template={rubricTemplate}
          weights={{ ...defaultRubricWeights(rubricTemplate), ...(formula.rubricWeights ?? {}) }}
          customized={customized}
          onChange={updateRubricWeight}
          onReset={resetRubric}
        />
      )}
    </div>
  );
}

function defaultRubricWeights(template: RubricTemplate): Record<string, number> {
  return Object.fromEntries(template.map((b) => [b.key, b.max ?? 0]));
}

// ─── Rubric editor ──────────────────────────────────────────────────────────

interface RubricEditorProps {
  template: RubricTemplate;
  weights: Record<string, number>;
  customized: boolean;
  onChange: (key: string, value: number) => void;
  onReset: () => void;
}

function RubricEditor({ template, weights, customized, onChange, onReset }: RubricEditorProps) {
  const sum = template.reduce((s, b) => s + (weights[b.key] ?? 0), 0) || 1;
  return (
    <div className="rubric-editor">
      <div className="rubric-editor-head">
        <div>
          <div className="eyebrow-mini">Quality: how is it calculated?</div>
          <div className="rubric-editor-help">
            The Quality term blends the {template.length} audit criteria below. Tune the weight admin gives each — values are normalized to sum to 100.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onReset}
          disabled={!customized}
        >
          Reset to defaults
        </button>
      </div>
      <div className="rubric-rows">
        {template.map((b) => {
          const value = weights[b.key] ?? 0;
          const share = Math.round((value / sum) * 100);
          return (
            <div key={b.key} className="rubric-row">
              <div className="rubric-row-label">
                <span>{b.label ?? b.key}</span>
              </div>
              <div className="rubric-row-control">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={value}
                  onChange={(e) => onChange(b.key, Number(e.target.value))}
                  className="formula-slider"
                />
                <span className="rubric-row-share">{share}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Compare/detail view (used in both compare tab and queue modal) ──────────

interface CompareViewProps {
  p: Participant;
  a: AuditResult;
  accent: "orange" | "green";
  formula: ScoringFormulaConfig;
  onOverride: (pid: string, score: number) => void | Promise<void>;
  compact?: boolean;
}

function CompareView({ p, a, accent, formula, onOverride, compact }: CompareViewProps) {
  const accentColor = accent === "green" ? "var(--bd-green-300)" : "var(--bd-orange)";
  const isOverridden = typeof a.overrideScore === "number";
  const formulaScore = computeFormulaScore(a, formula);
  const finalScore = effectiveFinalScore(a, formula);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(finalScore.toFixed(1));

  const startOverride = () => {
    setDraft(finalScore.toFixed(1));
    setEditing(true);
  };
  const confirmOverride = async () => {
    const n = Number(draft);
    if (Number.isFinite(n)) {
      await onOverride(p.id, Math.max(0, Math.min(10, n)));
    }
    setEditing(false);
  };

  return (
    <div className={compact ? "" : "compare-side"} style={compact ? { padding: 0 } : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Avatar initials={p.avatarInitials} size="lg" />
        <div>
          <h3>{p.name}</h3>
          <div className="role">{p.role}</div>
        </div>
        <span
          className={`pill ${accent === "green" ? "pill-green" : "pill-orange"}`}
          style={{ marginLeft: "auto" }}
        >
          Hype #{p.hypeRank}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
        <Stat label="Declared" value={String(a.declaredMetric)} />
        <Stat label="Validated" value={String(a.validatedItems)} />
        <Stat label="Quality" value={String(a.qualityScore)} suffix="/100" />
      </div>

      <div className="score-stack">
        {(a.rubricBreakdown ?? []).map((r) => {
          const max = r.max ?? 20;
          return (
            <div className="score-row" key={r.key}>
              <span className="lbl">{r.label ?? RUBRIC_LABEL[r.key] ?? r.key}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(r.score / max) * 100}%`, background: accentColor }}
                />
              </div>
              <span className="val">{r.score}/{max}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        {a.flags.length === 0 ? (
          <div className="flag-clean"><Icon name="check" size={14} /> No flags. Audit clean.</div>
        ) : (
          <div className="flag-list">
            {a.flags.map((f, i) => (
              <div key={i} className="flag-item">
                <Icon name="alertTriangle" size={14} />{f}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          background: "var(--surface-0)",
          borderRadius: 10,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="eyebrow-mini">{isOverridden ? "Final score (overridden)" : "Suggested final score"}</div>
          {isOverridden && (
            <span className="pill pill-blue" style={{ fontSize: 10 }}>Admin override</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", color: accentColor }}>
            {finalScore.toFixed(1)}
          </span>
          <span style={{ fontSize: 14, color: "var(--fg-3)", fontWeight: 600 }}>/ 10</span>
          {isOverridden && (
            <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
              (formula → {formulaScore.toFixed(1)})
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>{a.recommendation}</div>
        <ScoreReceipt audit={a} formula={formula} />

        <div className="agent-note">
          <Icon name="sparkles" size={12} />
          <span>
            <strong>You can always override the score.</strong> The AI Audit Assistant is a suggestion based on your scoring formula — your decision as admin is final.
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
        {editing ? (
          <>
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="input override-input"
              autoFocus
            />
            <span style={{ fontSize: 12, color: "var(--fg-4)" }}>/ 10</span>
            <button className="btn btn-primary btn-sm" onClick={confirmOverride}>
              <Icon name="check" size={14} /> Save override
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" onClick={startOverride}>
              {isOverridden ? "Override again" : "Override score"}
            </button>
            <StatusPill status={a.adminStatus} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Receipt (audit trace + formula trace) ─────────────────────────────────

function ScoreReceipt({ audit, formula }: { audit: AuditResult; formula: ScoringFormulaConfig }) {
  const [open, setOpen] = useState(false);
  const auditTrace = audit.trace ?? [];
  const fTrace = formulaTrace(audit, formula);
  const q = qualityComponent(audit, formula).toFixed(1);
  const n = quantityComponent(audit, formula).toFixed(1);
  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--bd-orange)",
          padding: 0,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon name={open ? "minus" : "plus"} size={12} />
        How this score is computed
      </button>
      {open && (
        <div
          style={{
            margin: "10px 0 0",
            padding: "12px 14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--fg-3)",
            lineHeight: 1.55,
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--fg-2)", marginBottom: 6 }}>Audit findings</div>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {auditTrace.map((line, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{line}</li>
            ))}
          </ol>
          <div style={{ fontWeight: 700, color: "var(--fg-2)", margin: "12px 0 6px" }}>
            Formula (Quality {q}, Quantity {n})
          </div>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {fTrace.map((line, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{line}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Small atoms ───────────────────────────────────────────────────────────

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div
      style={{
        background: "var(--surface-0)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "var(--fg-4)",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
        {value}
        {suffix && <span style={{ fontSize: 12, color: "var(--fg-4)", marginLeft: 2 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: AuditResult["adminStatus"] }) {
  if (status === "pending") return null;
  const map: Record<string, { cls: string; label: string }> = {
    approved: { cls: "pill-green", label: "Approved" },
    rejected: { cls: "pill-red", label: "Rejected" },
    overridden: { cls: "pill-blue", label: "Overridden" },
  };
  const v = map[status];
  if (!v) return null;
  return <span className={`pill ${v.cls}`}>{v.label}</span>;
}
