use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::action;

use crate::errors::EpochError;
use crate::instructions::events::MarketResolved;
use crate::state::{Market, MarketStatus, Vault};

#[action]
#[derive(Accounts)]
pub struct SettlementAction<'info> {
    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        seeds = [b"vault", market.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
}

pub fn handler(
    ctx: Context<SettlementAction>,
    yes_total: u64,
    no_total: u64,
    resolver_price: i64,
    outcome: bool,
) -> Result<()> {
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        EpochError::AlreadySettled
    );

    ctx.accounts.market.yes_total = yes_total;
    ctx.accounts.market.no_total = no_total;
    ctx.accounts.market.resolver_price = resolver_price;
    ctx.accounts.market.outcome = Some(outcome);
    ctx.accounts.market.status = MarketStatus::Resolved;

    emit!(MarketResolved {
        market_id: ctx.accounts.market.market_id,
        outcome,
        resolver_price,
        yes_total,
        no_total,
    });

    Ok(())
}
