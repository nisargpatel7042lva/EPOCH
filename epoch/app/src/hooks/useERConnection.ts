import { Transaction, PublicKey } from "@solana/web3.js";
import { erConnection, baseConnection } from "../lib/connections";

export { erConnection, baseConnection };

export async function sendERTransaction(
  transaction: Transaction,
  sendTransaction: (tx: Transaction, conn: typeof erConnection, opts?: object) => Promise<string>,
  publicKey: PublicKey
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await erConnection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = publicKey;
  return sendTransaction(transaction, erConnection, { skipPreflight: true });
}
