import { Connection } from "@solana/web3.js";

export const BASE_RPC  = import.meta.env.VITE_PROVIDER_ENDPOINT  || "https://api.devnet.solana.com";
export const ER_RPC    = import.meta.env.VITE_EPHEMERAL_ENDPOINT || "https://devnet-as.magicblock.app/";
export const ER_WS     = import.meta.env.VITE_EPHEMERAL_WS       || "wss://devnet-as.magicblock.app/";

export const baseConnection = new Connection(BASE_RPC, { commitment: "confirmed" });

export const erConnection = new Connection(ER_RPC, {
  wsEndpoint: ER_WS,
  commitment: "confirmed",
});
