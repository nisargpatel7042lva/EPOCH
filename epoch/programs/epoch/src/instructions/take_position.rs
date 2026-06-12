use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::AccountsExit;
use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::{FoldableIntentBuilder, MagicIntentBundleBuilder};

use crate::errors::EpochError;
use crate::state::{Market, MarketStatus, Position, Vault};

#[commit]
#[derive(Accounts)]
pub struct TakePosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        init_if_needed,
        payer = user,
        space = Position::space(),
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TakePosition>, yes_amount: u64, no_amount: u64) -> Result<()> {
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        EpochError::MarketNotOpen
    );
    require!(
        !ctx.accounts.market.is_expired(Clock::get()?.unix_timestamp),
        EpochError::MarketExpired
    );
    let total = yes_amount
        .checked_add(no_amount)
        .ok_or(EpochError::Overflow)?;
    require!(total >= 10_000, EpochError::InsufficientAmount);

    // Transfer total deposit from user to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        total,
    )?;

    // Initialise position fields (safe to always set — seeds guarantee the user/market match)
    ctx.accounts.position.user = ctx.accounts.user.key();
    ctx.accounts.position.market = ctx.accounts.market.key();
    ctx.accounts.position.bump = ctx.bumps.position;
    ctx.accounts.position.yes_amount = ctx.accounts.position.yes_amount
        .checked_add(yes_amount)
        .ok_or(EpochError::Overflow)?;
    ctx.accounts.position.no_amount = ctx.accounts.position.no_amount
        .checked_add(no_amount)
        .ok_or(EpochError::Overflow)?;

    // Update market totals
    ctx.accounts.market.yes_total = ctx.accounts.market.yes_total
        .checked_add(yes_amount)
        .ok_or(EpochError::Overflow)?;
    ctx.accounts.market.no_total = ctx.accounts.market.no_total
        .checked_add(no_amount)
        .ok_or(EpochError::Overflow)?;

    // Update vault accounting
    ctx.accounts.vault.total_deposited = ctx.accounts.vault.total_deposited
        .checked_add(total)
        .ok_or(EpochError::Overflow)?;

    // Flush account data to buffer before the commit CPI reads it
    ctx.accounts.market.exit(&crate::ID)?;

    msg!(
        "position_taken:{}:{}:{}:{}:{}:{}",
        ctx.accounts.market.market_id,
        ctx.accounts.user.key(),
        yes_amount,
        no_amount,
        ctx.accounts.market.yes_total,
        ctx.accounts.market.no_total,
    );

    MagicIntentBundleBuilder::new(
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    .commit(&[ctx.accounts.market.to_account_info()])
    .build_and_invoke()?;

    Ok(())
}
