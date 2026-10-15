use crate::error::{Error, Result};

// hard caps to bound work done on untrusted browser input.
pub const MAX_INPUT_LEN: usize = 4096;
pub const MAX_DEPTH: usize = 32;
pub const MAX_TOKENS: usize = 4096;
pub const MAX_CALL_ARITY: usize = 32;
pub const MAX_AST_HEIGHT: usize = 256;
pub const MAX_EVAL_STEPS: usize = 10_000;
pub const MAX_NUMERIC_BITS: usize = 16_384;
pub const MAX_DISPLAY_LEN: usize = 4096;

pub struct WorkBudget {
    remaining: usize,
}

impl WorkBudget {
    pub const fn new() -> Self {
        Self {
            remaining: MAX_EVAL_STEPS,
        }
    }

    pub fn consume(&mut self, steps: usize) -> Result<()> {
        if steps > self.remaining {
            return Err(Error::LimitExceeded {
                what: "evaluation steps",
                limit: MAX_EVAL_STEPS,
            });
        }
        self.remaining -= steps;
        Ok(())
    }
}
