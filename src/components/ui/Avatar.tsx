import { Icon } from "./Icon";

export interface AvatarProps {
  initials?: string | null;
  size?: "sm" | "md" | "lg";
  bot?: boolean;
}

export function Avatar({ initials, size = "md", bot = false }: AvatarProps) {
  const cls = `avatar avatar-${size} ${bot ? "avatar-bot" : ""}`;
  return (
    <div className={cls}>
      {bot ? <Icon name="sparkles" size={size === "lg" ? 22 : 16} /> : initials}
    </div>
  );
}
