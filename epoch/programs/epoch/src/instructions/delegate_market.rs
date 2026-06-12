use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

#[delegate]
#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct DelegateMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Market PDA to be delegated to the Ephemeral Rollup
    #[account(
        mut,
        del,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: AccountInfo<'info>,
}

pub fn handler(ctx: Context<DelegateMarket>, market_id: u64) -> Result<()> {
    let validator_key = ctx.remaining_accounts.first().map(|a| a.key());

    let config = match validator_key {
        Some(key) => DelegateConfig {
            validator: Some(key),
            ..DelegateConfig::default()
        },
        None => DelegateConfig::default(),
    };

    let market_id_bytes = market_id.to_le_bytes();
    ctx.accounts.delegate_market(
        &ctx.accounts.payer,
        &[b"market", market_id_bytes.as_ref()],
        config,
    )?;

    Ok(())
}
