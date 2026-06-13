import { ArrowUpRight } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { LiveDot } from "../ui/LiveDot";
import { OutcomeChip } from "../ui/OutcomeChip";
import type { MarketAccount } from "../../lib/program";

interface Props {
  market: MarketAccount;
  onClick: () => void;
}

function formatTimeLeft(secs: number): string {
  if (secs <= 0) return "Expired";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function MarketCard({ market, onClick }: Props) {
  const total = market.yesTotal.toNumber() + market.noTotal.toNumber();
  const yesPct = total > 0 ? (market.yesTotal.toNumber() / total) * 100 : 50;
  const timeLeft = market.expiryTs.toNumber() - Math.floor(Date.now() / 1000);
  const isOpen = "open" in market.status;

  return (
    <GlassCard
      onClick={onClick}
      className="p-6 group cursor-pointer h-full flex flex-col gap-4"
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1 rounded-full
            bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]
            text-[rgba(240,240,240,0.6)]">
            {market.asset}
          </span>
          <OutcomeChip direction={market.direction} />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LiveDot color={isOpen ? "green" : "red"} />
          <span className="text-[10px] uppercase tracking-wider text-[rgba(240,240,240,0.4)]">
            {formatTimeLeft(timeLeft)}
          </span>
        </div>
      </div>

      {/* Question */}
      <p className="font-display italic text-xl md:text-2xl text-[#f0f0f0]
        leading-snug flex-1 group-hover:text-[rgba(240,240,240,0.9)] transition-colors">
        {market.question}
      </p>

      {/* Probability bar */}
      <div>
        <div className="h-1.5 rounded-full overflow-hidden bg-[rgba(255,255,255,0.06)] mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${yesPct}%`,
              background: "linear-gradient(90deg, #00ff88 0%, #4E85BF 60%)",
            }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-[#00ff88]">YES {yesPct.toFixed(0)}%</span>
          <span className="text-xs text-[#ff4466]">NO {(100 - yesPct).toFixed(0)}%</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between
        pt-3 border-t border-[rgba(255,255,255,0.06)]">
        <span className="text-xs text-[rgba(240,240,240,0.4)]">
          Pool: {(total / 1e9).toFixed(3)} SOL
        </span>
        <span className="text-xs text-[rgba(240,240,240,0.3)]
          group-hover:text-[#00ff88] transition-colors flex items-center gap-1">
          Enter <ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
    </GlassCard>
  );
}
