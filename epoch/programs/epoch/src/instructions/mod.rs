pub mod adjust_position;
pub mod commit_and_settle;
pub mod delegate_market;
pub mod delegate_position;
pub mod events;
pub mod initialize_market;
pub mod initialize_position;
pub mod settlement_action;
pub mod take_position;
pub mod withdraw_winnings;

// Glob re-exports required so Anchor's #[program] macro can resolve generated
// __client_accounts_* types at the crate root. The `handler` name collision
// across modules is harmless — handlers are always called via full module paths.
#[allow(ambiguous_glob_reexports)]
pub use adjust_position::*;
#[allow(ambiguous_glob_reexports)]
pub use commit_and_settle::*;
#[allow(ambiguous_glob_reexports)]
pub use delegate_market::*;
#[allow(ambiguous_glob_reexports)]
pub use delegate_position::*;
pub use events::*;
#[allow(ambiguous_glob_reexports)]
pub use initialize_market::*;
#[allow(ambiguous_glob_reexports)]
pub use initialize_position::*;
#[allow(ambiguous_glob_reexports)]
pub use settlement_action::*;
#[allow(ambiguous_glob_reexports)]
pub use take_position::*;
#[allow(ambiguous_glob_reexports)]
pub use withdraw_winnings::*;
