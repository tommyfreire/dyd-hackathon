interface PageHeadProps {
  eyebrow?: string;
  title: string;
  sub?: string;
}

export function PageHead({ eyebrow, title, sub }: PageHeadProps) {
  return (
    <div className="page-head">
      {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
      <h1 className="page-title">{title}</h1>
      {sub && <div className="page-sub">{sub}</div>}
    </div>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <div className="disclaimer">
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.7 18-9-15.5a2 2 0 0 0-3.4 0l-9 15.5A2 2 0 0 0 2 21h18a2 2 0 0 0 1.7-3z"/>
          <path d="M12 9v4"/>
          <path d="M12 17h.01"/>
        </svg>
      </span>
      <span>{children}</span>
    </div>
  );
}
