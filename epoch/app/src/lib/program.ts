import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { baseConnection, erConnection } from "./connections";
import IDL from "../idl.json";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || "C6nt5YvgdgNKETYgHQF9Dm8XQdAreU3n5Pk4CHmrQVvu"
);

export const ORACLE_PROGRAM_ID = new PublicKey("PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd");
export const ER_VALIDATOR = new PublicKey("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57");
export const DELEGATION_PROGRAM = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

export type MarketStatus =
  | { open: Record<string, never> }
  | { resolved: Record<string, never> }
  | { expired: Record<string, never> };

export interface MarketAccount {
  marketId: anchor.BN;
  creator: PublicKey;
  question: string;
  asset: string;
  targetPrice: anchor.BN;
  direction: number;
  expiryTs: anchor.BN;
  yesTotal: anchor.BN;
  noTotal: anchor.BN;
  status: MarketStatus;
  outcome: boolean | null;
  resolverPrice: anchor.BN;
  bump: number;
  pubkey?: PublicKey;
}

export interface PositionAccount {
  user: PublicKey;
  market: PublicKey;
  yesAmount: anchor.BN;
  noAmount: anchor.BN;
  claimed: boolean;
  bump: number;
}

export function isMarketOpen(status: MarketStatus): boolean {
  return "open" in status;
}

export function probabilityYes(market: MarketAccount): number {
  const yes = market.yesTotal.toNumber();
  const no  = market.noTotal.toNumber();
  if (yes + no === 0) return 50;
  return Math.round((yes / (yes + no)) * 100);
}

export function getBaseProgram(wallet: AnchorWallet): anchor.Program {
  const provider = new anchor.AnchorProvider(baseConnection, wallet, { commitment: "confirmed" });
  return new anchor.Program(IDL as anchor.Idl, provider);
}

export function getERProgram(wallet: AnchorWallet): anchor.Program {
  const provider = new anchor.AnchorProvider(erConnection, wallet, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  return new anchor.Program(IDL as anchor.Idl, provider);
}

export function getMarketPDA(marketId: anchor.BN | number): [PublicKey, number] {
  const bn = typeof marketId === "number" ? new anchor.BN(marketId) : marketId;
  const bytes = Buffer.alloc(8);
  const n = BigInt(bn.toString());
  bytes.writeBigUInt64LE(n, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), bytes],
    PROGRAM_ID
  );
}

export function getVaultPDA(marketPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getPositionPDA(marketPubkey: PublicKey, userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketPubkey.toBuffer(), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export { IDL };
