/* DYD prototype — More screens (Dashboard, Admin, Agents, Insights) */
const { useState: u1S, useEffect: u1E, useRef: u1R } = React;

// ─── Participant Dashboard ────────────────────────────────────────────────
function DashboardPage({ user, onNav }) {
  const [me, setMe] = u1S(null);
  const [submission, setSubmission] = u1S(null);
  const [valueEdit, setValueEdit] = u1S("");
  const [draft, setDraft] = u1S({
    clientName: "", clientCompany: "", clientRole: "",
    permissionToUse: false, businessImpactSummary: "",
    files: [],
  });
  const t = useToast();
  const refresh = async () => {
    const ps = await DYD.api.getParticipants();
    const m = ps.find((p) => p.userId === user.id);
    setMe(m || null);
    if (m) setValueEdit(String(m.selfReportedValue));
    DYD.api.getMySubmission("dyd-001", user.id).then(setSubmission);
  };
  u1E(() => { refresh(); }, [user.id]);
  if (!me) {
    return (
      <div>
        <PageHead eyebrow="My dashboard" title="You haven't joined yet" sub="Accept the Dare from the Challenge page to unlock the participant dashboard."/>
        <button className="btn btn-primary btn-lg" onClick={() => onNav("challenge")}>Go to Challenge</button>
      </div>
    );
  }
  const checklist = [
    { label: "Client name", on: !!draft.clientName },
    { label: "Client company", on: !!draft.clientCompany },
    { label: "Client role", on: !!draft.clientRole },
    { label: "Permission confirmed", on: !!draft.permissionToUse },
    { label: "Business impact summary", on: !!draft.businessImpactSummary },
    { label: "Evidence file uploaded", on: draft.files.length > 0 },
  ];
  const allChecked = checklist.every((c) => c.on);
  const onFiles = (fileList) => {
    const next = Array.from(fileList).map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name, sizeKb: Math.round(f.size / 1024),
      kind: f.type.startsWith("video") ? "video" : f.name.endsWith(".zip") ? "zip" : "other",
      uploadedAt: new Date().toISOString(),
    }));
    setDraft((d) => ({ ...d, files: [...d.files, ...next] }));
  };
  const updateProgress = async () => {
    const v = parseInt(valueEdit, 10);
    if (Number.isNaN(v)) return;
    await DYD.api.updateSelfReport("dyd-001", user.id, v);
    t.push("Progress updated. Hype Ranking refreshed.", "success");
    refresh();
  };
  const submit = async () => {
    if (!allChecked) return;
    await DYD.api.submitEvidence("dyd-001", user.id, draft);
    t.push("Evidence submitted. Now in the audit queue.", "success");
    refresh();
  };
  return (
    <div>
      <PageHead eyebrow="My dashboard" title={`Welcome back, ${user.name.split(" ")[0]}`} sub="Update your self-reported progress and submit evidence before the deadline."/>
      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="kpi-label">Hype rank</div>
          <div className="kpi-value">#{me.hypeRank}</div>
          <div className="kpi-delta">based on {me.selfReportedValue} self-reported testimonials</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Evidence status</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{me.evidenceStatus.replace(/_/g, " ")}</div>
          <div className="kpi-delta">submission deadline May 26, 2026</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Reward at stake</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>Buenos Aires</div>
          <div className="kpi-delta">+ dinner with leadership</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="eyebrow-mini">Self-report progress</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>How many testimonials have you collected? You can update this any time.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setValueEdit(String(Math.max(0, parseInt(valueEdit || "0", 10) - 1)))}><Icon name="minus" size={14}/></button>
            <input className="input" type="number" min="0" value={valueEdit} onChange={(e) => setValueEdit(e.target.value)} style={{ textAlign: "center", maxWidth: 100, fontSize: 22, fontWeight: 700 }}/>
            <button className="btn btn-ghost btn-sm" onClick={() => setValueEdit(String((parseInt(valueEdit || "0", 10) + 1)))}><Icon name="plus" size={14}/></button>
            <button className="btn btn-primary" onClick={updateProgress} style={{ marginLeft: "auto" }}>Update</button>
          </div>
        </div>
        <div className="card">
          <div className="eyebrow-mini">Quality checklist</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>The audit assistant scores every submission on this rubric. Hit all of these and you're in good shape.</p>
          <div className="checklist" style={{ marginTop: 16 }}>
            {checklist.map((c, i) => (
              <div key={i} className={`checklist-item ${c.on ? "done" : ""}`}>
                <span className={`checklist-tick ${c.on ? "on" : ""}`}>{c.on && <Icon name="check" size={12}/>}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="eyebrow-mini">Submit evidence</div>
        <div className="grid-2" style={{ marginTop: 18, gap: 16 }}>
          <div>
            <div className="label">Client name</div>
            <input className="input" value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} placeholder="e.g. Marcus Lee"/>
          </div>
          <div>
            <div className="label">Client company</div>
            <input className="input" value={draft.clientCompany} onChange={(e) => setDraft({ ...draft, clientCompany: e.target.value })} placeholder="e.g. Wells Fargo"/>
          </div>
          <div>
            <div className="label">Client role</div>
            <input className="input" value={draft.clientRole} onChange={(e) => setDraft({ ...draft, clientRole: e.target.value })} placeholder="e.g. VP of Engineering"/>
          </div>
          <div>
            <div className="label">Permission to use</div>
            <label className="checkbox" style={{ paddingTop: 10 }}>
              <input type="checkbox" checked={draft.permissionToUse} onChange={(e) => setDraft({ ...draft, permissionToUse: e.target.checked })}/>
              <span style={{ fontSize: 13 }}>Client confirmed in writing</span>
            </label>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="label">Business impact summary</div>
          <textarea className="textarea" value={draft.businessImpactSummary} onChange={(e) => setDraft({ ...draft, businessImpactSummary: e.target.value })} placeholder="What outcome did the client achieve? Use a metric and a timeframe."/>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="label">Evidence files</div>
          <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
            <input type="file" multiple style={{ display: "none" }} onChange={(e) => onFiles(e.target.files)}/>
            <Icon name="upload" size={28}/>
            <div style={{ fontSize: 14, marginTop: 8 }}>Click to upload videos, zips, or text files</div>
            <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>Files are mocked locally — they don't leave your browser.</div>
          </label>
          {draft.files.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {draft.files.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--surface-0)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <Icon name={f.kind === "video" ? "video" : f.kind === "zip" ? "archive" : "fileText"} size={16}/>
                  <span style={{ fontSize: 13, flex: 1 }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{(f.sizeKb / 1024).toFixed(1)} MB</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDraft({ ...draft, files: draft.files.filter((x) => x.id !== f.id) })}><Icon name="x" size={12}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
          <button className="btn btn-primary" disabled={!allChecked} onClick={submit}>Submit evidence</button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Review (Bob vs Patrick split) ─────────────────────────────────
function AdminPage() {
  const [audits, setAudits] = u1S([]);
  const [parts, setParts] = u1S([]);
  const [tab, setTab] = u1S("compare");
  const t = useToast();
  const refresh = async () => {
    setAudits(await DYD.api.getAuditQueue());
    setParts(await DYD.api.getParticipants());
  };
  u1E(() => { refresh(); }, []);
  const findP = (id) => parts.find((p) => p.id === id);
  const findA = (id) => audits.find((a) => a.participantId === id);
  const bob = findP("p-bob"), patrick = findP("p-patrick");
  const aBob = findA("p-bob"), aPat = findA("p-patrick");

  const action = async (kind, pid) => {
    if (kind === "approve") await DYD.api.adminApprove(pid);
    if (kind === "reject")  await DYD.api.adminReject(pid, "Not enough evidence quality.");
    if (kind === "winner")  await DYD.api.adminDeclareWinner(pid);
    t.push(`Action: ${kind} on ${findP(pid)?.name}`, "success");
    refresh();
  };

  return (
    <div>
      <PageHead eyebrow="Admin review" title="Quality vs quantity" sub="AI-assisted review. Final decision requires admin approval."/>
      <div className="tab-bar">
        <button className={`tab ${tab === "compare" ? "active" : ""}`} onClick={() => setTab("compare")}>Bob vs Patrick</button>
        <button className={`tab ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>All submissions ({audits.length})</button>
      </div>
      {tab === "compare" && bob && patrick && aBob && aPat && (
        <>
          <div className="compare">
            <CompareSide p={bob} a={aBob} accent="orange" onAction={action}/>
            <div className="compare-divider"/>
            <CompareSide p={patrick} a={aPat} accent="green" onAction={action}/>
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, background: "rgba(246,97,53,0.06)", border: "1px solid rgba(246,97,53,0.20)", borderRadius: 12 }}>
            <div>
              <div className="eyebrow-mini">The takeaway</div>
              <div style={{ fontSize: 16, marginTop: 8, color: "var(--fg-1)" }}>
                Bob is leading the Hype Ranking with 18. Patrick has 9 — but his quality multiplier is <strong style={{ color: "var(--bd-green-300)" }}>1.15</strong> against Bob's <strong style={{ color: "var(--bd-red-300)" }}>0.55</strong>. Final score: <strong>{aPat.suggestedFinalScore}</strong> vs <strong>{aBob.suggestedFinalScore}</strong>.
              </div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => action("winner", "p-patrick")}>
              <Icon name="trophy" size={16}/> Declare Patrick the winner
            </button>
          </div>
        </>
      )}
      {tab === "queue" && (
        <div className="card" style={{ padding: 0 }}>
          {audits.map((a) => {
            const p = findP(a.participantId);
            if (!p) return null;
            return (
              <div key={a.participantId} style={{ display: "grid", gridTemplateColumns: "200px 1fr 100px 200px", gap: 20, alignItems: "center", padding: 16, borderBottom: "1px solid var(--border)" }}>
                <div className="rank-meta">
                  <Avatar initials={p.avatarInitials} size="md"/>
                  <div>
                    <div className="rank-meta-name">{p.name}</div>
                    <div className="rank-meta-role">{p.role}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--fg-2)" }}>
                  Declared {a.declaredMetric} · validated {a.validatedItems} · {a.flags.length} flag(s) · score {a.qualityScore}/100
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{a.suggestedFinalScore}</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {a.adminStatus === "pending" ? (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => action("approve", a.participantId)}>Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => action("reject", a.participantId)}>Reject</button>
                    </>
                  ) : (
                    <span className={`pill ${a.adminStatus === "approved" ? "pill-green" : a.adminStatus === "rejected" ? "pill-red" : "pill-blue"}`}>{a.adminStatus}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 24, fontSize: 12, color: "var(--fg-4)" }}>
        AI-assisted review. Final decision requires admin approval.
      </div>
    </div>
  );
}

function CompareSide({ p, a, accent, onAction }) {
  const accentColor = accent === "green" ? "var(--bd-green-300)" : "var(--bd-orange)";
  return (
    <div className="compare-side">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Avatar initials={p.avatarInitials} size="lg"/>
        <div>
          <h3>{p.name}</h3>
          <div className="role">{p.role}</div>
        </div>
        <span className={`pill ${accent === "green" ? "pill-green" : "pill-orange"}`} style={{ marginLeft: "auto" }}>
          Hype #{p.hypeRank}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
        <Stat label="Declared" value={a.declaredMetric}/>
        <Stat label="Validated" value={a.validatedItems}/>
        <Stat label="Quality" value={`${a.qualityScore}`} suffix="/100"/>
      </div>
      <div className="score-stack">
        {(a.rubricBreakdown || []).map((r) => (
          <div className="score-row" key={r.key}>
            <span className="lbl">{r.label}</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.score / r.max) * 100}%`, background: accentColor }}/></div>
            <span className="val">{r.score}/{r.max}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        {a.flags.length === 0
          ? <div className="flag-clean"><Icon name="check" size={14}/> No flags. Audit clean.</div>
          : (
            <div className="flag-list">
              {a.flags.map((f, i) => <div key={i} className="flag-item"><Icon name="alertTriangle" size={14}/>{f}</div>)}
            </div>
          )}
      </div>
      <div style={{ marginTop: 18, padding: 14, background: "var(--surface-0)", borderRadius: 10, border: "1px solid var(--border)" }}>
        <div className="eyebrow-mini">Suggested final score</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", color: accentColor }}>{a.suggestedFinalScore}</span>
          <span className="muted" style={{ fontSize: 13 }}>{a.recommendation}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>{a.validatedItems} × {a.qualityMultiplier}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
        <button className="btn btn-success btn-sm" onClick={() => onAction("approve", p.id)}>
          <Icon name="check" size={14}/> Approve
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onAction("reject", p.id)}>
          <Icon name="x" size={14}/> Reject
        </button>
        <button className="btn btn-ghost btn-sm">Override score</button>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }) {
  return (
    <div style={{ background: "var(--surface-0)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--fg-4)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
        {value}{suffix && <span style={{ fontSize: 12, color: "var(--fg-4)", marginLeft: 2 }}>{suffix}</span>}
      </div>
    </div>
  );
}

Object.assign(window, { DashboardPage, AdminPage, CompareSide, Stat });
