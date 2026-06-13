import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Epoch } from "../target/types/epoch";
import {
  ConnectionMagicRouter,
  DELEGATION_PROGRAM_ID,
  MAGIC_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  delegationRecordPdaFromDelegatedAccount,
  delegationMetadataPdaFromDelegatedAccount,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  escrowPdaFromEscrowAuthority,
  createTopUpEscrowInstruction,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { assert } from "chai";
import * as dotenv from "dotenv";

dotenv.config();

const PROGRAM_ID = new anchor.web3.PublicKey(
  "C6nt5YvgdgNKETYgHQF9Dm8XQdAreU3n5Pk4CHmrQVvu"
);

// Pyth classic SOL/USD devnet account — 3312 bytes.
// Bytes [73..81] as i64 LE: 6485183463413527904 (positive).
// Oracle > target_price=0 with direction=0 (ABOVE) → outcome = YES (true).
const ORACLE_FEED = new anchor.web3.PublicKey(
  "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"
);

const ER_VALIDATOR = new anchor.web3.PublicKey(
  "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57"
);

const MARKET_ID   = new BN(Math.floor(Date.now() / 1000));
const INITIAL_DEP = 50_000;
const YES_AMOUNT  = new BN(50_000);
const NO_AMOUNT   = new BN(50_000);
const ADJUST_YES  = new BN(20_000);

const ER_ENDPOINT    = process.env.EPHEMERAL_PROVIDER_ENDPOINT || "https://devnet-as.magicblock.app/";
const ER_WS_ENDPOINT = process.env.EPHEMERAL_WS_ENDPOINT      || "wss://devnet-as.magicblock.app/";

describe("EPOCH — Full Market Lifecycle", () => {
  // ── Providers ─────────────────────────────────────────────────────────────

  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection(
      process.env.PROVIDER_ENDPOINT || "https://api.devnet.solana.com",
      { commitment: "confirmed" }
    ),
    anchor.Wallet.local()
  );

  const erConnection = new anchor.AnchorProvider(
    new anchor.web3.Connection(
      ER_ENDPOINT,
      { wsEndpoint: ER_WS_ENDPOINT, commitment: "confirmed" }
    ),
    anchor.Wallet.local()
  );

  // ConnectionMagicRouter: uses getBlockhashForAccounts so the ER validator
  // recognises the fee payer in the blockhash context (required for ER txs).
  const magicRouter = new ConnectionMagicRouter(ER_ENDPOINT, {
    wsEndpoint: ER_WS_ENDPOINT,
    commitment: "confirmed",
  });

  anchor.setProvider(provider);
  const program = anchor.workspace.Epoch as Program<Epoch>;

  // ER program: same IDL, ER endpoint (used for account fetching)
  const erProgram = new Program<Epoch>(program.idl, erConnection);

  // Main wallet keypair (needed to sign ER transactions manually)
  const walletKp = (provider.wallet as anchor.Wallet).payer;

  // Second user keypair for NO-side position
  const user2 = anchor.web3.Keypair.generate();
  let erProgram2: Program<Epoch>;

  // ── PDAs ──────────────────────────────────────────────────────────────────

  const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market"), MARKET_ID.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
  const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketPda.toBuffer()],
    PROGRAM_ID
  );
  const [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketPda.toBuffer(), provider.wallet.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [position2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketPda.toBuffer(), user2.publicKey.toBuffer()],
    PROGRAM_ID
  );

  // Delegation PDAs
  const bufferPda       = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(marketPda, PROGRAM_ID);
  const delegationRec   = delegationRecordPdaFromDelegatedAccount(marketPda);
  const delegationMeta  = delegationMetadataPdaFromDelegatedAccount(marketPda);

  // ── ER transaction helper ──────────────────────────────────────────────────
  // Uses the ER connection's own getLatestBlockhash (not getBlockhashForAccounts)
  // and skips preflight — the ER handles its own fee/account validation.
  // skipPreflight is required: the ER's simulated preflight rejects non-delegated
  // fee payers even when the actual execution would succeed via the escrow path.
  async function erRpc(
    tx: anchor.web3.Transaction,
    primarySigner: anchor.web3.Keypair,
    extraSigners: anchor.web3.Keypair[] = []
  ): Promise<string> {
    tx.feePayer = primarySigner.publicKey;

    // Get blockhash from the ER's own RPC (standard Solana method)
    const { blockhash, lastValidBlockHeight } =
      await erConnection.connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;

    tx.sign(...([primarySigner, ...extraSigners] as [anchor.web3.Signer, ...anchor.web3.Signer[]]));

    // skipPreflight=true: ER handles validation at execution, not simulation
    const sig = await erConnection.connection.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true }
    );
    console.log(`  ER sig: ${sig}`);
    const status = await erConnection.connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    if (status.value.err) {
      // Fetch transaction logs for diagnosis
      try {
        const txDetail = await erConnection.connection.getTransaction(sig, {
          maxSupportedTransactionVersion: 0,
        });
        console.log("  ER tx logs:", JSON.stringify(txDetail?.meta?.logMessages));
        console.log("  ER tx err:", JSON.stringify(txDetail?.meta?.err));
      } catch (_) {}
      throw new Error(`ER tx failed: ${JSON.stringify(status.value.err)}`);
    }
    return sig;
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  before(async () => {
    // Fund user2 via transfer from main wallet (avoids faucet rate limits)
    const fundTx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: user2.publicKey,
        lamports: 60_000_000, // 0.06 SOL — enough for user2 escrow top-up + fees
      })
    );
    await provider.sendAndConfirm(fundTx, [], { commitment: "confirmed" });
    console.log(`user2 ${user2.publicKey.toBase58()} funded with 0.2 SOL`);

    // Top up ephemeral escrow for main wallet (base-layer tx).
    // The ER validates fee payers by checking their escrow PDA has funds.
    const mainEscrow = escrowPdaFromEscrowAuthority(provider.wallet.publicKey);
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createTopUpEscrowInstruction(
          mainEscrow,
          provider.wallet.publicKey,
          provider.wallet.publicKey,
          10_000_000 // 0.01 SOL — enough for ER fees + Magic Action base-layer fee
        )
      ),
      [],
      { commitment: "confirmed" }
    );
    console.log(`main wallet escrow ${mainEscrow.toBase58()} topped up`);

    // Top up ephemeral escrow for user2
    const user2Escrow = escrowPdaFromEscrowAuthority(user2.publicKey);
    await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      new anchor.web3.Transaction().add(
        createTopUpEscrowInstruction(
          user2Escrow,
          user2.publicKey,
          user2.publicKey,
          10_000_000 // 0.01 SOL
        )
      ),
      [user2],
      { commitment: "confirmed" }
    );
    console.log(`user2 escrow ${user2Escrow.toBase58()} topped up`);

    erProgram2 = new Program<Epoch>(
      program.idl,
      new anchor.AnchorProvider(erConnection.connection, new anchor.Wallet(user2), {
        commitment: "confirmed",
      })
    );
  });

  // ── 1. Initialize market ───────────────────────────────────────────────────

  it("1. Creates a market on base layer", async () => {
    const expiryTs = new BN(Math.floor(Date.now() / 1000) + 3600);

    const sig = await program.methods
      .initializeMarket(
        MARKET_ID,
        "Will SOL price close above $0 at expiry?",
        "SOL/USD",
        new BN(0),  // target_price=0 — oracle always > 0 → YES wins
        0,          // direction ABOVE
        expiryTs,
        new BN(INITIAL_DEP)
      )
      .accounts({
        creator:       provider.wallet.publicKey,
        market:        marketPda,
        vault:         vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc({ commitment: "confirmed" });

    console.log("initialize_market sig:", sig);

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.marketId.toString(), MARKET_ID.toString());
    assert.equal(market.asset, "SOL/USD");
    assert.equal(market.direction, 0);
    assert.equal(Object.keys(market.status)[0], "open");

    const vault = await program.account.vault.fetch(vaultPda);
    assert.equal(vault.totalDeposited.toString(), String(INITIAL_DEP));
    console.log("  market:", marketPda.toBase58());
    console.log("  vault: ", vaultPda.toBase58());
  });

  // ── 2. Pre-create position PDAs on base layer ─────────────────────────────
  // Must happen BEFORE delegation: once the market is delegated its owner on
  // base layer is the delegation program, so Account<Market> checks fail.
  // Positions are created here (base layer, market still owned by our program)
  // so ER take_position can use plain `mut` with no lamport deduction.

  it("2. Pre-creates and delegates position PDAs on base layer", async () => {
    // ── Initialize positions ────────────────────────────────────────────────
    const sig1 = await program.methods
      .initializePosition()
      .accounts({
        user:          provider.wallet.publicKey,
        market:        marketPda,
        position:      positionPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc({ commitment: "confirmed" });
    console.log("  initialize_position (user1) sig:", sig1);

    const ix2 = await program.methods
      .initializePosition()
      .accounts({
        user:          user2.publicKey,
        market:        marketPda,
        position:      position2Pda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .instruction();
    await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      new anchor.web3.Transaction().add(ix2),
      [user2],
      { commitment: "confirmed" }
    );
    console.log("  initialize_position (user2) done");

    // ── Derive delegation PDAs for each position ───────────────────────────
    const posBufPda  = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(positionPda,  PROGRAM_ID);
    const posRecPda  = delegationRecordPdaFromDelegatedAccount(positionPda);
    const posMetaPda = delegationMetadataPdaFromDelegatedAccount(positionPda);

    const pos2BufPda  = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(position2Pda, PROGRAM_ID);
    const pos2RecPda  = delegationRecordPdaFromDelegatedAccount(position2Pda);
    const pos2MetaPda = delegationMetadataPdaFromDelegatedAccount(position2Pda);

    // ── Delegate position for user1 ────────────────────────────────────────
    const sigDel1 = await program.methods
      .delegatePosition()
      .accounts({
        payer:                       provider.wallet.publicKey,
        user:                        provider.wallet.publicKey,
        market:                      marketPda,
        position:                    positionPda,
        bufferPosition:              posBufPda,
        delegationRecordPosition:    posRecPda,
        delegationMetadataPosition:  posMetaPda,
        ownerProgram:                PROGRAM_ID,
        delegationProgram:           DELEGATION_PROGRAM_ID,
        systemProgram:               anchor.web3.SystemProgram.programId,
      } as any)
      .rpc({ commitment: "confirmed" });
    console.log("  delegate_position (user1) sig:", sigDel1);

    // ── Delegate position for user2 ────────────────────────────────────────
    const ix2Del = await program.methods
      .delegatePosition()
      .accounts({
        payer:                       user2.publicKey,
        user:                        user2.publicKey,
        market:                      marketPda,
        position:                    position2Pda,
        bufferPosition:              pos2BufPda,
        delegationRecordPosition:    pos2RecPda,
        delegationMetadataPosition:  pos2MetaPda,
        ownerProgram:                PROGRAM_ID,
        delegationProgram:           DELEGATION_PROGRAM_ID,
        systemProgram:               anchor.web3.SystemProgram.programId,
      } as any)
      .instruction();
    await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      new anchor.web3.Transaction().add(ix2Del),
      [user2],
      { commitment: "confirmed" }
    );
    console.log("  delegate_position (user2) done");

    // Verify delegation records exist
    const rec1 = await provider.connection.getAccountInfo(posRecPda);
    assert.isNotNull(rec1, "position 1 delegation record must exist");
    const rec2 = await provider.connection.getAccountInfo(pos2RecPda);
    assert.isNotNull(rec2, "position 2 delegation record must exist");
  });

  // ── 3. Delegate market to ER ───────────────────────────────────────────────

  it("3. Delegates market PDA to ER", async () => {
    const sig = await program.methods
      .delegateMarket(MARKET_ID)
      .accounts({
        payer:                    provider.wallet.publicKey,
        bufferMarket:             bufferPda,
        delegationRecordMarket:   delegationRec,
        delegationMetadataMarket: delegationMeta,
        market:                   marketPda,
        ownerProgram:             PROGRAM_ID,
        delegationProgram:        DELEGATION_PROGRAM_ID,
        systemProgram:            anchor.web3.SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: ER_VALIDATOR, isWritable: false, isSigner: false },
      ])
      .rpc({ commitment: "confirmed" });

    console.log("delegate_market sig:", sig);

    const record = await provider.connection.getAccountInfo(delegationRec);
    assert.isNotNull(record, "delegation record must exist");
    console.log("  delegation record:", delegationRec.toBase58());

    // Wait for the ER to propagate the delegated account clone before ER txs
    await new Promise((r) => setTimeout(r, 4_000));
    console.log("  ER state propagation wait done");
  });

  // ── 3. YES position on ER ──────────────────────────────────────────────────

  it("3. Takes YES position on ER (zero fee)", async () => {
    const tx = await erProgram.methods
      .takePosition(YES_AMOUNT, new BN(0))
      .accounts({
        user:          provider.wallet.publicKey,
        market:        marketPda,
        position:      positionPda,
        payer:         provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        magicProgram:  MAGIC_PROGRAM_ID,
        magicContext:  MAGIC_CONTEXT_ID,
      } as any)
      .transaction();

    const sig = await erRpc(tx, walletKp);
    console.log("take_position YES sig:", sig);

    const market = await erProgram.account.market.fetch(marketPda);
    assert.equal(market.yesTotal.toString(), YES_AMOUNT.toString());
    assert.equal(market.noTotal.toString(), "0");
    console.log(`  yesTotal=${market.yesTotal} noTotal=${market.noTotal}`);
  });

  // ── 4. NO position on ER (second wallet) ──────────────────────────────────

  it("4. Takes NO position on ER (second wallet)", async () => {
    const tx = await erProgram2.methods
      .takePosition(new BN(0), NO_AMOUNT)
      .accounts({
        user:          user2.publicKey,
        market:        marketPda,
        position:      position2Pda,
        payer:         user2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        magicProgram:  MAGIC_PROGRAM_ID,
        magicContext:  MAGIC_CONTEXT_ID,
      } as any)
      .transaction();

    const sig = await erRpc(tx, user2);
    console.log("take_position NO (user2) sig:", sig);

    const market = await erProgram.account.market.fetch(marketPda);
    assert.equal(market.noTotal.toString(), NO_AMOUNT.toString());
    console.log(`  yesTotal=${market.yesTotal} noTotal=${market.noTotal}`);
  });

  // ── 5. Adjust YES position on ER ──────────────────────────────────────────

  it("5. Adjusts YES position on ER", async () => {
    const tx = await erProgram.methods
      .adjustPosition(ADJUST_YES, new BN(0))
      .accounts({
        user:          provider.wallet.publicKey,
        market:        marketPda,
        position:      positionPda,
        payer:         provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        magicProgram:  MAGIC_PROGRAM_ID,
        magicContext:  MAGIC_CONTEXT_ID,
      } as any)
      .transaction();

    const sig = await erRpc(tx, walletKp);
    console.log("adjust_position sig:", sig);

    const expectedYes = YES_AMOUNT.add(ADJUST_YES).toString(); // 70_000
    const market      = await erProgram.account.market.fetch(marketPda);
    assert.equal(market.yesTotal.toString(), expectedYes);
    console.log(`  yesTotal=${market.yesTotal} (expected ${expectedYes})`);
  });

  // ── 6. Live probability ────────────────────────────────────────────────────

  it("6. Reads live probability from market account", async () => {
    const market = await erProgram.account.market.fetch(marketPda);
    const yes    = market.yesTotal.toNumber();
    const no     = market.noTotal.toNumber();
    const total  = yes + no;

    assert.isAbove(total, 0, "pool must be non-zero");

    const pYes = ((yes / total) * 100).toFixed(1);
    const pNo  = ((no  / total) * 100).toFixed(1);
    console.log(`  YES: ${pYes}%  NO: ${pNo}%  (pool: ${total} lamports)`);
    assert.isAbove(Number(pYes), 50, "YES must be majority (70k vs 50k)");
  });

  // ── 7. commit_and_settle (crank) ───────────────────────────────────────────

  it("7. Fires commit_and_settle from crank", async () => {
    const tx = await erProgram.methods
      .commitAndSettle()
      .accounts({
        payer:        provider.wallet.publicKey,
        market:       marketPda,
        vault:        vaultPda,
        oracleFeed:   ORACLE_FEED,
        magicProgram: MAGIC_PROGRAM_ID,
        magicContext: MAGIC_CONTEXT_ID,
      } as any)
      // Pass delegated position PDAs so commit_and_settle also undelegates them.
      // After this call, positions are committed back to base layer and their
      // base-layer owner is restored to our program — required for withdraw_winnings.
      .remainingAccounts([
        { pubkey: positionPda,  isSigner: false, isWritable: true },
        { pubkey: position2Pda, isSigner: false, isWritable: true },
      ])
      .transaction();

    const sig = await erRpc(tx, walletKp);
    console.log("commit_and_settle sig:", sig);
    assert.ok(sig);
  });

  // ── 8. Wait for settlement_action on base layer ────────────────────────────

  it("8. Verifies settlement_action fired on base layer", async function () {
    this.timeout(180_000);

    console.log("  Polling base layer for Resolved status (up to 120 s)…");
    let market: any = null;
    const deadline  = Date.now() + 120_000;

    while (Date.now() < deadline) {
      try {
        market = await program.account.market.fetch(marketPda);
        if (Object.keys(market.status)[0] !== "open") break;
      } catch (_) { /* account may be temporarily unavailable during commit */ }
      await new Promise((r) => setTimeout(r, 4_000));
    }

    assert.isNotNull(market);
    const status = Object.keys(market.status)[0];
    assert.notEqual(status, "open", "market must not still be open");
    assert.equal(status, "resolved");
    assert.isTrue(market.outcome, "YES wins (oracle > 0 = target)");
    console.log(`  resolverPrice=${market.resolverPrice} yesTotal=${market.yesTotal} noTotal=${market.noTotal}`);
  });

  // ── 9. Withdraw winnings ───────────────────────────────────────────────────

  it("9. Withdraws winnings from vault", async () => {
    const balBefore = await provider.connection.getBalance(provider.wallet.publicKey);

    const sig = await program.methods
      .withdrawWinnings()
      .accounts({
        user:          provider.wallet.publicKey,
        market:        marketPda,
        position:      positionPda,
        vault:         vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc({ commitment: "confirmed" });

    console.log("withdraw_winnings sig:", sig);

    const balAfter = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log(`  received: ${balAfter - balBefore} lamports`);

    const position = await program.account.position.fetch(positionPda);
    assert.isTrue(position.claimed, "position.claimed must be true");

    const vault = await program.account.vault.fetch(vaultPda);
    assert.isAbove(vault.totalClaimed.toNumber(), 0, "vault.totalClaimed > 0");
    console.log(`  vault.totalClaimed=${vault.totalClaimed}`);
  });
});
