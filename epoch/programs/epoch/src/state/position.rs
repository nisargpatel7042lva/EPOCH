use anchor_lang::prelude::*;

#[account]
pub struct Position {
    pub user: Pubkey,
    pub market: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl Position {
    pub fn winning_amount(&self, outcome: bool) -> u64 {
        if outcome {
            self.yes_amount
        } else {
            self.no_amount
        }
    }

    pub fn space() -> usize {
        8   // discriminator
        + 32  // user
        + 32  // market
        + 8   // yes_amount
        + 8   // no_amount
        + 1   // claimed
        + 1   // bump
    }
}
