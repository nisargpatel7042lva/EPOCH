import { useEffect, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { erConnection, baseConnection } from "../lib/connections";
import { MarketAccount, getMarketPDA } from "../lib/program";
import IDL from "../idl.json";

export function useMarket(marketId: string | undefined) {
  const [market, setMarket] = useState<MarketAccount | null>(null);
  const [marketPubkey, setMarketPubkey] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!marketId) return;
    const coder = new anchor.BorshAccountsCoder(IDL as anchor.Idl);
    const [pda] = getMarketPDA(new anchor.BN(marketId));
    setMarketPubkey(pda);

    const load = async () => {
      try {
        let info = await erConnection.getAccountInfo(pda);
        if (!info) info = await baseConnection.getAccountInfo(pda);
        if (!info) {
          setError("Market not found");
          setLoading(false);
          return;
        }
        const decoded: MarketAccount = coder.decode("Market", info.data);
        decoded.pubkey = pda;
        setMarket(decoded);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 300);
    return () => clearInterval(id);
  }, [marketId]);

  return { market, marketPubkey, loading, error };
}
