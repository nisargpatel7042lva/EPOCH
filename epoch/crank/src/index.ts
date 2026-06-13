import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ConnectionMagicRouter,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
  escrowPdaFromEscrowAuthority,
  createTopUpEscrowInstruction,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.example") });

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? "C6nt5YvgdgNKETYgHQF9Dm8XQdAreU3n5Pk4CHmrQVvu"
);
const ORACLE_PROGRAM_ID = new PublicKey(
  "PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd"
);
const BASE_URL =
  process.env.PROVIDER_ENDPOINT ?? "https://api.devnet.solana.com";
const ER_URL =
  process.env.EPHEMERAL_PROVIDER_ENDPOINT ?? "https://devnet-as.magicblock.app/";
const ROUTER_URL =
  process.env.MAGIC_ROUTER_ENDPOINT ?? "https://devnet-router.magicblock.app";
const POLL_MS = 500;

function deriveFeedAddress(feedId: string, programId: PublicKey): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("price_feed"),
      Buffer.from("pyth-lazer"),
      Buffer.from(feedId),
    ],
    programId
  );
  return addr;
}

function parsePrice(accountData: Buffer): bigint {
  return accountData.readBigInt64LE(73);
}

// Derive all position PDAs for a market by scanning program accounts on ER.
async function getPositionPDAs(
  erConnection: Connection,
  marketPubkey: PublicKey
): Promise<PublicKey[]> {
  try {
    const accounts = await erConnection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 82 }, // 8 discriminator + 32 market + 32 user + 8 yes + 8 no + 1 claimed + 1 bump
        {
          memcmp: {
            offset: 8,
            bytes: marketPubkey.toBase58(),
          },
        },
      ],
    });
    return accounts.map((a) => a.pubkey);
  } catch {
    return [];
  }
}

