/* DYD prototype — Agents + Insights + Designer */
const { useState: u2S, useEffect: u2E, useRef: u2R } = React;

const AGENT_DEFS = [
  { id: "hype-bot", name: "Hype Bot", role: "Social broadcaster", trigger: "On milestone events", color: "orange",
    desc: "Posts auto-celebrations to the feed when participants hit milestones, and rallies the room with daily summaries." },
  { id: "audit-assistant", name: "Audit Assistant", role: "Evidence analyst", trigger: "On submission", color: "blue",
    desc: "Reads each submission, validates evidence against the rubric, surfaces flags, and recommends a quality multiplier." },
  { id: "challenge-designer", name: "Challenge Designer", role: "Brief co-pilot", trigger: "On admin draft", color: "green",
    desc: "Helps admins go from a one-line idea to a full challenge brief with clear rules, evidence requirements, and rewards." },
  { id: "post-mortem-agent", name: "Post-Mortem Agent", role: "Insights writer", trigger: "On challenge close", color: "purple",
    desc: "After a challenge closes, drafts a recap, identifies what worked, and suggests the next DYD." },
];

function AgentsPage({ onOpenDesigner }) {
  return (
    <div>
      <PageHead eyebrow="AI agents" title="The cast behind The Dare" sub="Four agents work in the background — three are autonomous, one is interactive."/>
      <div className="grid-2" style={{ gap: 20 }}>
        {AGENT_DEFS.map((a) => (
          <div key={a.id} className={`agent-card agent-${a.color}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="agent-avatar"><Icon name="sparkles" size={20}/></div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{a.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{a.role} · {a.trigger}</div>
              </div>
              {a.id === "challenge-designer" && (
                <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={onOpenDesigner}>Open</button>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, marginTop: 14 }}>{a.desc}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <span className="pill">{a.id === "challenge-designer" ? "Interactive" : "Autonomous"}</span>
              <span className="pill">Powered by Claude Haiku 4.5</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Challenge Designer (real Claude call) ───────────────────────────────
function DesignerModal({ open, onClose }) {
  const [idea, setIdea] = u2S("");
  const [brief, setBrief] = u2S(null);
  const [loading, setLoading] = u2S(false);
  const [err, setErr] = u2S("");
  const t = useToast();

  const generate = async () => {
    if (!idea.trim()) return;
    setLoading(true); setErr(""); setBrief(null);
    try {
      const prompt = `You are the Challenge Designer agent for the DYD ("Do You Dare") platform — an internal hackathon tool where employees compete on a clear, measurable, time-boxed challenge for a real reward.

Given a one-line idea from an admin, output a complete challenge brief as STRICT JSON. The brief must encourage QUALITY of evidence, not just quantity. Keep copy bold and concise; do not pad.

Idea: "${idea}"

Output JSON with exactly these keys:
{
  "title": "string, ≤60 chars, punchy",
  "subtitle": "string, ≤140 chars, what's the dare",
  "rules": [array of 4–6 short rule strings],
  "evidenceRequirements": [array of 3–5 short requirement strings, focused on quality],
  "qualityRubric": [array of 4 objects {"label": "...", "weight": number}, weights summing to 100],
  "suggestedReward": "string ≤80 chars",
  "registrationDays": number,
  "submissionDays": number
}

Return ONLY the JSON, no prose, no markdown.`;
      const text = await window.claude.complete(prompt);
      const cleaned = text.replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```\s*$/, "").trim();
      const parsed = JSON.parse(cleaned);
      setBrief(parsed);
    } catch (e) {
      setErr("Couldn't parse the agent's response. Try again with a different idea.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setBrief(null); setIdea(""); setErr(""); };

  return (
    <Modal open={open} onClose={onClose} width={760}>
      <div className="modal-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar bot size="md"/>
          <div>
            <div className="eyebrow-mini">Challenge Designer · Claude Haiku 4.5</div>
            <h2 style={{ fontSize: 22, margin: "6px 0 0", letterSpacing: "-0.02em" }}>Draft a new DYD</h2>
          </div>
        </div>
      </div>
      <div className="modal-body">
        {!brief && (
          <>
            <div className="label">Your one-line idea</div>
            <textarea className="textarea" rows="3" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Each engineer pairs with sales for one full week and brings back at least one signed pilot proposal."/>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {[
                "Engineers pair with sales for one week",
                "Collect three case-studyable wins this quarter",
                "Ship a public-facing demo every Friday for a month",
              ].map((s) => (
                <button key={s} className="btn btn-ghost btn-sm" onClick={() => setIdea(s)}>{s}</button>
              ))}
            </div>
            {err && <div style={{ marginTop: 12, padding: 12, background: "rgba(221,54,54,0.08)", border: "1px solid rgba(221,54,54,0.20)", borderRadius: 8, fontSize: 13, color: "var(--bd-red-300)" }}>{err}</div>}
          </>
        )}
        {loading && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div className="spinner"/>
            <div className="muted" style={{ marginTop: 14, fontSize: 13 }}>The agent is drafting your challenge…</div>
          </div>
        )}
        {brief && !loading && (
          <div>
            <div className="card-flat">
              <div className="eyebrow-mini">Generated brief</div>
              <h3 style={{ fontSize: 24, margin: "10px 0 6px", letterSpacing: "-0.02em" }}>{brief.title}</h3>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>{brief.subtitle}</p>
            </div>
            <div className="grid-2" style={{ marginTop: 16, gap: 12 }}>
              <div className="card-flat">
                <div className="eyebrow-mini">Rules</div>
                <ol style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
                  {(brief.rules || []).map((r, i) => <li key={i} style={{ marginBottom: 6 }}>{r}</li>)}
                </ol>
              </div>
              <div className="card-flat">
                <div className="eyebrow-mini">Evidence required</div>
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
                  {(brief.evidenceRequirements || []).map((r, i) => <li key={i} style={{ marginBottom: 6 }}>{r}</li>)}
                </ul>
              </div>
            </div>
            <div className="card-flat" style={{ marginTop: 12 }}>
              <div className="eyebrow-mini">Quality rubric (weighted)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {(brief.qualityRubric || []).map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 13 }}>{r.label}</span>
                    <div className="bar-track"><div className="bar-fill bar-fill-orange" style={{ width: `${r.weight}%` }}/></div>
                    <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{r.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <div className="card-flat">
                <div className="eyebrow-mini">Suggested reward</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>{brief.suggestedReward}</div>
              </div>
              <div className="card-flat">
                <div className="eyebrow-mini">Register</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{brief.registrationDays}d</div>
              </div>
              <div className="card-flat">
                <div className="eyebrow-mini">Submit</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{brief.submissionDays}d</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        {!brief && <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!idea.trim() || loading} onClick={generate}>
            <Icon name="sparkles" size={14}/> Draft brief
          </button>
        </>}
        {brief && <>
          <button className="btn btn-ghost" onClick={reset}>Start over</button>
          <button className="btn btn-primary" onClick={() => { t.push("Brief published as DYD #002 (mocked)", "success"); onClose(); reset(); }}>
            Publish as DYD #002
          </button>
        </>}
      </div>
    </Modal>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────
function InsightsPage() {
  const [data, setData] = u2S(null);
  u2E(() => { DYD.api.getInsights().then(setData); }, []);
  if (!data) return null;
  const max = Math.max(...data.engagementOverTime.map((d) => d.posts + d.reactions));
  return (
    <div>
      <PageHead eyebrow="Growth insights" title="What worked, what didn't" sub="Drafted by the Post-Mortem Agent. Edit before you publish."/>
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="kpi-card"><div className="kpi-label">Participation rate</div><div className="kpi-value">{data.kpis.participationRate}%</div><div className="kpi-delta">9/12 invited</div></div>
        <div className="kpi-card"><div className="kpi-label">Submission rate</div><div className="kpi-value">{data.kpis.submissionRate}%</div><div className="kpi-delta">7/9 participants</div></div>
        <div className="kpi-card"><div className="kpi-label">Avg quality score</div><div className="kpi-value">{data.kpis.avgQuality}</div><div className="kpi-delta">/100</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="eyebrow-mini">Engagement over time</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, marginTop: 18, padding: "0 4px" }}>
            {data.engagementOverTime.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 140, width: "100%", justifyContent: "center" }}>
                  <div style={{ width: "45%", height: `${(d.posts / max) * 100}%`, background: "var(--bd-orange)", borderRadius: "3px 3px 0 0" }} title={`${d.posts} posts`}/>
                  <div style={{ width: "45%", height: `${(d.reactions / max) * 100}%`, background: "var(--bd-blue-glow)", borderRadius: "3px 3px 0 0" }} title={`${d.reactions} reactions`}/>
                </div>
                <span style={{ fontSize: 10, color: "var(--fg-4)", fontWeight: 600 }}>{d.day}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "var(--fg-3)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--bd-orange)", borderRadius: 2 }}/>Posts</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--bd-blue-glow)", borderRadius: 2 }}/>Reactions</span>
          </div>
        </div>
        <div className="card">
          <div className="eyebrow-mini">What worked</div>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
            {data.whatWorked.map((w, i) => <li key={i} style={{ marginBottom: 8 }}>{w}</li>)}
          </ul>
          <div className="eyebrow-mini" style={{ marginTop: 24 }}>What needs work</div>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
            {data.whatNeedsWork.map((w, i) => <li key={i} style={{ marginBottom: 8 }}>{w}</li>)}
          </ul>
        </div>
      </div>
      <div className="card" style={{ marginTop: 24 }}>
        <div className="eyebrow-mini">Suggested next dare</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
          <Avatar bot size="lg"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{data.suggestedNextChallenge.title}</div>
            <p style={{ fontSize: 13, color: "var(--fg-3)", margin: "4px 0 0", lineHeight: 1.5 }}>{data.suggestedNextChallenge.rationale}</p>
          </div>
          <button className="btn btn-primary">Open in designer</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AgentsPage, DesignerModal, InsightsPage, AGENT_DEFS });
