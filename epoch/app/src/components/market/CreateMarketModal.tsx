import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { X, CheckCircle } from "lucide-react";
import {
  DELEGATION_PROGRAM_ID,
  delegationRecordPdaFromDelegatedAccount,
  delegationMetadataPdaFromDelegatedAccount,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { AccentButton } from "../ui/AccentButton";
import { baseConnection } from "../../lib/connections";
import {
  getBaseProgram, getMarketPDA, getVaultPDA, getPositionPDA,
  PROGRAM_ID, ER_VALIDATOR,
} from "../../lib/program";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMarketModal({ onClose, onSuccess }: Props) {
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;

  const [question,    setQuestion]    = useState("");
  const [asset,       setAsset]       = useState("SOL/USD");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction,   setDirection]   = useState(0);
  const [expiry,      setExpiry]      = useState("");
  const [deposit,     setDeposit]     = useState("0.1");
  const [step,        setStep]        = useState<1 | 2 | 3>(1);
  const [submitting,  setSubmitting]  = useState(false);
  const [statusMsg,   setStatusMsg]   = useState<string | null>(null);

  const handleCreate = async () => {
    if (!publicKey) return;
    setSubmitting(true);
    setStatusMsg("Step 1/4: Initializing market…");

    try {
      const prog = getBaseProgram(wallet as unknown as AnchorWallet);
      const marketId      = new anchor.BN(Date.now());
      const expiryBN      = new anchor.BN(Math.floor(new Date(expiry).getTime() / 1000));
      const targetI64     = new anchor.BN(Math.floor(parseFloat(targetPrice) * 1e8));
      const depositLam    = new anchor.BN(Math.floor(parseFloat(deposit) * 1e9));

      const [mktPda] = getMarketPDA(marketId);
      const [vlt]    = getVaultPDA(mktPda);
      const [posPda] = getPositionPDA(mktPda, publicKey);

      // 1. initializeMarket
      const initTx = await (prog.methods as any)
        .initializeMarket(marketId, question.trim(), asset, targetI64, direction, expiryBN, depositLam)
        .accounts({ creator: publicKey, market: mktPda, vault: vlt, systemProgram: SystemProgram.programId })
        .transaction();
      const s1 = await sendTransaction(initTx, baseConnection);
      await baseConnection.confirmTransaction(s1, "confirmed");

      setStatusMsg("Step 2/4: Creating your position…");

      // 2. initializePosition for creator
      const initPosTx = await (prog.methods as any)
        .initializePosition()
        .accounts({ user: publicKey, market: mktPda, position: posPda, systemProgram: SystemProgram.programId })
        .transaction();
      const s2 = await sendTransaction(initPosTx, baseConnection);
      await baseConnection.confirmTransaction(s2, "confirmed");

      setStatusMsg("Step 3/4: Delegating your position to ER…");

      // 3. delegatePosition for creator
      const posBuf  = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(posPda, PROGRAM_ID);
      const posRec  = delegationRecordPdaFromDelegatedAccount(posPda);
      const posMeta = delegationMetadataPdaFromDelegatedAccount(posPda);
      const delPosTx = await (prog.methods as any)
        .delegatePosition()
        .accounts({
          payer: publicKey, user: publicKey, market: mktPda, position: posPda,
          bufferPosition: posBuf, delegationRecordPosition: posRec,
          delegationMetadataPosition: posMeta, ownerProgram: PROGRAM_ID,
          delegationProgram: DELEGATION_PROGRAM_ID, systemProgram: SystemProgram.programId,
        })
        .transaction();
      const s3 = await sendTransaction(delPosTx, baseConnection);
      await baseConnection.confirmTransaction(s3, "confirmed");

      setStatusMsg("Step 4/4: Delegating market to Ephemeral Rollup…");

      // 4. delegateMarket
      const mktBuf  = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(mktPda, PROGRAM_ID);
      const mktRec  = delegationRecordPdaFromDelegatedAccount(mktPda);
      const mktMeta = delegationMetadataPdaFromDelegatedAccount(mktPda);
      const delMktTx = await (prog.methods as any)
        .delegateMarket(marketId)
        .accounts({
          payer: publicKey, bufferMarket: mktBuf, delegationRecordMarket: mktRec,
          delegationMetadataMarket: mktMeta, market: mktPda, ownerProgram: PROGRAM_ID,
          delegationProgram: DELEGATION_PROGRAM_ID, systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([{ pubkey: ER_VALIDATOR, isWritable: false, isSigner: false }])
        .transaction();
      const s4 = await sendTransaction(delMktTx, baseConnection);
      await baseConnection.confirmTransaction(s4, "confirmed");

      setStep(3);
      setTimeout(() => { onSuccess(); }, 4000);
    } catch (e) {
      setStatusMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = question.trim() && asset && targetPrice && expiry && parseFloat(deposit) >= 0.01;

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        {/* Modal */}
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-[101] p-4"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="glass-strong p-8 rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display italic text-2xl text-[#f0f0f0]">Create Market</h2>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center
                  hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer">
                <X className="w-4 h-4 text-[rgba(240,240,240,0.6)]" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300
                  ${s <= step ? "accent-gradient" : "bg-[rgba(255,255,255,0.08)]"}`} />
              ))}
            </div>

            {/* Step 1 — fields */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                {/* Question */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-[rgba(240,240,240,0.4)] mb-2 block">
                    Prediction
                  </label>
                  <textarea
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Will SOL hit $185 before Sunday midnight?"
                    maxLength={100}
                    rows={2}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
                      rounded-2xl p-4 text-[#f0f0f0] text-sm resize-none outline-none
                      focus:border-[rgba(0,255,136,0.3)] transition-colors
                      placeholder:text-[rgba(240,240,240,0.2)]"
                  />
                  <div className="text-[10px] text-[rgba(240,240,240,0.3)] text-right mt-1">
                    {question.length}/100
                  </div>
                </div>

                {/* Asset */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-[rgba(240,240,240,0.4)] mb-2 block">
                    Asset
                  </label>
                  <div className="flex gap-2">
                    {["SOL/USD", "BTC/USD", "ETH/USD"].map(a => (
                      <button key={a} onClick={() => setAsset(a)}
                        className={`flex-1 py-3 rounded-xl text-sm transition-all cursor-pointer
                          ${asset === a
                            ? "bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.25)] text-[#00ff88]"
                            : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(240,240,240,0.5)]"
                          }`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target + Direction */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-[rgba(240,240,240,0.4)] mb-2 block">
                      Target Price (USD)
                    </label>
                    <input
                      type="number"
                      value={targetPrice}
                      onChange={e => setTargetPrice(e.target.value)}
                      placeholder="185.00"
                      className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
                        rounded-2xl p-4 text-[#f0f0f0] outline-none text-sm
                        focus:border-[rgba(0,255,136,0.3)] transition-colors
                        placeholder:text-[rgba(240,240,240,0.2)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-[rgba(240,240,240,0.4)] mb-2 block">
                      Direction
                    </label>
                    <div className="flex flex-col gap-2">
                      {[{ label: "↑ Above", val: 0 }, { label: "↓ Below", val: 1 }].map(d => (
                        <button key={d.val} onClick={() => setDirection(d.val)}
                          className={`py-2.5 rounded-xl text-sm transition-all cursor-pointer
                            ${direction === d.val
                              ? d.val === 0
                                ? "bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.25)] text-[#00ff88]"
                                : "bg-[rgba(255,68,102,0.1)] border border-[rgba(255,68,102,0.25)] text-[#ff4466]"
                              : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(240,240,240,0.5)]"
                            }`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expiry */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-[rgba(240,240,240,0.4)] mb-2 block">
                    Resolves At
                  </label>
                  <input
                    type="datetime-local"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    min={new Date(Date.now() + 300_000).toISOString().slice(0, 16)}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
                      rounded-2xl p-4 text-[#f0f0f0] outline-none text-sm
                      focus:border-[rgba(0,255,136,0.3)] transition-colors [color-scheme:dark]"
                  />
                </div>

                {/* Deposit */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-[rgba(240,240,240,0.4)] mb-2 block">
                    Initial Deposit (SOL)
                  </label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={e => setDeposit(e.target.value)}
                    placeholder="0.1"
                    min="0.01"
                    step="0.01"
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
                      rounded-2xl p-4 text-[#f0f0f0] outline-none text-sm
                      focus:border-[rgba(0,255,136,0.3)] transition-colors
                      placeholder:text-[rgba(240,240,240,0.2)]"
                  />
                  <p className="text-[10px] text-[rgba(240,240,240,0.3)] mt-1 ml-1">
                    Minimum 0.01 SOL · Seeds initial liquidity
                  </p>
                </div>

                <AccentButton
                  variant="primary"
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                  className="w-full py-4 text-base rounded-2xl mt-2"
                >
                  Review Market →
                </AccentButton>
              </div>
            )}

            {/* Step 2 — Review */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="bg-[rgba(255,255,255,0.03)] rounded-2xl p-5 flex flex-col gap-3">
                  {[
                    ["Prediction", question],
                    ["Asset", asset],
                    ["Target", `$${targetPrice} ${direction === 0 ? "↑ ABOVE" : "↓ BELOW"}`],
                    ["Expires", new Date(expiry).toLocaleString()],
                    ["Deposit", `${deposit} SOL`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm gap-4">
                      <span className="text-[rgba(240,240,240,0.4)] flex-shrink-0">{k}</span>
                      <span className="text-[#f0f0f0] text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[rgba(240,240,240,0.35)] text-center">
                  4 transactions: init market → init position → delegate position → delegate market to ER.
                </p>
                {statusMsg && (
                  <p className="text-xs text-[rgba(240,240,240,0.6)] break-all text-center">{statusMsg}</p>
                )}
                <div className="flex gap-3">
                  <AccentButton variant="secondary" onClick={() => setStep(1)} className="flex-1 py-3">
                    ← Back
                  </AccentButton>
                  <AccentButton
                    variant="primary"
                    onClick={handleCreate}
                    loading={submitting}
                    className="flex-1 py-3"
                  >
                    Create + Delegate
                  </AccentButton>
                </div>
              </div>
            )}

            {/* Step 3 — Success */}
            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[rgba(0,255,136,0.1)]
                  border border-[rgba(0,255,136,0.25)] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-[#00ff88]" />
                </div>
                <h3 className="font-display italic text-2xl text-[#f0f0f0] mb-2">Market Created</h3>
                <p className="text-sm text-[rgba(240,240,240,0.45)] mb-6">
                  Your market is live on the Ephemeral Rollup.
                  Refreshing markets in a moment…
                </p>
                <AccentButton variant="primary" onClick={onClose} className="mx-auto">
                  View Markets
                </AccentButton>
              </div>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
