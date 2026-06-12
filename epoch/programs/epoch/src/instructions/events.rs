use anchor_lang::prelude::*;

#[event]
pub struct MarketCreated {
    pub market_id: u64,
    pub creator: Pubkey,
    pub question: String,
    pub asset: String,
    pub target_price: i64,
    pub direction: u8,
    pub expiry_ts: i64,
}

#[event]
pub struct MarketResolved {
    pub market_id: u64,
    pub outcome: bool,
    pub resolver_price: i64,
    pub yes_total: u64,
    pub no_total: u64,
}

#[event]
pub struct PositionTaken {
    pub market_id: u64,
    pub user: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub new_yes_total: u64,
    pub new_no_total: u64,
}
