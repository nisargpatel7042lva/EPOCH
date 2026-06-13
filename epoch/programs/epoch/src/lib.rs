use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("C6nt5YvgdgNKETYgHQF9Dm8XQdAreU3n5Pk4CHmrQVvu");

#[ephemeral]
#[program]
pub mod epoch {
    use super::*;

    // ── Base layer ──────────────────────────────────────────────────────────

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: u64,
        question: String,
        asset: String,
        target_price: i64,
        direction: u8,
        expiry_ts: i64,
        initial_deposit_lamports: u64,
    ) -> Result<()> {
        instructions::initialize_market::handler(
            ctx,
            market_id,
            question,
            asset,
            target_price,
            direction,
            expiry_ts,
            initial_deposit_lamports,
        )
    }

    pub fn delegate_market(ctx: Context<DelegateMarket>, market_id: u64) -> Result<()> {
        instructions::delegate_market::handler(ctx, market_id)
    }

    pub fn initialize_position(ctx: Context<InitializePosition>) -> Result<()> {
        instructions::initialize_position::handler(ctx)
    }

    pub fn delegate_position(ctx: Context<DelegatePosition>) -> Result<()> {
        instructions::delegate_position::handler(ctx)
    }

    pub fn withdraw_winnings(ctx: Context<WithdrawWinnings>) -> Result<()> {
        instructions::withdraw_winnings::handler(ctx)
    }

    pub fn settlement_action(
        ctx: Context<SettlementAction>,
        yes_total: u64,
        no_total: u64,
        resolver_price: i64,
        outcome: bool,
    ) -> Result<()> {
        instructions::settlement_action::handler(ctx, yes_total, no_total, resolver_price, outcome)
    }

    // ── Ephemeral Rollup ────────────────────────────────────────────────────

    pub fn take_position(
        ctx: Context<TakePosition>,
        yes_amount: u64,
        no_amount: u64,
    ) -> Result<()> {
        instructions::take_position::handler(ctx, yes_amount, no_amount)
    }

    pub fn adjust_position(
        ctx: Context<AdjustPosition>,
        add_yes: u64,
        add_no: u64,
    ) -> Result<()> {
        instructions::adjust_position::handler(ctx, add_yes, add_no)
    }

    pub fn commit_and_settle<'info>(ctx: Context<'info, CommitAndSettle<'info>>) -> Result<()> {
        instructions::commit_and_settle::handler(ctx)
    }
}
