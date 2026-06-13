import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";
import { GlassCard } from "../ui/GlassCard";
import type { MarketAccount } from "../../lib/program";

interface ChartPoint {
  time: string;
  yes: number;
  no: number;
}

interface Props {
  market: MarketAccount;
}

function makePoint(yesTotal: number, noTotal: number): ChartPoint {
  const total = yesTotal + noTotal;
  const yesPct = total > 0 ? (yesTotal / total) * 100 : 50;
  return {
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    yes: parseFloat(yesPct.toFixed(1)),
    no: parseFloat((100 - yesPct).toFixed(1)),
  };
}

export function ProbabilityCurve({ market }: Props) {
  const [history, setHistory] = useState<ChartPoint[]>(() => {
    const pt = makePoint(market.yesTotal.toNumber(), market.noTotal.toNumber());
    return [pt, pt];
  });

  const total = market.yesTotal.toNumber() + market.noTotal.toNumber();
  const yesPct = total > 0 ? (market.yesTotal.toNumber() / total) * 100 : 50;

  useEffect(() => {
    const pt = makePoint(market.yesTotal.toNumber(), market.noTotal.toNumber());
    setHistory(prev => {
      const next = [...prev, pt];
      return next.slice(-60);
    });
  }, [market.yesTotal.toString(), market.noTotal.toString()]);

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className={`font-display italic text-7xl leading-none mb-1
            ${yesPct >= 50 ? "text-[#00ff88]" : "text-[#ff4466]"}`}>
            {yesPct.toFixed(0)}%
          </div>
          <div className="text-sm text-[rgba(240,240,240,0.45)]">probability YES wins</div>
        </div>
        <div className="text-right">
          <div className="text-2xl text-[#f0f0f0] font-display italic">
            {(total / 1e9).toFixed(3)}
          </div>
          <div className="text-xs text-[rgba(240,240,240,0.4)] uppercase tracking-wider">SOL pooled</div>
        </div>
      </div>

      {/* Chart */}
      {history.length > 1 ? (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={history} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="yes-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff88" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="no-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff4466" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ff4466" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="glass rounded-xl p-3 text-xs">
                    <div className="text-[#00ff88]">YES: {(payload[0]?.value as number)?.toFixed(1)}%</div>
                    <div className="text-[#ff4466]">NO: {(payload[1]?.value as number)?.toFixed(1)}%</div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="yes" stroke="#00ff88" strokeWidth={1.5}
              fill="url(#yes-fill)" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="no" stroke="#ff4466" strokeWidth={1.5}
              fill="url(#no-fill)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[180px] flex items-center justify-center
          text-xs text-[rgba(240,240,240,0.3)]">
          Waiting for first position…
        </div>
      )}
    </GlassCard>
  );
}