async function main() {
  // Load wallet
  const walletPath =
    process.env.ANCHOR_WALLET ??
    `${process.env.HOME}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const baseConnection = new Connection(BASE_URL, "confirmed");
  const erConnection = new Connection(ER_URL, "confirmed");

  const provider = new anchor.AnchorProvider(baseConnection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idlPath = path.resolve(__dirname, "../../target/idl/epoch.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  const erProvider = new anchor.AnchorProvider(erConnection, wallet, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  const erProgram = new anchor.Program(idl, erProvider);

  // SOL/USD oracle feed address (feedId from pyth_lazer_list.json: "SOLUSD")
  const solUsdFeed = deriveFeedAddress("SOLUSD", ORACLE_PROGRAM_ID);
  console.log(
    `[${new Date().toISOString()}] Crank started. PROGRAM=${PROGRAM_ID.toBase58()}`
  );
  console.log(`Oracle feed: ${solUsdFeed.toBase58()}`);

  let iteration = 0;

  while (true) {
    iteration++;
    try {
      await tick(
        program,
        erProgram,
        erConnection,
        baseConnection,
        walletKeypair,
        solUsdFeed
      );
    } catch (err) {
      console.error(
        `[${new Date().toISOString()}] Crank loop error: ${err}`
      );
    }
    await sleep(POLL_MS);
  }
}

async function tick(
  _baseProgram: anchor.Program,
  erProgram: anchor.Program,
  erConnection: Connection,
  baseConnection: Connection,
  payer: Keypair,
  solUsdFeed: PublicKey
) {
  // Fetch all open markets from base layer
  const marketAccounts = await baseConnection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      // MarketStatus::Open discriminant (variant 0) lives at the status field
      // Market layout: 8 disc + 8 id + 32 creator + 4+Q question + 4+A asset + 8 target + 1 dir + 8 expiry + 8 yes + 8 no
      // We can't reliably filter by status without knowing the exact offset, so fetch all and filter in-code
    ],
  });

  const nowTs = Math.floor(Date.now() / 1000);

  for (const { pubkey: marketPubkey, account } of marketAccounts) {
    try {
      let market: any;
      try {
        market = erProgram.coder.accounts.decode("Market", account.data);
      } catch {
        try {
          // Fallback: decode from base layer data
          market = erProgram.coder.accounts.decode("Market", account.data);
        } catch {
          continue;
        }
      }

      // Only process Open markets
      if (!market.status || !("open" in market.status)) continue;

      // Derive vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), marketPubkey.toBuffer()],
        PROGRAM_ID
      );

      // Try to read oracle price from ER (price feeds update on ER, not base)
      let rawPrice: bigint;
      try {
        const oracleAccount = await erConnection.getAccountInfo(solUsdFeed);
        if (!oracleAccount || oracleAccount.data.length < 81) {
          // Fall back to base layer oracle
          const baseOracleAccount = await baseConnection.getAccountInfo(
            solUsdFeed
          );
          if (!baseOracleAccount || baseOracleAccount.data.length < 81) {
            console.warn(
              `[${new Date().toISOString()}] Oracle account not found for market ${marketPubkey.toBase58()}, skipping`
            );
            continue;
          }
          rawPrice = parsePrice(Buffer.from(baseOracleAccount.data));
        } else {
          rawPrice = parsePrice(Buffer.from(oracleAccount.data));
        }
      } catch (e) {
        console.warn(
          `[${new Date().toISOString()}] Oracle read error: ${e}, skipping market ${marketPubkey.toBase58()}`
        );
        continue;
      }

      // Check resolution condition
      const targetPrice: bigint = BigInt(market.targetPrice.toString());
      let conditionMet: boolean;
      if (market.direction === 0) {
        conditionMet = rawPrice >= targetPrice; // ABOVE
      } else if (market.direction === 1) {
        conditionMet = rawPrice < targetPrice; // BELOW
      } else {
        console.warn(
          `[${new Date().toISOString()}] Unknown direction ${market.direction} for market ${marketPubkey.toBase58()}`
        );
        continue;
      }

      const expired = BigInt(nowTs) > BigInt(market.expiryTs.toString());
      const shouldSettle = conditionMet || expired;

      if (!shouldSettle) continue;

      const reason = conditionMet ? "condition_met" : "expired";
      console.log(
        `[${new Date().toISOString()}] Settling market ${marketPubkey.toBase58()} (${reason}) ` +
          `price=${rawPrice} target=${targetPrice} direction=${market.direction}`
      );

      // Collect position PDAs for undelegation
      const positionPDAs = await getPositionPDAs(erConnection, marketPubkey);

      // Ensure escrow is topped up for the commit
      try {
        const escrowPda = escrowPdaFromEscrowAuthority(payer.publicKey);
        const escrowBalance = await erConnection.getBalance(escrowPda);
        if (escrowBalance < 5_000_000) {
          const topUpIx = createTopUpEscrowInstruction(
            escrowPda,
            payer.publicKey,
            payer.publicKey,
            10_000_000
          );
          const topUpTx = new anchor.web3.Transaction().add(topUpIx);
          const baseConn = new Connection(
            process.env.PROVIDER_ENDPOINT ?? "https://api.devnet.solana.com",
            "confirmed"
          );
          const baseProvider = new anchor.AnchorProvider(
            baseConn,
            new anchor.Wallet(payer),
            { commitment: "confirmed" }
          );
          await baseProvider.sendAndConfirm(topUpTx);
        }
      } catch (e) {
        console.warn(
          `[${new Date().toISOString()}] Escrow top-up skipped: ${e}`
        );
      }

      // Build commit_and_settle instruction and send on ER
      const tx = await erProgram.methods
        .commitAndSettle()
        .accountsPartial({
          payer: payer.publicKey,
          market: marketPubkey,
          vault: vaultPda,
          oracleFeed: solUsdFeed,
          magicContext: MAGIC_CONTEXT_ID,
          magicProgram: MAGIC_PROGRAM_ID,
        })
        .remainingAccounts(
          positionPDAs.map((pk) => ({
            pubkey: pk,
            isSigner: false,
            isWritable: true,
          }))
        )
        .transaction();

      const { blockhash, lastValidBlockHeight } =
        await erConnection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = payer.publicKey;
      tx.sign(payer);

      const sig = await erConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });
      console.log(
        `[${new Date().toISOString()}] commit_and_settle sent. sig=${sig}`
      );
    } catch (err) {
      console.error(
        `[${new Date().toISOString()}] Error processing market ${account}: ${err}`
      );
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Fatal crank error:", err);
  process.exit(1);
});
