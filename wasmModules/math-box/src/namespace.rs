use alloc::collections::BTreeMap;
use alloc::string::String;

use crate::error::Result;
use crate::value::Value;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Arity {
    Exact(usize),
    Range { min: usize, max: usize },
}

impl Arity {
    pub fn accepts(&self, n: usize) -> bool {
        match self {
            Self::Exact(k) => n == *k,
            Self::Range { min, max } => n >= *min && n <= *max,
        }
    }

    pub fn describe(&self) -> usize {
        match self {
            Self::Exact(k) => *k,
            Self::Range { min, .. } => *min,
        }
    }
}

pub type BuiltinFn = fn(&[Value]) -> Result<Value>;

#[derive(Clone, Copy)]
pub struct FnEntry {
    pub arity: Arity,
    pub pure: bool,
    pub call: BuiltinFn,
}

#[derive(Default)]
pub struct Namespace {
    constants: BTreeMap<String, Value>,
    functions: BTreeMap<String, FnEntry>,
}

impl Namespace {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set_const(&mut self, name: impl Into<String>, value: Value) {
        self.constants.insert(name.into(), value);
    }

    pub fn set_const_num(&mut self, name: impl Into<String>, value: f64) {
        self.constants.insert(name.into(), Value::Num(value));
    }

    pub fn set_fn(
        &mut self,
        name: impl Into<String>,
        arity: Arity,
        pure: bool,
        call: BuiltinFn,
    ) {
        self.functions.insert(name.into(), FnEntry { arity, pure, call });
    }

    pub fn lookup_const(&self, name: &str) -> Option<Value> {
        self.constants.get(name).cloned()
    }

    pub fn lookup_fn(&self, name: &str) -> Option<&FnEntry> {
        self.functions.get(name)
    }
}
