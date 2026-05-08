// DYD Bot narrative card — used to highlight scene-transition copy
// (e.g. "The board is quiet… for now."). Styled to feel like a broadcast,
// not a regular feed post.

import { Avatar } from "./Avatar";

export interface BotMessageCardProps {
  message: string;
  speaker?: string;
  size?: "sm" | "md";
}

export function BotMessageCard({ message, speaker = "The Daremaster", size = "md" }: BotMessageCardProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: size === "sm" ? "14px 16px" : "18px 20px",
        marginBottom: 16,
        background: "linear-gradient(180deg, rgba(246,97,53,0.10), rgba(246,97,53,0.02))",
        border: "1px solid rgba(246,97,53,0.30)",
        borderRadius: 14,
        alignItems: "flex-start",
      }}
    >
      <Avatar bot size={size === "sm" ? "md" : "lg"} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--bd-orange)",
            marginBottom: 6,
          }}
        >
          DYD Bot · {speaker}
        </div>
        <div
          style={{
            fontSize: size === "sm" ? 14 : 15,
            color: "var(--fg-1)",
            lineHeight: 1.55,
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
