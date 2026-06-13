import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, AlertCircle, Clock } from "lucide-react";
import { AccentButton } from "../ui/AccentButton";
import { MarketCard } from "../market/MarketCard";
import { CreateMarketModal } from "../market/CreateMarketModal";
import { useMarketsContext } from "../../context/MarketsContext";
import { useWallet } from "@solana/wallet-adapter-react";

export function LiveMarketsGrid() {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { markets, loading, error, refetch } = useMarketsContext();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <section id="markets" className="w-full py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-px bg-[rgba(255,255,255,0.2)]" />
              <span className="text-xs uppercase tracking-[0.3em] text-[rgba(240,240,240,0.4)]">
                Live Markets
              </span>
            </div>
            <h2 className="font-display italic text-4xl md:text-5xl lg:text-6xl
              text-[#f0f0f0] leading-tight">
              Active <em>Predictions</em>
            </h2>
          </div>
          {publicKey && (
            <AccentButton variant="secondary" onClick={() => setShowCreate(true)}>
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Market
              </span>
            </AccentButton>
          )}
        </motion.div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-[1.5rem] h-52 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="glass rounded-[1.5rem] p-8 text-center">
            <AlertCircle className="w-8 h-8 text-[#ff4466] mx-auto mb-3" />
            <p className="text-[rgba(240,240,240,0.5)] text-sm mb-4">
              Could not fetch markets from chain.
            </p>
            <p className="text-xs text-[rgba(240,240,240,0.3)] mb-4 font-mono break-all max-w-sm mx-auto">
              {error}
            </p>
            <AccentButton variant="secondary" onClick={refetch}>Retry</AccentButton>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && markets.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-[2rem] p-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.04)]
              border border-[rgba(255,255,255,0.08)] flex items-center justify-center
              mx-auto mb-6">
              <Clock className="w-7 h-7 text-[rgba(240,240,240,0.2)]" />
            </div>
            <p className="font-display italic text-2xl text-[rgba(240,240,240,0.25)] mb-2">
              No markets yet
            </p>
            <p className="text-sm text-[rgba(240,240,240,0.35)] mb-8 max-w-xs mx-auto">
              {publicKey
                ? "Be the first to create a prediction market on EPOCH."
                : "Connect your wallet to create the first prediction market."}
            </p>
            {publicKey && (
              <div className="flex justify-center">
                <AccentButton variant="primary" onClick={() => setShowCreate(true)}>
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Create First Market
                  </span>
                </AccentButton>
              </div>
            )}
          </motion.div>
        )}

        {/* Bento grid */}
        {!loading && markets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {markets.map((market, i) => (
              <motion.div
                key={market.marketId.toString()}
                className={i % 4 === 0 || i % 4 === 3 ? "md:col-span-7" : "md:col-span-5"}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
              >
                <MarketCard
                  market={market}
                  onClick={() => navigate(`/market/${market.marketId.toString()}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMarketModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setTimeout(refetch, 4_000);
          }}
        />
      )}
    </section>
  );
}
