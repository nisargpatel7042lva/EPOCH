pub mod delegate_market;
pub mod events;
pub mod initialize_market;
pub mod settlement_action;
pub mod withdraw_winnings;

// Glob re-exports are required so Anchor's #[program] macro can resolve the
// generated __client_accounts_* types at the crate root.
// The `handler` name collision is harmless — handlers are always called via
// their full module path (instructions::foo::handler).
#[allow(ambiguous_glob_reexports)]
pub use delegate_market::*;
pub use events::*;
#[allow(ambiguous_glob_reexports)]
pub use initialize_market::*;
#[allow(ambiguous_glob_reexports)]
pub use settlement_action::*;
#[allow(ambiguous_glob_reexports)]
pub use withdraw_winnings::*;
