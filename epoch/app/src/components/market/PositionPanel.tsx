import { useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  MAGIC_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { GlassCard } from "../ui/GlassCard";
import { AccentButton } from "../ui/AccentButton";
import { usePosition } from "../../hooks/usePosition";
import { sendERTransaction } from "../../hooks/useERConnection";
import {
  getBaseProgram, getERProgram,
  getMarketPDA, getPositionPDA,
  PROGRAM_ID,
  type MarketAccount,
} from "../../lib/program";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

interface Props {
  market: MarketAccount;
}

export function PositionPanel({ market }: Props) {
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const [tab, setTab] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  const [marketPDA] = getMarketPDA(market.marketId);
  const { position, isRegistered, loading: posLoading } = usePosition(
    marketPDA,
    publicKey ?? null
  );

  const estimatedPayout = useMemo(() => {
    const amtL = parseFloat(amount) * 1e9;
    if (!amtL || amtL <= 0) return 0;
    const total = market.yesTotal.toNumber() + market.noTotal.toNumber() + amtL;
    const winSide =
      tab === "YES"
        ? market.yesTotal.toNumber() + amtL
        : market.noTotal.toNumber() + amtL;
    const share = amtL / winSide;
    return (share * total * 0.98) / 1e9;
  }, [amount, market, tab]);

  const handleRegister = async () => {
    if (!publicKey) return;
    setRegistering(true);
    setStatusMsg("Creating position on Ephemeral Rollup…");
    try {
      // Market is already delegated → owned by delegation program on base layer.
      // initializePosition requires Account<Market> → must run on ER where the
      // market is still owned by the epoch program.
      const prog = getERProgram(wallet as unknown as AnchorWallet);
      const [posPda] = getPositionPDA(marketPDA, publicKey);

      const initTx = await (prog.methods as any)
        .initializePosition()
        .accounts({ user: publicKey, market: marketPDA, position: posPda, systemProgram: SystemProgram.programId })
        .transaction();

      await sendERTransaction(initTx, sendTransaction, publicKey);
      setStatusMsg("✓ Registered! You can now take positions.");
    } catch (e) {
      setStatusMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleSubmit = async () => {
    if (!publicKey || !amount) return;
    const amtLamports = parseFloat(amount) * 1e9;
    if (amtLamports <= 0) return;

    setSubmitting(true);
    setStatusMsg("Submitting on Ephemeral Rollup…");
    try {
      const prog = getERProgram(wallet as unknown as AnchorWallet);
      const [posPda] = getPositionPDA(marketPDA, publicKey);
      const zero = new anchor.BN(0);
      const lamports = new anchor.BN(Math.floor(amtLamports));

      const tx = await (prog.methods as any)
        .takePosition(
          tab === "YES" ? lamports : zero,
          tab === "NO"  ? lamports : zero,
        )
        .accounts({
          user: publicKey,
          market: marketPDA,
          position: posPda,
          payer: publicKey,
          systemProgram: SystemProgram.programId,
          magicProgram: MAGIC_PROGRAM_ID,
          magicContext: MAGIC_CONTEXT_ID,
        })
        .transaction();

      const sig = await sendERTransaction(tx, sendTransaction, publicKey);
      setStatusMsg(`✓ Position taken! ${sig.slice(0, 16)}…`);
      setAmount("");
    } catch (e) {
      setStatusMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!publicKey) {
    return (
      <GlassCard strong className="p-6">
        <p className="text-sm text-[rgba(240,240,240,0.45)] mb-4 text-center">
          Connect your wallet to take a position
        </p>
        <WalletMultiButton style={{
          width: "100%", background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem",
          color: "#f0f0f0", justifyContent: "center", height: "54px", fontSize: "14px",
        }} />
      </GlassCard>
    );
  }

  if (posLoading) {
    return (
      <GlassCard strong className="p-6">
        <div className="h-40 flex items-center justify-center text-sm text-[rgba(240,240,240,0.4)]">
          Checking registration…
        </div>
      </GlassCard>
    );
  }

  if (!isRegistered) {
    return (
      <GlassCard strong className="p-6 space-y-4">
        <h3 className="font-display italic text-lg text-[#f0f0f0]">Join Market</h3>
        <p className="text-sm text-[rgba(240,240,240,0.5)] leading-relaxed">
          Register your position account before this market is delegated to the ER.
          Requires 2 base-layer transactions.
        </p>
        {statusMsg && (
          <p className="text-xs text-[rgba(240,240,240,0.6)] break-all">{statusMsg}</p>
        )}
        <AccentButton variant="primary" onClick={handleRegister} loading={registering} className="w-full py-4 rounded-2xl">
          Register for this Market
        </AccentButton>
      </GlassCard>
    );
  }

  return (
    <GlassCard strong className="p-6">
      {/* Tab toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-[rgba(255,255,255,0.04)] rounded-2xl">
        {(["YES", "NO"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
              ${tab === t
                ? t === "YES"
                  ? "bg-[rgba(0,255,136,0.15)] text-[#00ff88] border border-[rgba(0,255,136,0.25)]"
                  : "bg-[rgba(255,68,102,0.15)] text-[#ff4466] border border-[rgba(255,68,102,0.25)]"
                : "text-[rgba(240,240,240,0.35)] hover:text-[rgba(240,240,240,0.6)]"
              }`}
          >
            {t === "YES" ? "↑ YES" : "↓ NO"}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
        rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[rgba(240,240,240,0.4)]">Amount</span>
          <span className="text-xs text-[rgba(240,240,240,0.4)]">SOL</span>
        </div>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-transparent text-3xl font-display italic
            text-[#f0f0f0] text-right outline-none placeholder:text-[rgba(240,240,240,0.15)]"
        />
      </div>

      {/* Quick picks */}
      <div className="flex gap-2 mb-5">
        {["0.1", "0.25", "0.5", "1.0"].map(v => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className="flex-1 py-2 text-xs rounded-xl cursor-pointer
              bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
              text-[rgba(240,240,240,0.5)] hover:border-[rgba(255,255,255,0.16)]
              hover:text-[#f0f0f0] transition-all"
          >
            {v}
          </button>
        ))}
      </div>

      {/* Est payout */}
      {parseFloat(amount) > 0 && (
        <div className="flex justify-between text-sm mb-5
          p-3 rounded-xl bg-[rgba(255,255,255,0.03)]">
          <span className="text-[rgba(240,240,240,0.45)]">Est. return if {tab} wins</span>
          <span className={tab === "YES" ? "text-[#00ff88]" : "text-[#ff4466]"}>
            {estimatedPayout.toFixed(3)} SOL
          </span>
        </div>
      )}

      {/* Submit */}
      <AccentButton
        variant={tab === "YES" ? "primary" : "danger"}
        onClick={handleSubmit}
        loading={submitting}
        disabled={!amount || parseFloat(amount) <= 0}
        className="w-full py-4 text-base rounded-2xl"
      >
        {submitting ? "Submitting on ER…" : `Take ${tab} Position`}
      </AccentButton>

      {/* Status */}
      {statusMsg && (
        <p className="mt-3 text-xs text-[rgba(240,240,240,0.55)] break-all">{statusMsg}</p>
      )}

      {/* Existing position */}
      {position && (
        <div className="mt-4 p-4 rounded-2xl bg-[rgba(255,255,255,0.03)]
          border border-[rgba(255,255,255,0.06)]">
          <div className="text-xs uppercase tracking-wider text-[rgba(240,240,240,0.4)] mb-3">
            Your Position
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[rgba(240,240,240,0.5)]">YES</span>
            <span className="text-[#00ff88]">
              {(position.yesAmount.toNumber() / 1e9).toFixed(3)} SOL
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[rgba(240,240,240,0.5)]">NO</span>
            <span className="text-[#ff4466]">
              {(position.noAmount.toNumber() / 1e9).toFixed(3)} SOL
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
