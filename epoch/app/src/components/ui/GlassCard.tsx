import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = "", strong = false, onClick }: Props) {
  const base = strong
    ? "glass-strong rounded-[2rem]"
    : "glass rounded-[1.5rem]";
  const interactive = onClick
    ? "cursor-pointer hover:border-[rgba(255,255,255,0.16)] transition-all duration-200"
    : "";
  return (
    <div className={`${base} ${interactive} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
