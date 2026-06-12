use anchor_lang::prelude::*;

use crate::errors::EpochError;
use crate::state::{Market, MarketStatus, Position, Vault};

#[derive(Accounts)]
pub struct WithdrawWinnings<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawWinnings>) -> Result<()> {
    let market = &ctx.accounts.market;
    let position = &ctx.accounts.position;

    require!(
        market.status == MarketStatus::Resolved || market.status == MarketStatus::Expired,
        EpochError::MarketNotExpired
    );
    require!(!position.claimed, EpochError::AlreadySettled);

    let payout = match market.status {
        MarketStatus::Resolved => {
            let outcome = market.outcome.ok_or(EpochError::AlreadySettled)?;
            let user_winning_amount = position.winning_amount(outcome);
            require!(user_winning_amount > 0, EpochError::NoWinningPosition);

            let total_pool = market.total_pool();
            let winning_side_total = if outcome {
                market.yes_total
            } else {
                market.no_total
            };
            require!(winning_side_total > 0, EpochError::NoWinningPosition);

            // payout = user_winning_amount * total_pool * 98 / (winning_side_total * 100)
            let numerator = (user_winning_amount as u128)
                .checked_mul(total_pool as u128)
                .ok_or(EpochError::Overflow)?
                .checked_mul(98)
                .ok_or(EpochError::Overflow)?;
            let denominator = (winning_side_total as u128)
                .checked_mul(100)
                .ok_or(EpochError::Overflow)?;
            numerator
                .checked_div(denominator)
                .ok_or(EpochError::Overflow)? as u64
        }
        MarketStatus::Expired => {
            // Return full deposit; no protocol fee on expired markets
            position.yes_amount + position.no_amount
        }
        MarketStatus::Open => return Err(EpochError::MarketNotExpired.into()),
    };

    ctx.accounts.position.claimed = true;
    ctx.accounts.vault.total_claimed = ctx
        .accounts
        .vault
        .total_claimed
        .checked_add(payout)
        .ok_or(EpochError::Overflow)?;

    // Transfer payout from vault (program-owned PDA) to user via direct lamport manipulation
    **ctx
        .accounts
        .vault
        .to_account_info()
        .try_borrow_mut_lamports()? -= payout;
    **ctx
        .accounts
        .user
        .to_account_info()
        .try_borrow_mut_lamports()? += payout;

    Ok(())
}
