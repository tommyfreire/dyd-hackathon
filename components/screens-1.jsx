/* DYD prototype — Page screens */
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

// ─── Challenge landing ────────────────────────────────────────────────────
function ChallengePage({ user, onNav }) {
  const [c, setC] = uS(null);
  const [showRegister, setShowRegister] = uS(false);
  const [registered, setRegistered] = uS(false);
  uE(() => { DYD.api.getChallenge().then(setC); }, []);
  uE(() => {
    DYD.api.getParticipants().then((ps) => {
      const me = ps.find((p) => p.userId === user.id);
      setRegistered(!!(me && me.registered));
    });
  }, [user.id]);
  if (!c) return null;
  return (
    <div>
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">{c.number} · The Dare is open</div>
          <h1 className="hero-title">DO YOU<br/>DARE<span className="period">.</span></h1>
          <p className="hero-subtitle">{c.subtitle}</p>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <span className="hero-meta-label">Reward</span>
              <span className="hero-meta-value">Trip to Buenos Aires</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-label">Register by</span>
              <span className="hero-meta-value">{fmtDate(c.registrationDeadline)}</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-label">Submit by</span>
              <span className="hero-meta-value">{fmtDate(c.submissionDeadline)}</span>
            </div>
          </div>
          <div className="hero-cta-row">
            {registered ? (
              <>
                <span className="pill pill-green">✓ You're in</span>
                <button className="btn btn-ghost btn-lg" onClick={() => onNav("dashboard")}>Open my dashboard</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary btn-cta-big" onClick={() => setShowRegister(true)}>I Dare</button>
                <button className="btn btn-ghost btn-lg" onClick={() => onNav("ranking")}>See the leaderboard</button>
              </>
            )}
          </div>
        </div>
        <div>
          <div className="video-panel">
            <button className="video-play" aria-label="Play"><Icon name="play" size={32}/></button>
            <div className="video-caption">
              <Avatar bot size="md"/>
              <div>
                <div className="video-caption-name">The Daremaster</div>
                <div className="video-caption-sub">2:14 · DYD Bot launch announcement</div>
              </div>
            </div>
          </div>
          <div className="reward-card">
            <div className="reward-label">The reward</div>
            <h3 className="reward-title">Trip to Buenos Aires<span style={{ color: "var(--bd-orange)" }}>.</span></h3>
            <div className="reward-sub">+ dinner with leadership for the participant whose evidence holds up under audit.</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <div className="card">
            <div className="eyebrow-mini">The rules</div>
            <ol style={{ paddingLeft: 18, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
              {c.rules.map((r, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--fg-2)" }}>{r}</li>)}
            </ol>
          </div>
          <div className="card">
            <div className="eyebrow-mini">Evidence required</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {c.evidenceRequirements.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--fg-2)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--bd-orange)" }}/>
                  {e}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: "rgba(246,97,53,0.06)", border: "1px solid rgba(246,97,53,0.20)", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--bd-orange)" }}>Quality over quantity.</strong>{" "}
              The Hype Ranking is based on what you self-report. The final winner is decided after a human admin reviews every piece of evidence — assisted by an AI Audit Assistant scoring each one on the rubric.
            </div>
          </div>
        </div>
      </section>

      <Disclaimer>{c.hypeRankingDisclaimer}</Disclaimer>

      <RegisterModal open={showRegister} onClose={() => setShowRegister(false)} challenge={c}
        onConfirm={async () => {
          await DYD.api.register(c.id, user.id);
          setRegistered(true);
          setShowRegister(false);
        }}/>
    </div>
  );
}

// ─── Registration modal ──────────────────────────────────────────────────
function RegisterModal({ open, onClose, challenge, onConfirm }) {
  const [acked, setAcked] = uS(false);
  const t = useToast();
  uE(() => { if (open) setAcked(false); }, [open]);
  if (!challenge) return null;
  return (
    <Modal open={open} onClose={onClose} width={620}>
      <div className="modal-header">
        <div className="eyebrow-mini">Accept the dare</div>
        <h2 style={{ fontSize: 28, margin: "12px 0 6px", letterSpacing: "-0.02em" }}>Join {challenge.number}</h2>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>{challenge.title} — {challenge.rewardSubtitle ? challenge.reward + " " + challenge.rewardSubtitle : challenge.reward}.</p>
      </div>
      <div className="modal-body">
        <div className="card-flat" style={{ marginBottom: 14 }}>
          <div className="eyebrow-mini">Your commitment</div>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
            <li>Register before <strong>{fmtDate(challenge.registrationDeadline)}</strong>.</li>
            <li>Self-report progress at any time. The Hype Ranking updates live.</li>
            <li>Submit evidence before <strong>{fmtDate(challenge.submissionDeadline)}</strong>.</li>
            <li>Final results are decided by human admins after AI-assisted review.</li>
          </ul>
        </div>
        <div style={{ background: "rgba(221,54,54,0.06)", border: "1px solid rgba(221,54,54,0.20)", borderRadius: 12, padding: 16 }}>
          <div className="eyebrow-mini" style={{ color: "var(--bd-red-300)" }}><span/>The DYD Strike</div>
          <p style={{ fontSize: 13, color: "var(--bd-red-300)", lineHeight: 1.5, margin: "10px 0 0" }}>
            By joining this DYD, you commit to participating before the final deadline. If you submit no valid evidence, admins may issue a DYD Strike that can affect future challenge eligibility.
          </p>
        </div>
        <label className="checkbox" style={{ marginTop: 18 }}>
          <input type="checkbox" checked={acked} onChange={(e) => setAcked(e.target.checked)}/>
          <span style={{ fontSize: 13, color: "var(--fg-2)" }}>I understand the rules and accept the DYD Strike clause.</span>
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Not yet</button>
        <button className="btn btn-primary" disabled={!acked} onClick={async () => {
          await onConfirm();
          t.push("You're in. The Dare is on.", "success");
        }}>Accept & Join Challenge</button>
      </div>
    </Modal>
  );
}

// ─── Hype Ranking ────────────────────────────────────────────────────────
function RankingPage({ user, role }) {
  const [rows, setRows] = uS([]);
  uE(() => { DYD.api.getHypeRanking().then(setRows); }, []);
  return (
    <div>
      <PageHead eyebrow="Hype ranking" title="Live leaderboard" sub="Self-reported progress, side by side with the AI Audit score that — eventually — decides the winner."/>
      <Disclaimer>This ranking is based on self-reported progress. Final results may change after human review.</Disclaimer>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="rank-row" style={{ background: "rgba(255,255,255,0.02)", padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-4)", letterSpacing: 1.5, textTransform: "uppercase" }}>#</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-4)", letterSpacing: 1.5, textTransform: "uppercase" }}>Participant</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-4)", letterSpacing: 1.5, textTransform: "uppercase" }}>Hype (self-reported)</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-4)", letterSpacing: 1.5, textTransform: "uppercase" }}>Audit (AI score)</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-4)", letterSpacing: 1.5, textTransform: "uppercase", textAlign: "right" }}>Status</div>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="rank-row">
            <div className={`rank-num ${r.hypeRank === 1 ? "top1" : ""}`}>{r.hypeRank.toString().padStart(2, "0")}</div>
            <div className="rank-meta">
              <Avatar initials={r.avatarInitials} size="md"/>
              <div style={{ minWidth: 0 }}>
                <div className="rank-meta-name">{r.name} {r.userId === user.id && <span className="pill" style={{ marginLeft: 6, fontSize: 9 }}>YOU</span>}</div>
                <div className="rank-meta-role">{r.role}</div>
              </div>
            </div>
            <div className="meter-block">
              <div className="meter-row">
                <span>Hype</span>
                <span className="val">{r.selfReportedValue}</span>
              </div>
              <div className="bar-track"><div className="bar-fill bar-fill-orange" style={{ width: `${r.hypeProgress}%` }}/></div>
            </div>
            <div className="meter-block">
              <div className="meter-row">
                <span>Audit</span>
                <span className="val">{r.auditScore != null ? `${r.auditScore} / 100` : "—"}</span>
              </div>
              <div className="bar-track">
                {r.auditScore != null
                  ? <div className={`bar-fill ${r.auditScore >= 80 ? "bar-fill-green" : r.auditScore >= 60 ? "bar-fill-blue" : "bar-fill-red"}`} style={{ width: `${r.auditScore}%` }}/>
                  : <div className="bar-fill" style={{ width: "100%", background: "rgba(255,255,255,0.04)" }}/>}
              </div>
            </div>
            <div className="rank-actions">
              {r.badges.slice(0, 1).map((b, i) => <span key={i} className={`pill ${b === "On fire" ? "pill-orange" : b === "Quality threat" ? "pill-green" : b === "Dark horse" ? "pill-blue" : b === "Needs evidence" ? "pill-yellow" : ""}`}>{b}</span>)}
              {r.movement === "up" && <span className="pill pill-green"><Icon name="arrowUp" size={11}/>up</span>}
              {r.movement === "down" && <span className="pill pill-red"><Icon name="arrowDown" size={11}/>down</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 24, fontSize: 12, color: "var(--fg-3)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 24, height: 6, borderRadius: 999, background: "var(--bd-orange)" }}/> Hype = self-reported metric / leader's self-reported metric</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 24, height: 6, borderRadius: 999, background: "var(--bd-green-500)" }}/> Audit ≥ 80</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 24, height: 6, borderRadius: 999, background: "var(--bd-blue-glow)" }}/> 60–79</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 24, height: 6, borderRadius: 999, background: "var(--bd-red-500)" }}/> &lt; 60</div>
      </div>
    </div>
  );
}

