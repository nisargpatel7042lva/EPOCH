use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::{CallHandler, FoldableIntentBuilder, MagicIntentBundleBuilder};
use ephemeral_rollups_sdk::{ActionArgs, ShortAccountMeta};

use crate::errors::EpochError;
use crate::state::{Market, Vault};

#[commit]
#[derive(Accounts)]
pub struct CommitAndSettle<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

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

    /// CHECK: MagicBlock Pyth Lazer price feed; bytes [73..81] hold the i64 price (LE)
    pub oracle_feed: UncheckedAccount<'info>,
}

pub fn handler<'info>(ctx: Context<'info, CommitAndSettle<'info>>) -> Result<()> {
    let market = &ctx.accounts.market;

    // Parse oracle price from Pyth Lazer account layout
    let raw_price = {
        let data = ctx.accounts.oracle_feed.try_borrow_data()?;
        require!(data.len() >= 81, EpochError::Overflow);
        let price_bytes: [u8; 8] = data[73..81]
            .try_into()
            .map_err(|_| EpochError::Overflow)?;
        i64::from_le_bytes(price_bytes)
    };

    let outcome = match market.direction {
        0 => raw_price >= market.target_price, // ABOVE: price must close >= target
        1 => raw_price < market.target_price,  // BELOW: price must close < target
        _ => return Err(EpochError::InvalidDirection.into()),
    };

    // Encode the settlement_action instruction that will run as a Magic Action on base layer
    let instruction_data = anchor_lang::InstructionData::data(
        &crate::instruction::SettlementAction {
            yes_total: market.yes_total,
            no_total: market.no_total,
            resolver_price: raw_price,
            outcome,
        },
    );

    let action = CallHandler {
        destination_program: crate::ID,
        accounts: vec![
            ShortAccountMeta {
                pubkey: ctx.accounts.market.key(),
                is_writable: true,
            },
            ShortAccountMeta {
                pubkey: ctx.accounts.vault.key(),
                is_writable: false,
            },
        ],
        args: ActionArgs::new(instruction_data),
        escrow_authority: ctx.accounts.payer.to_account_info(),
        compute_units: 200_000,
    };

    // Build the list of accounts to commit+undelegate: market first, then any
    // position PDAs passed as remaining_accounts by the crank.
    let mut to_undelegate: Vec<AccountInfo> = vec![ctx.accounts.market.to_account_info()];
    for pos in ctx.remaining_accounts.iter() {
        to_undelegate.push(pos.clone());
    }

    MagicIntentBundleBuilder::new(
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    // Use add_post_undelegate_actions (not add_post_commit_actions) so the
    // settlement_action fires AFTER the accounts are undelegated and owned by
    // our program again — Account<'info, Market> requires our-program ownership.
    .commit_and_undelegate(&to_undelegate)
    .add_post_undelegate_actions([action])
    .build_and_invoke()?;

    Ok(())
}
