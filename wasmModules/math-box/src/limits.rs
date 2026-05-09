// hard caps to bound work done on untrusted browser input.
// numbers chosen to comfortably fit normal ui usage while
// preventing pathological inputs from monopolising the wasm runtime.
pub const MAX_INPUT_LEN: usize = 4096;
pub const MAX_DEPTH: usize = 32;
pub const MAX_TOKENS: usize = 4096;
pub const MAX_CALL_ARITY: usize = 32;