// ─── Feed ─────────────────────────────────────────────────────────────────
const REACTIONS = [
  { kind: "fire", icon: "🔥" },
  { kind: "clap", icon: "👏" },
  { kind: "rocket", icon: "🚀" },
  { kind: "eyes", icon: "👀" },
  { kind: "trophy", icon: "🏆" },
];

function FeedPage({ user }) {
  const [posts, setPosts] = uS([]);
  const [draft, setDraft] = uS("");
  const [ranking, setRanking] = uS([]);
  uE(() => { DYD.api.getFeed().then((r) => setPosts(r.posts)); DYD.api.getHypeRanking().then(setRanking); }, []);
  const submit = async () => {
    if (!draft.trim()) return;
    await DYD.api.postFeedComment("dyd-001", draft.trim());
    setDraft("");
    DYD.api.getFeed().then((r) => setPosts(r.posts));
  };
  const onReact = async (id, kind) => {
    await DYD.api.react(id, kind);
    DYD.api.getFeed().then((r) => setPosts(r.posts));
  };
  return (
    <div>
      <PageHead eyebrow="Social feed" title="The Dare, live" sub="Hype Bot, participants, admins, and spectators — all the chatter around DYD #001."/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
        <div>
          <div className="composer">
            <Avatar initials={user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")} size="md"/>
            <textarea placeholder={`What's on your mind, ${user.name.split(" ")[0]}?`} value={draft} onChange={(e) => setDraft(e.target.value)}/>
            <div className="composer-actions">
              <button className="btn btn-primary btn-sm" onClick={submit} disabled={!draft.trim()}>
                <Icon name="send" size={14}/> Post
              </button>
            </div>
          </div>
          <div className="feed-list">
            {posts.map((p) => (
              <div key={p.id} className={`feed-card ${p.pinned ? "pinned" : ""}`}>
                <div className="feed-head">
                  <Avatar initials={p.authorType === "bot" ? null : (p.author.split(" ").map((n) => n[0]).slice(0, 2).join(""))} size="md" bot={p.authorType === "bot"}/>
                  <div style={{ flex: 1 }}>
                    <div className="feed-author">
                      {p.author}
                      {p.authorType === "bot" && <span className="pill pill-orange" style={{ marginLeft: 8, fontSize: 9 }}>BOT</span>}
                      {p.authorType === "admin" && <span className="pill pill-blue" style={{ marginLeft: 8, fontSize: 9 }}>ADMIN</span>}
                      {p.pinned && <span className="pill" style={{ marginLeft: 8, fontSize: 9 }}>PINNED</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-4)" }}>{p.authorRole || ""} · {ago(p.createdAt)}</div>
                  </div>
                </div>
                <div className="feed-content">{p.content}</div>
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
              {ranking.slice(0, 5).map((r) => (
                <div key={r.id} className="mini-rank-row">
                  <span className="mini-rank-num">{r.hypeRank}</span>
                  <div>
                    <div className="mini-rank-name">{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{r.selfReportedValue} testimonials</div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--fg-4)", fontVariantNumeric: "tabular-nums" }}>
                    {r.auditScore != null ? `${r.auditScore}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ChallengePage, RegisterModal, RankingPage, FeedPage, REACTIONS });
