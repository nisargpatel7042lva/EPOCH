import { ExternalLink } from "lucide-react";
import { LiveDot } from "../ui/LiveDot";

const TEXT = "EPOCH • PREDICTION MARKETS • EPHEMERAL ROLLUPS • ZERO FEES • SOLANA • ";

export function MarqueeFooter() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] pt-12 pb-8 overflow-hidden">
      {/* Marquee */}
      <div className="overflow-hidden mb-12">
        <div className="animate-marquee inline-flex">
          <span className="font-display italic text-4xl md:text-5xl text-[rgba(255,255,255,0.07)] tracking-[0.05em]">
            {TEXT.repeat(8)}
          </span>
          <span className="font-display italic text-4xl md:text-5xl text-[rgba(255,255,255,0.07)] tracking-[0.05em]">
            {TEXT.repeat(8)}
          </span>
        </div>
      </div>

      {/* Footer bar */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left */}
        <div className="flex flex-col items-center sm:items-start gap-0.5">
          <span className="text-sm text-[#f0f0f0]">EPOCH</span>
          <span className="text-xs text-[rgba(240,240,240,0.35)]">
            Built for Solana Blitz v5 · Powered by MagicBlock
          </span>
        </div>

        {/* Center */}
        <div className="flex items-center gap-2">
          <LiveDot color="green" />
          <span className="text-xs uppercase tracking-wider text-[#00ff88]">Live on Devnet</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/magicblock-labs"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 glass rounded-full flex items-center justify-center
              hover:border-[rgba(255,255,255,0.2)] transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[rgba(240,240,240,0.5)]" />
          </a>
          <a
            href="https://x.com/magicblock"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 glass rounded-full flex items-center justify-center
              hover:border-[rgba(255,255,255,0.2)] transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[rgba(240,240,240,0.5)]" />
          </a>
        </div>
      </div>
    </footer>
  );
}
