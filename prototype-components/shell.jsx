/* DYD prototype — shared UI helpers (Topbar, Sidebar, Modal, Toasts, etc.) */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ─── tiny inline icon set (lucide-like, drawn as SVG) ───────────────────────
function Icon({ name, size = 18, className = "" }) {
  const stroke = "currentColor";
  const sw = 1.6;
  const props = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round",
    className,
  };
  switch (name) {
    case "flame": return <svg {...props}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c0-2 1-3 2-4s2 0 2 2-1 4-1 6a4 4 0 1 1-8 0c0-3 2-5 2-8 0-2 1-4 2.5-5C12 9 11 12 8.5 14.5Z"/></svg>;
    case "trophy": return <svg {...props}><path d="M6 9h12"/><path d="M6 9V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4"/><path d="M6 9a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4"/><path d="M3 5h3"/><path d="M18 5h3"/><path d="M10 17h4"/><path d="M12 13v4"/><path d="M9 21h6"/></svg>;
    case "users": return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "messageSquare": return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case "user": return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "shield": return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "sparkles": return <svg {...props}><path d="m12 3 1.9 4.5L18 9.4l-4.1 1.9L12 16l-1.9-4.7L6 9.4l4.1-1.9L12 3Z"/><path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>;
    case "barChart": return <svg {...props}><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7"/><rect x="13" y="6" width="3" height="12"/><rect x="19" y="14" width="0.1" height="4"/></svg>;
    case "bell": return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "play": return <svg {...props} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>;
    case "check": return <svg {...props}><path d="M20 6 9 17l-5-5"/></svg>;
    case "x": return <svg {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
    case "chevronDown": return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "arrowUp": return <svg {...props}><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>;
    case "arrowDown": return <svg {...props}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>;
    case "minus": return <svg {...props}><path d="M5 12h14"/></svg>;
    case "plus": return <svg {...props}><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
    case "alertTriangle": return <svg {...props}><path d="m21.7 18-9-15.5a2 2 0 0 0-3.4 0l-9 15.5A2 2 0 0 0 2 21h18a2 2 0 0 0 1.7-3z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
    case "settings": return <svg {...props}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "upload": return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><path d="M12 3v12"/></svg>;
    case "send": return <svg {...props}><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>;
    case "calendar": return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>;
    case "clock": return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "reset": return <svg {...props}><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 4v5h5"/></svg>;
    case "fileText": return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case "video": return <svg {...props}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
    case "archive": return <svg {...props}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
    default: return null;
  }
}

const ROLE_ICONS = {
  participant: "user", admin: "shield", sponsor: "trophy", spectator: "users",
};

