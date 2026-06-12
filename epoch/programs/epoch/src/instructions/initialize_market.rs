use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::EpochError;
use crate::instructions::events::MarketCreated;
use crate::state::{Market, MarketStatus, Vault};

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = Market::space(),
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        space = Vault::space(),
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeMarket>,
    market_id: u64,
    question: String,
    asset: String,
    target_price: i64,
    direction: u8,
    expiry_ts: i64,
    initial_deposit_lamports: u64,
) -> Result<()> {
    require!(question.len() <= 100, EpochError::QuestionTooLong);
    require!(direction == 0 || direction == 1, EpochError::InvalidDirection);
    require!(expiry_ts > Clock::get()?.unix_timestamp, EpochError::ExpiryInPast);
    require!(initial_deposit_lamports >= 10_000, EpochError::BelowMinimumDeposit);

    let market_key = ctx.accounts.market.key();

    ctx.accounts.market.market_id = market_id;
    ctx.accounts.market.creator = ctx.accounts.creator.key();
    ctx.accounts.market.question = question.clone();
    ctx.accounts.market.asset = asset.clone();
    ctx.accounts.market.target_price = target_price;
    ctx.accounts.market.direction = direction;
    ctx.accounts.market.expiry_ts = expiry_ts;
    ctx.accounts.market.yes_total = 0;
    ctx.accounts.market.no_total = 0;
    ctx.accounts.market.status = MarketStatus::Open;
    ctx.accounts.market.outcome = None;
    ctx.accounts.market.resolver_price = 0;
    ctx.accounts.market.bump = ctx.bumps.market;

    ctx.accounts.vault.market = market_key;
    ctx.accounts.vault.total_deposited = initial_deposit_lamports;
    ctx.accounts.vault.total_claimed = 0;
    ctx.accounts.vault.bump = ctx.bumps.vault;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        initial_deposit_lamports,
    )?;

    emit!(MarketCreated {
        market_id,
        creator: ctx.accounts.creator.key(),
        question,
        asset,
        target_price,
        direction,
        expiry_ts,
    });

    Ok(())
}
