use anchor_lang::prelude::*;
use anchor_lang::AccountsExit;
use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::{FoldableIntentBuilder, MagicIntentBundleBuilder};

use crate::errors::EpochError;
use crate::state::{Market, MarketStatus, Position};

#[commit]
#[derive(Accounts)]
pub struct AdjustPosition<'info> {
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

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AdjustPosition>, add_yes: u64, add_no: u64) -> Result<()> {
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        EpochError::MarketNotOpen
    );
    require!(
        !ctx.accounts.market.is_expired(Clock::get()?.unix_timestamp),
        EpochError::MarketExpired
    );

    if add_yes > 0 {
        ctx.accounts.position.yes_amount = ctx.accounts.position.yes_amount
            .checked_add(add_yes)
            .ok_or(EpochError::Overflow)?;
        ctx.accounts.market.yes_total = ctx.accounts.market.yes_total
            .checked_add(add_yes)
            .ok_or(EpochError::Overflow)?;
    }

    if add_no > 0 {
        ctx.accounts.position.no_amount = ctx.accounts.position.no_amount
            .checked_add(add_no)
            .ok_or(EpochError::Overflow)?;
        ctx.accounts.market.no_total = ctx.accounts.market.no_total
            .checked_add(add_no)
            .ok_or(EpochError::Overflow)?;
    }

    ctx.accounts.market.exit(&crate::ID)?;

    MagicIntentBundleBuilder::new(
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    .commit(&[
        ctx.accounts.market.to_account_info(),
        ctx.accounts.position.to_account_info(),
    ])
    .build_and_invoke()?;

    Ok(())
}
