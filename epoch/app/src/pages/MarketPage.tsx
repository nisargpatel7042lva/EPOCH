import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { LiveDot } from "../components/ui/LiveDot";
import { OutcomeChip } from "../components/ui/OutcomeChip";
import { ProbabilityCurve } from "../components/market/ProbabilityCurve";
import { PositionPanel } from "../components/market/PositionPanel";
import { SettlementCountdown } from "../components/market/SettlementCountdown";
import { LiveFeed } from "../components/market/LiveFeed";
import { useMarket } from "../hooks/useMarket";

export function MarketPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();
  const { market, loading, error } = useMarket(marketId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080f] pt-24 pb-16 px-6 md:px-10 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 glass rounded-[1.5rem] h-96 animate-pulse" />
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="glass rounded-[1.5rem] h-40 animate-pulse" />
            <div className="glass rounded-[1.5rem] h-52 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[rgba(240,240,240,0.4)] mb-4">
            {error ?? "Market not found."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-[#00ff88] underline text-sm cursor-pointer"
          >
            Back to markets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080f] pt-24 pb-16 px-6 md:px-10 max-w-[1400px] mx-auto">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[rgba(240,240,240,0.4)]
          hover:text-[#f0f0f0] transition-colors mb-8 group cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        All Markets
      </button>

      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-sm px-3 py-1 rounded-full
            bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]
            text-[rgba(240,240,240,0.5)]">
            {market.asset}
          </span>
          <OutcomeChip direction={market.direction} />
          <LiveDot color="green" />
          <span className="text-xs uppercase tracking-wider text-[#00ff88]">Live on ER</span>
        </div>
        <h1 className="font-display italic text-3xl md:text-5xl text-[#f0f0f0]
          leading-tight max-w-3xl">
          {market.question}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <ProbabilityCurve market={market} />
          <LiveFeed market={market} />
        </div>
        {/* Right */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <SettlementCountdown market={market} />
          <PositionPanel market={market} />
        </div>
      </div>
    </div>
  );
}
