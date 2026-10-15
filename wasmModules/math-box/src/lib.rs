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
use self::limits::{MAX_DISPLAY_LEN, WorkBudget};
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

#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub struct TypedResult {
    kind: String,
    text: String,
    exact: bool,
    finite: bool,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl TypedResult {
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter))]
    pub fn kind(&self) -> String {
        self.kind.clone()
    }

    #[cfg_attr(feature = "wasm", wasm_bindgen(getter))]
    pub fn text(&self) -> String {
        self.text.clone()
    }

    #[cfg_attr(feature = "wasm", wasm_bindgen(getter))]
    pub fn exact(&self) -> bool {
        self.exact
    }

    #[cfg_attr(feature = "wasm", wasm_bindgen(getter))]
    pub fn finite(&self) -> bool {
        self.finite
    }
}

impl TypedResult {
    fn from_value(value: &Value) -> Self {
        let (kind, exact, finite) = match value {
            Value::Num(value) => ("num", false, value.is_finite()),
            Value::Bool(_) => ("bool", false, true),
            Value::Str(value) => (
                if value.starts_with("<fn ") {
                    "function"
                } else {
                    "string"
                },
                false,
                true,
            ),
            #[cfg(feature = "bigint")]
            Value::Big(_) => ("big", true, true),
            #[cfg(feature = "fraction")]
            Value::Frac(_) => ("fraction", true, true),
            #[cfg(feature = "complex")]
            Value::Complex(value) => (
                "complex",
                false,
                value.re.is_finite() && value.im.is_finite(),
            ),
            #[cfg(feature = "unit")]
            Value::Unit(value) => ("unit", false, value.base_value.is_finite()),
        };
        Self {
            kind: kind.into(),
            text: value.to_display_string(),
            exact,
            finite,
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub struct Compiled {
    program: compiler::Program,
}

impl Compiled {
    fn evaluate_value(&self) -> Result<Value> {
        #[cfg(feature = "std")]
        {
            run_compiled(&self.program, shared_namespace())
        }
        #[cfg(not(feature = "std"))]
        {
            let namespace = default_namespace();
            run_compiled(&self.program, &namespace)
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Compiled {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new(input: &str) -> core::result::Result<Self, String> {
        compile_input(input)
            .map(|program| Self { program })
            .map_err(|e| e.to_string())
    }

    pub fn evaluate(&self) -> core::result::Result<String, String> {
        let value = self.evaluate_value().map_err(|e| e.to_string())?;
        check_display_limit(&value).map_err(|e| e.to_string())?;
        Ok(value.to_display_string())
    }

    pub fn evaluate_typed(&self) -> core::result::Result<TypedResult, String> {
        let value = self.evaluate_value().map_err(|e| e.to_string())?;
        check_display_limit(&value).map_err(|e| e.to_string())?;
        Ok(TypedResult::from_value(&value))
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub fn evaluate_typed(input: &str) -> core::result::Result<TypedResult, String> {
    evaluate_typed_native(input).map_err(|e| e.to_string())
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
    let value = eval_value(input)?;
    check_display_limit(&value)?;
    Ok(value.to_display_string())
}

fn evaluate_typed_native(input: &str) -> Result<TypedResult> {
    let value = eval_value(input)?;
    check_display_limit(&value)?;
    Ok(TypedResult::from_value(&value))
}

fn eval_value(input: &str) -> Result<Value> {
    #[cfg(feature = "std")]
    {
        eval_with(input, shared_namespace())
    }
    #[cfg(not(feature = "std"))]
    {
        let namespace = default_namespace();
        eval_with(input, &namespace)
    }
}

fn check_display_limit(value: &Value) -> Result<()> {
    if value.display_len_upper_bound() > MAX_DISPLAY_LEN {
        return Err(Error::LimitExceeded {
            what: "display length",
            limit: MAX_DISPLAY_LEN,
        });
    }
    Ok(())
}

fn compile_input(input: &str) -> Result<compiler::Program> {
    let tokens = lexer::tokenize(input)?;
    let ast = parser::parse(&tokens)?;
    let mut budget = WorkBudget::new();
    #[cfg(feature = "std")]
    {
        compiler::compile(ast, shared_namespace(), &mut budget)
    }
    #[cfg(not(feature = "std"))]
    {
        let namespace = default_namespace();
        compiler::compile(ast, &namespace, &mut budget)
    }
}

fn run_compiled(program: &compiler::Program, ns: &Namespace) -> Result<Value> {
    let mut budget = WorkBudget::new();
    let mut scope = vm::Scope::new();
    vm::run(program, ns, &mut scope, &mut budget)
}

pub fn eval_with(input: &str, ns: &Namespace) -> Result<Value> {
    let tokens = lexer::tokenize(input)?;
    let ast = parser::parse(&tokens)?;
    let mut budget = WorkBudget::new();
    let program = compiler::compile(ast, ns, &mut budget)?;
    let mut scope = vm::Scope::new();
    vm::run(&program, ns, &mut scope, &mut budget)
}
