interface Props {
  color?: "green" | "red" | "yellow";
  size?: "sm" | "md";
}

export function LiveDot({ color = "green", size = "sm" }: Props) {
  const colors = {
    green:  "bg-[#00ff88]",
    red:    "bg-[#ff4466]",
    yellow: "bg-yellow-400",
  };
  const sizes = { sm: "w-1.5 h-1.5", md: "w-2.5 h-2.5" };
  return (
    <span className={`rounded-full animate-pulse-dot flex-shrink-0 ${colors[color]} ${sizes[size]}`} />
  );
}
