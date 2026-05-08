"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { PageHead } from "@/components/shell/PageHead";
import { useRole } from "@/lib/role-context";
import {
  getMySubmission,
  getParticipants,
  submitEvidence,
} from "@/lib/api";
import type { EvidenceFile, EvidenceSubmission, Participant } from "@/lib/types";

interface DraftState {
  clientName: string;
  clientCompany: string;
  clientRole: string;
  permissionToUse: boolean;
  businessImpactSummary: string;
  files: EvidenceFile[];
}

const EMPTY_DRAFT: DraftState = {
  clientName: "",
  clientCompany: "",
  clientRole: "",
  permissionToUse: false,
  businessImpactSummary: "",
  files: [],
};

export function DashboardPage() {
  const { user, role } = useRole();
  const router = useRouter();
  const t = useToast();
  const [me, setMe] = useState<Participant | null>(null);
  const [, setSubmission] = useState<EvidenceSubmission | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);

  const refresh = useCallback(async () => {
    if (!user) return;
    const ps = await getParticipants("dyd-001");
    const m = ps.find((p) => p.userId === user.id) ?? null;
    setMe(m);
    const ev = await getMySubmission("dyd-001", user.id);
    setSubmission(ev);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (role !== "participant") {
    return (
      <div>
        <PageHead
          eyebrow="My dashboard"
          title="Switch to Participant"
          sub="Use the role switcher in the top bar to view the participant dashboard."
        />
      </div>
    );
  }

  if (!user) return null;

  if (!me) {
    return (
      <div>
        <PageHead
          eyebrow="My dashboard"
          title="You haven't joined yet"
          sub="Accept the Dare from the Challenge page to unlock the participant dashboard."
        />
        <button className="btn btn-primary btn-lg" onClick={() => router.push("/")}>
          Go to Challenge
        </button>
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

  const onFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next: EvidenceFile[] = Array.from(fileList).map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      sizeKb: Math.round(f.size / 1024),
      kind:
        f.type.startsWith("video") ? "video" :
        f.name.endsWith(".zip") ? "zip" :
        f.type.startsWith("image") ? "image" : "other",
      uploadedAt: new Date().toISOString(),
    }));
    setDraft((d) => ({ ...d, files: [...d.files, ...next] }));
  };

  const submit = async () => {
    if (!allChecked) return;
    await submitEvidence("dyd-001", user.id, draft);
    t.push("Testimonial submitted. Add another any time before the deadline.", "success");
    setDraft(EMPTY_DRAFT);
    refresh();
  };

  return (
    <div>
      <PageHead
        eyebrow="My dashboard"
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        sub="Submit testimonials one at a time. You can keep adding more before the deadline."
      />
      <div className="grid-2" style={{ marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="kpi-label">Hype rank</div>
          <div className="kpi-value">#{me.hypeRank}</div>
          <div className="kpi-delta">live position on the public leaderboard</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Testimonials</div>
          <div className="kpi-value">{me.selfReportedValue}</div>
          <div className="kpi-delta">submission deadline Jun 29, 2026</div>
        </div>
      </div>

      <div className="card">
        <div className="eyebrow-mini">Quality checklist for this testimonial</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          The audit assistant scores each testimonial on this rubric. Hit all of these and you're in good shape.
        </p>
        <div className="checklist" style={{ marginTop: 16 }}>
          {checklist.map((c, i) => (
            <div key={i} className={`checklist-item ${c.on ? "done" : ""}`}>
              <span className={`checklist-tick ${c.on ? "on" : ""}`}>
                {c.on && <Icon name="check" size={12} />}
              </span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="eyebrow-mini">Add a testimonial</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          Upload one testimonial at a time. Once you submit, the form clears so you can add the next one.
        </p>
        <div className="grid-2" style={{ marginTop: 18, gap: 16 }}>
          <div>
            <div className="label">Client name</div>
            <input
              className="input"
              value={draft.clientName}
              onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
              placeholder="e.g. Marcus Lee"
            />
          </div>
          <div>
            <div className="label">Client company</div>
            <input
              className="input"
              value={draft.clientCompany}
              onChange={(e) => setDraft({ ...draft, clientCompany: e.target.value })}
              placeholder="e.g. Wells Fargo"
            />
          </div>
          <div>
            <div className="label">Client role</div>
            <input
              className="input"
              value={draft.clientRole}
              onChange={(e) => setDraft({ ...draft, clientRole: e.target.value })}
              placeholder="e.g. VP of Engineering"
            />
          </div>
          <div>
            <div className="label">Permission to use</div>
            <label className="checkbox" style={{ paddingTop: 10 }}>
              <input
                type="checkbox"
                checked={draft.permissionToUse}
                onChange={(e) => setDraft({ ...draft, permissionToUse: e.target.checked })}
              />
              <span style={{ fontSize: 13 }}>Client confirmed in writing</span>
            </label>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="label">Business impact summary for this testimonial</div>
          <textarea
            className="textarea"
            value={draft.businessImpactSummary}
            onChange={(e) => setDraft({ ...draft, businessImpactSummary: e.target.value })}
            placeholder="What outcome did this client achieve? Use a metric and a timeframe."
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="label">Evidence file for this testimonial</div>
          <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
            <input
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => onFiles(e.target.files)}
            />
            <Icon name="upload" size={28} />
            <div style={{ fontSize: 14, marginTop: 8 }}>Click to upload one video, zip, or text file</div>
            <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 4 }}>
              Files stay in your browser — nothing is uploaded to the cloud.
            </div>
          </label>
          {draft.files.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {draft.files.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 10,
                    background: "var(--surface-0)",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                >
                  <Icon name={f.kind === "video" ? "video" : f.kind === "zip" ? "archive" : "fileText"} size={16} />
                  <span style={{ fontSize: 13, flex: 1 }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
                    {(f.sizeKb / 1024).toFixed(1)} MB
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDraft({ ...draft, files: draft.files.filter((x) => x.id !== f.id) })}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
          <button className="btn btn-primary" disabled={!allChecked} onClick={submit}>
            Submit this testimonial
          </button>
        </div>
      </div>
    </div>
  );
}
