use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

#[delegate]
#[derive(Accounts)]
pub struct DelegatePosition<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Position PDA to be delegated; market is already delegated so we
    /// accept any owner here (bypasses the Anchor ownership check on market).
    #[account(
        mut,
        del,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: AccountInfo<'info>,

    /// CHECK: Market PDA — may be owned by delegation program if already delegated.
    pub market: AccountInfo<'info>,

    pub user: Signer<'info>,
}

pub fn handler(ctx: Context<DelegatePosition>) -> Result<()> {
    let market_key = ctx.accounts.market.key();
    let user_key = ctx.accounts.user.key();
    let market_key_bytes = market_key.as_ref();
    let user_key_bytes = user_key.as_ref();

    ctx.accounts.delegate_position(
        &ctx.accounts.payer,
        &[b"position", market_key_bytes, user_key_bytes],
        DelegateConfig::default(),
    )?;
    Ok(())
}
