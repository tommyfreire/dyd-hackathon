// Inline SVG icon set — lucide-style. Lifted from prototype-components/shell.jsx.
// Kept as inline SVGs (not imports from lucide-react) because the original
// prototype's CSS targets these specific shapes.

type IconName =
  | "flame" | "trophy" | "users" | "messageSquare" | "user" | "shield"
  | "sparkles" | "barChart" | "bell" | "play" | "check" | "x" | "chevronDown"
  | "arrowUp" | "arrowDown" | "minus" | "plus" | "alertTriangle" | "settings"
  | "upload" | "send" | "calendar" | "clock" | "reset" | "fileText" | "video"
  | "archive";

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className = "" }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
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

export const ROLE_ICONS: Record<string, IconName> = {
  participant: "user",
  admin: "shield",
  sponsor: "trophy",
  spectator: "users",
};
