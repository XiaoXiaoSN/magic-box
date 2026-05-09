#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

mod builtins;
mod compiler;
mod error;
mod lexer;
mod limits;
mod namespace;
mod ops;
mod parser;
mod units;
mod value;
mod vm;

use alloc::string::{String, ToString};

use self::builtins::default_namespace;
use self::error::Result;
use self::namespace::Namespace;

pub use self::error::Error;
pub use self::value::Value;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

// install once on module load so any future panic surfaces a real stack
// trace through console.error instead of a bare `RuntimeError: unreachable`.
// with `panic = "abort"` the wasm instance is still poisoned after a panic;
// the hook only buys us diagnosability, not recovery — see review C4/C7.
#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn __math_box_init() {
    console_error_panic_hook::set_once();
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn evaluate(input: &str) -> core::result::Result<String, String> {
    eval_to_string(input).map_err(|e| e.to_string())
}

#[cfg(not(feature = "wasm"))]
pub fn evaluate(input: &str) -> core::result::Result<String, String> {
    eval_to_string(input).map_err(|e| e.to_string())
}

// shared default namespace cached behind OnceLock — every call to
// `evaluate()` would otherwise reinsert ~50 BTreeMap entries plus
// allocate a String per name on the magic-box per-keystroke hot path.
#[cfg(feature = "std")]
fn shared_namespace() -> &'static Namespace {
    static NS: std::sync::OnceLock<Namespace> = std::sync::OnceLock::new();
    NS.get_or_init(default_namespace)
}

fn eval_to_string(input: &str) -> Result<String> {
    #[cfg(feature = "std")]
    let value = eval_with(input, shared_namespace())?;
    #[cfg(not(feature = "std"))]
    let value = {
        let ns = default_namespace();
        eval_with(input, &ns)?
    };
    Ok(value.to_display_string())
}

pub fn eval_with(input: &str, ns: &Namespace) -> Result<Value> {
    let tokens = lexer::tokenize(input)?;
    let ast = parser::parse(&tokens)?;
    let program = compiler::compile(ast, ns)?;
    let mut scope = vm::Scope::new();
    vm::run(&program, ns, &mut scope)
}
