use anchor_lang::prelude::*;

#[error_code]
pub enum EpochError {
    #[msg("Market is not open")]
    MarketNotOpen,
    #[msg("Market has already expired")]
    MarketExpired,
    #[msg("Market has not yet expired")]
    MarketNotExpired,
    #[msg("Insufficient position amount")]
    InsufficientAmount,
    #[msg("Invalid market direction")]
    InvalidDirection,
    #[msg("Market already settled")]
    AlreadySettled,
    #[msg("No winning position to claim")]
    NoWinningPosition,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Question too long, max 100 chars")]
    QuestionTooLong,
    #[msg("Market ID already exists")]
    MarketIdExists,
    #[msg("Expiry must be in the future")]
    ExpiryInPast,
    #[msg("Minimum deposit is 10000 lamports")]
    BelowMinimumDeposit,
}
