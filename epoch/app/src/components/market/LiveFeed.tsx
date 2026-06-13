import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, TrendingDown, Zap, Plus } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { LiveDot } from "../ui/LiveDot";
import type { MarketAccount } from "../../lib/program";

type EventType = "yes" | "no" | "settle" | "create";

interface FeedEvent {
  id: string;
  type: EventType;
  message: string;
  timestamp: number;
}

const ICONS = {
  yes:    { Icon: TrendingUp,   color: "#00ff88", bg: "rgba(0,255,136,0.1)"  },
  no:     { Icon: TrendingDown, color: "#ff4466", bg: "rgba(255,68,102,0.1)" },
  settle: { Icon: Zap,          color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  create: { Icon: Plus,         color: "#4E85BF", bg: "rgba(78,133,191,0.1)" },
};

interface Props {
  market: MarketAccount;
}

export function LiveFeed({ market }: Props) {
  const [events, setEvents] = useState<FeedEvent[]>([
    {
      id: "init",
      type: "create",
      message: `Market created on Ephemeral Rollup`,
      timestamp: Date.now() - 10_000,
    },
  ]);
  const prevYes = useRef(market.yesTotal.toNumber());
  const prevNo  = useRef(market.noTotal.toNumber());

  useEffect(() => {
    const curYes = market.yesTotal.toNumber();
    const curNo  = market.noTotal.toNumber();
    const deltaYes = curYes - prevYes.current;
    const deltaNeg = curNo  - prevNo.current;

    if (deltaYes > 0) {
      setEvents(prev => ([
        { id: `yes-${Date.now()}`, type: "yes" as EventType, message: `YES position · ${(deltaYes / 1e9).toFixed(3)} SOL`, timestamp: Date.now() },
        ...prev,
      ] as FeedEvent[]).slice(0, 30));
    }
    if (deltaNeg > 0) {
      setEvents(prev => ([
        { id: `no-${Date.now()}`, type: "no" as EventType, message: `NO position · ${(deltaNeg / 1e9).toFixed(3)} SOL`, timestamp: Date.now() },
        ...prev,
      ] as FeedEvent[]).slice(0, 30));
    }

    prevYes.current = curYes;
    prevNo.current  = curNo;
  }, [market.yesTotal.toString(), market.noTotal.toString()]);

  // Ticker for "X s ago" labels
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  return (
    <GlassCard className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <LiveDot color="green" />
        <span className="text-sm text-[#f0f0f0]">Live Activity</span>
        <span className="text-[10px] uppercase tracking-wider text-[rgba(240,240,240,0.35)] ml-1">
          On Ephemeral Rollup
        </span>
      </div>

      {/* Events list */}
      <div className="flex flex-col max-h-64 overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.slice(0, 20).map(ev => {
            const cfg = ICONS[ev.type];
            const Icon = cfg.Icon;
            const secs = Math.floor((Date.now() - ev.timestamp) / 1000);
            const label = secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 py-3
                  border-b border-[rgba(255,255,255,0.04)] last:border-0"
              >
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: cfg.bg }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                </div>
                <span className="text-sm text-[rgba(240,240,240,0.7)] flex-1 leading-snug">
                  {ev.message}
                </span>
                <span className="text-[10px] text-[rgba(240,240,240,0.3)] flex-shrink-0">
                  {label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