// ─── Utility: ago ─────────────────────────────────────────────────────────
function ago(iso) {
  const d = new Date(iso);
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

// Date formatting (deterministic — won't drift)
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Toast system ─────────────────────────────────────────────────────────
const ToastCtx = React.createContext({ push: () => {} });
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

// ─── Modal ────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, width }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={width ? { width } : null} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="logo-wrap">
      <svg className="logo-symbol" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#F66135"/>
        <path d="M7 7h6a5 5 0 0 1 0 10H7V7z" fill="#fff"/>
      </svg>
      <div className="logo-text">DYD<span className="logo-period">.</span></div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────
function Sidebar({ route, onNav, role }) {
  const items = [
    { key: "challenge", label: "Challenge", icon: "flame" },
    { key: "ranking", label: "Hype Ranking", icon: "trophy" },
    { key: "feed", label: "Feed", icon: "messageSquare" },
  ];
  if (role === "participant") items.push({ key: "dashboard", label: "My Dashboard", icon: "user" });
  if (role === "admin") items.push({ key: "admin", label: "Admin Review", icon: "shield", pill: "AI" });
  items.push({ key: "agents", label: "AI Agents", icon: "sparkles" });
  items.push({ key: "insights", label: "Growth Insights", icon: "barChart" });
  return (
    <aside className="app-sidebar">
      <Logo/>
      <div className="nav-section">DYD #001</div>
      {items.map((it) => (
        <button key={it.key} className={`nav-link ${route === it.key ? "active" : ""}`} onClick={() => onNav(it.key)}>
          <Icon name={it.icon} className="nav-icon"/>
          <span>{it.label}</span>
          {it.pill && <span className="nav-pill">{it.pill}</span>}
        </button>
      ))}
      <div style={{ marginTop: "auto", padding: "16px 14px 0", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--fg-4)", lineHeight: 1.5 }}>
        Internal hackathon prototype. Mock data. {""}
        <button onClick={() => { DYD.api.resetState(); location.reload(); }} style={{ background: "transparent", border: "none", color: "var(--bd-orange)", padding: 0, cursor: "pointer", fontSize: 11 }}>Reset demo state</button>
      </div>
    </aside>
  );
}

// ─── Notification bell ────────────────────────────────────────────────────
function NotificationBell({ onNav }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  useEffect(() => { DYD.api.getNotifications().then(setNotifs); }, []);
  const unread = notifs.filter((n) => n.unread).length;
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="tb-icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Icon name="bell"/>
        {unread > 0 && <span className="dot"/>}
      </button>
      {open && (
        <div className="notif-panel">
          <div style={{ padding: "8px 12px 4px", fontSize: 11, color: "var(--fg-4)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>Notifications</div>
          {notifs.map((n) => (
            <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`}
                 onClick={() => { onNav(n.href === "/" ? "challenge" : n.href.slice(1)); setOpen(false); }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 6 }}>{n.body}</div>
              <div style={{ fontSize: 11, color: "var(--bd-orange)", fontWeight: 600 }}>{n.cta} →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Role switcher ────────────────────────────────────────────────────────
function RoleSwitcher({ role, onChange }) {
  return (
    <label className="role-switcher" title="Dev role switcher (mock auth)">
      <Icon name={ROLE_ICONS[role] || "user"} size={14}/>
      <select value={role} onChange={(e) => onChange(e.target.value)}>
        <option value="participant">Participant</option>
        <option value="admin">Admin</option>
        <option value="sponsor">Sponsor</option>
        <option value="spectator">Spectator</option>
      </select>
      <Icon name="chevronDown" size={14}/>
    </label>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────
function TopBar({ role, onRoleChange, onNav }) {
  return (
    <header className="app-header">
      <div className="tb-left">
        <span className="tb-challenge-pill"><span className="tb-status-dot"/>DYD #001 · Open</span>
        <span className="muted-2" style={{ fontSize: 12 }}>·</span>
        <span className="muted" style={{ fontSize: 13 }}>The Testimonial Hunt</span>
      </div>
      <div className="tb-right">
        <RoleSwitcher role={role} onChange={onRoleChange}/>
        <NotificationBell onNav={onNav}/>
        <button className="tb-icon-btn" aria-label="Settings"><Icon name="settings"/></button>
      </div>
    </header>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────
function PageHead({ eyebrow, title, sub }) {
  return (
    <div className="page-head">
      {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
      <h1 className="page-title">{title}</h1>
      {sub && <div className="page-sub">{sub}</div>}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ initials, size = "md", bot }) {
  const cls = `avatar avatar-${size} ${bot ? "avatar-bot" : ""}`;
  return <div className={cls}>{bot ? <Icon name="sparkles" size={size === "lg" ? 22 : 16}/> : initials}</div>;
}

// ─── Disclaimer banner ────────────────────────────────────────────────────
function Disclaimer({ children }) {
  return (
    <div className="disclaimer">
      <Icon name="alertTriangle" size={16}/>
      <span>{children}</span>
    </div>
  );
}

// expose
Object.assign(window, {
  Icon, ROLE_ICONS, ago, fmtDate, ToastProvider, useToast, Modal,
  Logo, Sidebar, NotificationBell, RoleSwitcher, TopBar, PageHead, Avatar, Disclaimer,
});
