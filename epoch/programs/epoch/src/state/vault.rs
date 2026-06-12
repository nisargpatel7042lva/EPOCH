use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub market: Pubkey,
    pub total_deposited: u64,
    pub total_claimed: u64,
    pub bump: u8,
}

impl Vault {
    pub fn available_balance(&self) -> u64 {
        self.total_deposited.saturating_sub(self.total_claimed)
    }

    pub fn space() -> usize {
        8   // discriminator
        + 32  // market
        + 8   // total_deposited
        + 8   // total_claimed
        + 1   // bump
    }
}
