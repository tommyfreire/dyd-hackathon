"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Disclaimer } from "@/components/shell/PageHead";
import { useRole } from "@/lib/role-context";
import { useStage } from "@/lib/stage-context";
import { fmtDate } from "@/lib/format";
import { getAdminReviewOpened, getChallenge, getParticipants, register } from "@/lib/api";
import type { Challenge } from "@/lib/types";
import { RegisterModal } from "./RegisterModal";

export function ChallengePage() {
  const { user, role } = useRole();
  const { stage } = useStage();
  const router = useRouter();
  const [c, setC] = useState<Challenge | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [holdEnd, setHoldEnd] = useState(false);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    getChallenge().then(setC);
  }, []);

  useEffect(() => {
    if (!user) return;
    getParticipants("dyd-001").then((ps) => {
      const me = ps.find((p) => p.userId === user.id);
      setRegistered(!!(me && me.registered));
    });
  }, [user]);

  // Big call-to-action: admin lands here at completed and the winner hasn't
  // been declared yet → invite them straight into Admin Review.
  useEffect(() => {
    if (role !== "admin" || stage !== "completed" || !c) return;
    if (!c.winnerId && !getAdminReviewOpened()) setShowFinalReview(true);
  }, [role, stage, c]);

  if (!c || !user) return null;
  const isAdmin = role === "admin";

  return (
    <div>
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">{c.number} · The Dare is open</div>
          <h1 className="hero-title">DO YOU<br />DARE<span className="period">.</span></h1>
          <p className="hero-subtitle">{c.subtitle}</p>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <span className="hero-meta-label">Reward</span>
              <span className="hero-meta-value">Trip for 2 to Bahamas</span>
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
            {isAdmin ? (
              <>
                <span className="pill pill-blue">Admin view</span>
                <button className="btn btn-ghost btn-lg" onClick={() => router.push("/admin")}>
                  Open Admin Review
                </button>
              </>
            ) : registered ? (
              <>
                <span className="pill pill-green">✓ You're in</span>
                <button className="btn btn-ghost btn-lg" onClick={() => router.push("/dashboard")}>
                  Open my dashboard
                </button>
              </>
            ) : (
              <button className="btn btn-primary btn-cta-big" onClick={() => setShowRegister(true)}>
                I Dare
              </button>
            )}
          </div>
          {!isAdmin && !registered && (
            <div className="hero-hint">
              <Icon name="arrowDown" size={22} />
              <span>Scroll down for the full challenge specifications.</span>
            </div>
          )}
        </div>
        <div>
          <div className={`video-panel${playing || holdEnd ? " video-panel-playing" : ""}`}>
            <video
              ref={videoRef}
              className="video-media"
              src="/testimonialHunt.mp4"
              playsInline
              controls={playing && !holdEnd}
              onPlay={() => {
                setHoldEnd(false);
                setPlaying(true);
              }}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                // Hold the closing "DO YOU DARE?" frame for a beat, then snap
                // back to the opening so the avatar overlay sits on the first
                // frame instead of the closing one.
                setHoldEnd(true);
                setPlaying(false);
                setTimeout(() => {
                  const v = videoRef.current;
                  if (v) v.currentTime = 0;
                  setHoldEnd(false);
                }, 3000);
              }}
            />
            {!playing && !holdEnd && (
              <>
                <button
                  className="video-play"
                  aria-label="Play"
                  onClick={() => {
                    videoRef.current?.play();
                  }}
                >
                  <Icon name="play" size={32} />
                </button>
                <div className="video-caption">
                  <Avatar bot size="md" />
                  <div>
                    <div className="video-caption-name">The Daremaster</div>
                    <div className="video-caption-sub">DYD Bot launch announcement</div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="reward-card">
            <div className="reward-label">The reward</div>
            <h3 className="reward-title">
              Trip for 2 to Bahamas<span style={{ color: "var(--bd-orange)" }}>.</span>
            </h3>
            <div className="reward-sub">
              + dinner with leadership for the participant whose evidence holds up under audit.
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card overview-card">
          <div className="eyebrow-mini">Challenge Overview</div>
          <h2 className="overview-title">
            The Testimonial Hunt is the first DYD challenge<span style={{ color: "var(--bd-orange)" }}>.</span>
          </h2>
          <p className="overview-lede">
            Your mission is to collect powerful client testimonials that show how BairesDev created real business impact.
          </p>

          <div className="overview-grid">
            <div className="overview-fact">
              <div className="overview-fact-label">What counts as a testimonial</div>
              <div className="overview-fact-body">
                A short video, written quote, or documented client story where a client explains how BairesDev helped their company scale, deliver faster, solve a technical challenge, or achieve a meaningful business result.
              </div>
            </div>
            <div className="overview-fact">
              <div className="overview-fact-label">Why this helps Marketing &amp; Growth</div>
              <div className="overview-fact-body">
                Testimonials feed social proof, case studies, campaign material, LinkedIn content, landing page copy, and sales enablement assets used by the Marketing and Growth teams.
              </div>
            </div>
            <div className="overview-fact">
              <div className="overview-fact-label">How the winner is decided</div>
              <div className="overview-fact-body">
                Not by raw count. The final result depends on both quantity and quality, judged after human admin review assisted by the AI Audit Assistant.
              </div>
            </div>
          </div>

          <div className="overview-reward">
            <div className="overview-reward-icon" aria-hidden>
              <Icon name="trophy" size={22} />
            </div>
            <div>
              <div className="overview-reward-label">The reward</div>
              <div className="overview-reward-value">A trip for two to the Bahamas.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <div className="card">
            <div className="eyebrow-mini">The rules</div>
            <ol style={{ paddingLeft: 18, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
              {c.rules.map((r, i) => (
                <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--fg-2)" }}>{r}</li>
              ))}
            </ol>
          </div>
          <div className="card">
            <div className="eyebrow-mini">Evidence required</div>
            <p className="evidence-intro">Each submitted testimonial should include the following information:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {c.evidenceRequirements.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--fg-2)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--bd-orange)", flexShrink: 0 }} />
                  {e}
                </div>
              ))}
            </div>
            <div className="evidence-note">
              The business impact summary should explain what changed because of BairesDev. For example: faster delivery, easier team scaling, reduced hiring bottlenecks, improved technical execution, or better project outcomes.
            </div>
            <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: "rgba(246,97,53,0.06)", border: "1px solid rgba(246,97,53,0.20)", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--bd-orange)" }}>Quality over quantity.</strong>{" "}
              The Hype Ranking is based on self-reported progress and is meant to create momentum. The final winner is decided after human admin review, assisted by the AI Audit Assistant. Strong, specific, approved testimonials can beat a larger number of weak or incomplete ones.
            </div>
          </div>
        </div>
      </section>

      <Disclaimer>{c.hypeRankingDisclaimer}</Disclaimer>

      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        challenge={c}
        onConfirm={async () => {
          await register(c.id, user.id);
          setRegistered(true);
          setShowRegister(false);
        }}
      />

      <Modal open={showFinalReview} onClose={() => setShowFinalReview(false)} width={520}>
        <div className="cta-modal">
          <div className="cta-modal-icon"><Icon name="trophy" size={28} /></div>
          <div className="eyebrow-mini">Final review ready</div>
          <h2 className="cta-modal-title">The challenge is closed.</h2>
          <p className="cta-modal-body">
            All evidence is in. The AI Audit Assistant has produced its findings — your call as admin decides the final board and the winner.
          </p>
          <div className="cta-modal-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                setShowFinalReview(false);
                router.push("/admin");
              }}
            >
              <Icon name="shield" size={16} /> Open Admin Review
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFinalReview(false)}>
              Later
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
