"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { fmtDate } from "@/lib/format";
import type { Challenge } from "@/lib/types";

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  onConfirm: () => Promise<void>;
}

type Step = "rules" | "success";

export function RegisterModal({ open, onClose, challenge, onConfirm }: RegisterModalProps) {
  const [acked, setAcked] = useState(false);
  const [step, setStep] = useState<Step>("rules");
  const t = useToast();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setAcked(false);
      setStep("rules");
    }
  }, [open]);

  if (!challenge) return null;

  const accept = async () => {
    await onConfirm();
    setStep("success");
    t.push("You're in. The Dare is on.", "success");
  };

  return (
    <Modal open={open} onClose={onClose} width={620}>
      {step === "rules" ? (
        <>
          <div className="modal-header">
            <div className="eyebrow-mini">Accept the dare</div>
            <h2 style={{ fontSize: 28, margin: "12px 0 6px", letterSpacing: "-0.02em" }}>
              Join {challenge.number}
            </h2>
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>
              {challenge.title} — {challenge.rewardSubtitle ? `${challenge.reward} ${challenge.rewardSubtitle}` : challenge.reward}.
            </p>
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
              <div className="eyebrow-mini" style={{ color: "var(--bd-red-300)" }}>The DYD Strike</div>
              <p style={{ fontSize: 13, color: "var(--bd-red-300)", lineHeight: 1.5, margin: "10px 0 0" }}>
                By joining this DYD, you commit to participating before the final deadline. If you submit no valid evidence, admins may issue a DYD Strike that can affect future challenge eligibility.
              </p>
            </div>
            <label className="checkbox" style={{ marginTop: 18 }}>
              <input type="checkbox" checked={acked} onChange={(e) => setAcked(e.target.checked)} />
              <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
                I understand the rules and accept the DYD Strike clause.
              </span>
            </label>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Not yet</button>
            <button className="btn btn-primary" disabled={!acked} onClick={accept}>
              Accept &amp; Join Challenge
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar bot size="lg" />
              <div>
                <div className="eyebrow-mini">DYD Bot · The Daremaster</div>
                <h2 style={{ fontSize: 26, margin: "6px 0 0", letterSpacing: "-0.02em" }}>
                  You're in<span style={{ color: "var(--bd-orange)" }}>.</span>
                </h2>
              </div>
            </div>
          </div>
          <div className="modal-body">
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--fg-1)", margin: 0 }}>
              The Hype Ranking is now live. It's based on self-reported progress,
              so play bold — but remember: <strong>final results belong to the evidence</strong>.
            </p>
            <div
              style={{
                marginTop: 18,
                padding: 14,
                background: "rgba(246,97,53,0.06)",
                border: "1px solid rgba(246,97,53,0.20)",
                borderRadius: 12,
                fontSize: 13,
                color: "var(--fg-2)",
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: "var(--bd-orange)" }}>What's next:</strong>{" "}
              Open your dashboard to log your first testimonial, then watch your
              position move on the leaderboard.
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Stay here</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                router.push("/ranking");
              }}
            >
              <Icon name="trophy" size={14} /> Go to Hype Ranking
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
