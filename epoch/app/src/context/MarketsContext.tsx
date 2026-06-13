import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import * as anchor from "@coral-xyz/anchor";
import { erConnection } from "../lib/connections";
import { PROGRAM_ID, MarketAccount, isMarketOpen } from "../lib/program";
import IDL from "../idl.json";

interface MarketsContextValue {
  markets: MarketAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const Ctx = createContext<MarketsContextValue>({
  markets: [],
  loading: true,
  error: null,
  refetch: () => {},
});

export function MarketsProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState<MarketAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const coder = new anchor.BorshAccountsCoder(IDL as anchor.Idl);
      const accounts = await erConnection.getProgramAccounts(PROGRAM_ID);
      const parsed: MarketAccount[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          const m: MarketAccount = coder.decode("Market", account.data);
          if (isMarketOpen(m.status)) {
            m.pubkey = pubkey;
            parsed.push(m);
          }
        } catch { /* skip non-market accounts */ }
      }
      setMarkets(parsed.sort((a, b) => b.marketId.toNumber() - a.marketId.toNumber()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 10_000);
    return () => clearInterval(id);
  }, [fetch_]);

  return <Ctx.Provider value={{ markets, loading, error, refetch: fetch_ }}>{children}</Ctx.Provider>;
}

export const useMarketsContext = () => useContext(Ctx);
