import { useEffect, useState } from "react";
import { erConnection } from "../lib/connections";
import { fetchOraclePrice } from "../lib/oracle";

export function useOraclePrice(asset: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<"up" | "down" | "flat">("flat");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;

    const poll = async () => {
      const p = await fetchOraclePrice(erConnection, asset);
      if (cancelled) return;
      if (p !== null) {
        setPrice(prev => {
          setPrevPrice(prev);
          if (prev !== null) {
            setDirection(p > prev ? "up" : p < prev ? "down" : "flat");
          }
          return p;
        });
        setLastUpdated(Date.now());
        setLoading(false);
      }
    };

    poll();
    const id = setInterval(poll, 800);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [asset]);

  return { price, prevPrice, direction, loading, lastUpdated };
}
