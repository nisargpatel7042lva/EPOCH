use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum MarketStatus {
    Open,
    Resolved,
    Expired,
}

#[account]
pub struct Market {
    pub market_id: u64,
    pub creator: Pubkey,
    pub question: String,
    pub asset: String,
    pub target_price: i64,
    pub direction: u8,
    pub expiry_ts: i64,
    pub yes_total: u64,
    pub no_total: u64,
    pub status: MarketStatus,
    pub outcome: Option<bool>,
    pub resolver_price: i64,
    pub bump: u8,
}

impl Market {
    pub fn probability_yes(&self) -> f64 {
        let total = self.yes_total + self.no_total;
        if total == 0 {
            return 0.5;
        }
        self.yes_total as f64 / total as f64
    }

    pub fn total_pool(&self) -> u64 {
        self.yes_total + self.no_total
    }

    pub fn is_expired(&self, now: i64) -> bool {
        now >= self.expiry_ts
    }

    pub fn space() -> usize {
        8   // discriminator
        + 8   // market_id
        + 32  // creator
        + 4 + 100  // question (length prefix + max bytes)
        + 4 + 20   // asset (length prefix + max bytes)
        + 8   // target_price
        + 1   // direction
        + 8   // expiry_ts
        + 8   // yes_total
        + 8   // no_total
        + 1   // status (enum variant)
        + 1 + 1  // outcome: Option<bool>
        + 8   // resolver_price
        + 1   // bump
    }
}
