"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { designChallenge } from "@/lib/api";
import type { ChallengeBrief } from "@/agents/types";


export function DesignerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [idea, setIdea] = useState("");
  const [brief, setBrief] = useState<ChallengeBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const t = useToast();

  const generate = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setErr("");
    setBrief(null);
    try {
      const draft = await designChallenge({ prompt: idea });
      setBrief(draft);
    } catch {
      setErr("The Designer agent couldn't produce a brief. Try a different idea.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setBrief(null);
    setIdea("");
    setErr("");
  };

  const update = <K extends keyof ChallengeBrief>(key: K, value: ChallengeBrief[K]) => {
    setBrief((b) => (b ? { ...b, [key]: value } : b));
  };

  return (
    <Modal open={open} onClose={onClose} width={820}>
      <div className="modal-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar bot size="md" />
          <div>
            <div className="eyebrow-mini">Challenge Designer</div>
            <h2 style={{ fontSize: 22, margin: "6px 0 0", letterSpacing: "-0.02em" }}>
              Draft a new DYD
            </h2>
          </div>
        </div>
      </div>
      <div className="modal-body">
        {!brief && !loading && (
          <>
            <div className="label">Your one-line idea</div>
            <textarea
              className="textarea"
              rows={3}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe the growth challenge idea in one sentence…"
            />
            {err && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "rgba(221,54,54,0.08)",
                  border: "1px solid rgba(221,54,54,0.20)",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "var(--bd-red-300)",
                }}
              >
                {err}
              </div>
            )}
          </>
        )}
        {loading && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div className="spinner" />
            <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>
              The agent is drafting your challenge…
            </div>
          </div>
        )}
        {brief && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="brief-banner">
              <Icon name="sparkles" size={14} />
              <span>
                First draft ready. <strong>Every field is editable</strong> — adjust before publishing.
              </span>
            </div>

            <div className="card-flat">
              <div className="eyebrow-mini">Headline</div>
              <input
                className="input designer-title"
                value={brief.title}
                onChange={(e) => update("title", e.target.value)}
              />
              <div className="label" style={{ marginTop: 12 }}>Subtitle</div>
              <textarea
                className="textarea"
                rows={2}
                value={brief.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
              />
              <div className="label" style={{ marginTop: 12 }}>Description</div>
              <textarea
                className="textarea"
                rows={3}
                value={brief.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>

            <div className="grid-3" style={{ gap: 12 }}>
              <div className="card-flat">
                <div className="eyebrow-mini">Reward</div>
                <input
                  className="input"
                  style={{ marginTop: 8 }}
                  value={brief.reward}
                  onChange={(e) => update("reward", e.target.value)}
                />
              </div>
              <div className="card-flat">
                <div className="eyebrow-mini">Register (days)</div>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="input"
                  style={{ marginTop: 8 }}
                  value={brief.registrationDays}
                  onChange={(e) => update("registrationDays", Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="card-flat">
                <div className="eyebrow-mini">Submit (days)</div>
                <input
                  type="number"
                  min={1}
                  max={120}
                  className="input"
                  style={{ marginTop: 8 }}
                  value={brief.submissionDays}
                  onChange={(e) => update("submissionDays", Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>

            <div className="card-flat">
              <div className="eyebrow-mini">Primary metric</div>
              <input
                className="input"
                style={{ marginTop: 8 }}
                value={brief.primaryMetric}
                onChange={(e) => update("primaryMetric", e.target.value)}
              />
            </div>

            <EditableList
              label="Rules"
              items={brief.rules}
              onChange={(rules) => update("rules", rules)}
              placeholder="New rule…"
            />

            <EditableList
              label="Evidence required"
              items={brief.evidenceRequirements}
              onChange={(items) => update("evidenceRequirements", items)}
              placeholder="New evidence field…"
            />

            <RubricEditor
              rubric={brief.rubric}
              onChange={(rubric) => update("rubric", rubric)}
            />

            <div className="card-flat">
              <div className="eyebrow-mini">Bot launch script</div>
              <textarea
                className="textarea"
                rows={10}
                style={{ marginTop: 10, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
                value={brief.botLaunchScript}
                onChange={(e) => update("botLaunchScript", e.target.value)}
              />
              <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 6 }}>
                Each blank line becomes a beat in The Daremaster's announcement post.
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        {!brief && !loading && (
          <>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={!idea.trim()}
              onClick={generate}
            >
              <Icon name="sparkles" size={14} /> Draft brief
            </button>
          </>
        )}
        {brief && !loading && (
          <>
            <button className="btn btn-ghost" onClick={reset}>Start over</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                t.push(`Brief published: ${brief.title}`, "success");
                onClose();
                reset();
              }}
            >
              Publish as DYD #002
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Editable list (rules, evidence) ───────────────────────────────────────

interface EditableListProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}

function EditableList({ label, items, onChange, placeholder }: EditableListProps) {
  const update = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const add = () => onChange([...items, ""]);
  return (
    <div className="card-flat">
      <div className="eyebrow-mini">{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {items.map((it, i) => (
          <div key={i} className="editable-row">
            <span className="editable-bullet" />
            <input
              className="input"
              value={it}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm editable-remove"
              onClick={() => remove(i)}
              aria-label="Remove"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={add}>
        <Icon name="plus" size={14} /> Add
      </button>
    </div>
  );
}

// ─── Rubric editor ─────────────────────────────────────────────────────────

interface RubricEditorProps {
  rubric: ChallengeBrief["rubric"];
  onChange: (r: ChallengeBrief["rubric"]) => void;
}

function RubricEditor({ rubric, onChange }: RubricEditorProps) {
  const total = rubric.reduce((s, r) => s + r.weight, 0) || 1;
  const update = (i: number, patch: Partial<ChallengeBrief["rubric"][number]>) => {
    const next = [...rubric];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(rubric.filter((_, j) => j !== i));
  const add = () =>
    onChange([
      ...rubric,
      { key: `criterion_${rubric.length + 1}`, label: "New criterion", weight: 10 },
    ]);
  return (
    <div className="card-flat">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="eyebrow-mini">Quality rubric (weighted)</div>
        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
          Sum: {total} · weights normalize at audit time
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {rubric.map((r, i) => (
          <div key={i} className="rubric-edit-row">
            <input
              className="input"
              value={r.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Criterion label"
            />
            <input
              type="range"
              min={0}
              max={50}
              value={r.weight}
              onChange={(e) => update(i, { weight: Number(e.target.value) })}
              className="formula-slider"
            />
            <input
              type="number"
              min={0}
              max={100}
              className="input rubric-row-input"
              value={r.weight}
              onChange={(e) => update(i, { weight: Math.max(0, Number(e.target.value) || 0) })}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm editable-remove"
              onClick={() => remove(i)}
              aria-label="Remove"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={add}>
        <Icon name="plus" size={14} /> Add criterion
      </button>
    </div>
  );
}
