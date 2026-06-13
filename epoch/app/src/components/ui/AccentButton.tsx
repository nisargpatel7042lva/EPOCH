import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function AccentButton({
  children,
  onClick,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 font-medium text-sm " +
    "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer " +
    "select-none";

  const variants: Record<string, string> = {
    primary:
      "accent-gradient text-[#08080f] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)]",
    secondary:
      "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[#f0f0f0] " +
      "hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]",
    danger:
      "bg-[rgba(255,68,102,0.12)] border border-[rgba(255,68,102,0.25)] text-[#ff4466] " +
      "hover:bg-[rgba(255,68,102,0.2)]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}
