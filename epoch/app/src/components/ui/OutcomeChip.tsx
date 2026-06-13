interface Props {
  direction: number;
}

export function OutcomeChip({ direction }: Props) {
  if (direction === 0) {
    return (
      <span className="text-xs rounded-full px-3 py-1 font-medium uppercase tracking-wider
        bg-[rgba(0,255,136,0.08)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]">
        ↑ ABOVE
      </span>
    );
  }
  return (
    <span className="text-xs rounded-full px-3 py-1 font-medium uppercase tracking-wider
      bg-[rgba(255,68,102,0.08)] text-[#ff4466] border border-[rgba(255,68,102,0.2)]">
      ↓ BELOW
    </span>
  );
}
