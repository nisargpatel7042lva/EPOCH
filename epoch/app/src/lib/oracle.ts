import { Connection, PublicKey } from "@solana/web3.js";
import { ORACLE_PROGRAM_ID } from "./program";

// Feed IDs from pyth_lazer oracle (verified against on-chain PDA derivation used in crank)
export const FEED_IDS: Record<string, string> = {
  "SOL/USD": "SOLUSD",
  "BTC/USD": "BTCUSD",
  "ETH/USD": "ETHUSD",
};

export const FEED_EXPONENTS: Record<string, number> = {
  "SOL/USD": -8,
  "BTC/USD": -8,
  "ETH/USD": -8,
};

export function deriveFeedAddress(feedId: string): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("price_feed"), Buffer.from("pyth-lazer"), Buffer.from(feedId)],
    ORACLE_PROGRAM_ID
  );
  return addr;
}

export function parseOraclePrice(data: Buffer, exponent: number): number {
  // Price stored at byte offset 73 as little-endian i64
  const raw = data.readBigInt64LE(73);
  return Number(raw) * Math.pow(10, exponent);
}

export async function fetchOraclePrice(
  connection: Connection,
  asset: string
): Promise<number | null> {
  try {
    const feedId = FEED_IDS[asset];
    if (!feedId) return null;
    const addr = deriveFeedAddress(feedId);
    const info = await connection.getAccountInfo(addr);
    if (!info?.data) return null;
    return parseOraclePrice(Buffer.from(info.data), FEED_EXPONENTS[asset] ?? -8);
  } catch {
    return null;
  }
}
