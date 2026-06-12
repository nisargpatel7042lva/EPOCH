use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub mod errors;
pub mod state;

use state::*;

declare_id!("11111111111111111111111111111111");

#[ephemeral]
#[program]
pub mod epoch {
    use super::*;
    // Instructions will be added in Phase 2
}
