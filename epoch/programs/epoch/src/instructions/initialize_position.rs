use anchor_lang::prelude::*;

use crate::state::{Market, Position};

#[derive(Accounts)]
pub struct InitializePosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = user,
        space = Position::space(),
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePosition>) -> Result<()> {
    let pos = &mut ctx.accounts.position;
    pos.user = ctx.accounts.user.key();
    pos.market = ctx.accounts.market.key();
    pos.bump = ctx.bumps.position;
    pos.yes_amount = 0;
    pos.no_amount = 0;
    pos.claimed = false;
    Ok(())
}
