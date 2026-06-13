import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { OutcomeChip } from "../ui/OutcomeChip";
import { useOraclePrice } from "../../hooks/useOraclePrice";
import type { MarketAccount } from "../../lib/program";

interface Props {
  market: MarketAccount;
}

export function SettlementCountdown({ market }: Props) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const { price, direction, loading: priceLoading } = useOraclePrice(market.asset);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = market.expiryTs.toNumber() - now;
  const hh = Math.max(0, Math.floor(secondsLeft / 3600));
  const mm = Math.max(0, Math.floor((secondsLeft % 3600) / 60));
  const ss = Math.max(0, secondsLeft % 60);

  const timeColor =
    secondsLeft < 120
      ? "#ff4466"
      : secondsLeft < 600
      ? "#f59e0b"
      : "#f0f0f0";

  const targetUSD = market.targetPrice.toNumber() / 1e8;
  const resolvingYES =
    market.direction === 0
      ? (price ?? 0) >= targetUSD
      : (price ?? 0) < targetUSD;

  return (
    <GlassCard className="p-5">
      <div className="text-xs uppercase tracking-wider text-[rgba(240,240,240,0.4)] mb-4">
        Resolves in
      </div>

      {/* Countdown */}
      <div
        className="font-display italic tabular-nums mb-5 transition-colors duration-500"
        style={{ fontSize: "3rem", lineHeight: 1, color: timeColor }}
      >
        {secondsLeft > 0
          ? `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
          : "Expired"}
      </div>

      {/* Oracle price row */}
      <div className="flex items-center justify-between py-3
        border-t border-[rgba(255,255,255,0.06)] mb-3">
        <span className="text-xs text-[rgba(240,240,240,0.4)]">{market.asset} Now</span>
        {priceLoading ? (
          <div className="w-16 h-4 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
        ) : (
          <div className="flex items-center gap-1.5">
            {direction === "up"
              ? <TrendingUp className="w-3 h-3 text-[#00ff88]" />
              : <TrendingDown className="w-3 h-3 text-[#ff4466]" />}
            <span className={`text-sm font-medium ${direction === "up" ? "text-[#00ff88]" : "text-[#ff4466]"}`}>
              ${price?.toFixed(2) ?? "—"}
            </span>
          </div>
        )}
      </div>

      {/* Target row */}
      <div className="flex items-center justify-between py-3
        border-t border-[rgba(255,255,255,0.06)] mb-3">
        <span className="text-xs text-[rgba(240,240,240,0.4)]">Target</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#f0f0f0]">${targetUSD.toFixed(2)}</span>
          <OutcomeChip direction={market.direction} />
        </div>
      </div>

      {/* Resolution status */}
      {!priceLoading && price !== null && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-sm transition-all duration-300
            ${resolvingYES
              ? "bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.18)] text-[#00ff88]"
              : "bg-[rgba(255,68,102,0.08)] border border-[rgba(255,68,102,0.18)] text-[#ff4466]"
            }`}
        >
          {resolvingYES
            ? <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Currently resolving YES</>
            : <><XCircle className="w-4 h-4 flex-shrink-0" /> Currently resolving NO</>
          }
        </div>
      )}
    </GlassCard>
  );
}
