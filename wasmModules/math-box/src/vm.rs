use alloc::collections::BTreeMap;
use alloc::string::String;
use alloc::vec::Vec;

use crate::compiler::{Inst, Program, Shared, UserFn};
use crate::error::{Error, Result};
use crate::limits::WorkBudget;
use crate::namespace::Namespace;
use crate::ops;
use crate::value::Value;

const MAX_FRAME_DEPTH: usize = 32;

pub struct Scope {
    frames: Vec<BTreeMap<String, Value>>,
    user_fns: BTreeMap<String, Shared<UserFn>>,
}

impl Default for Scope {
    fn default() -> Self {
        Self::new()
    }
}

impl Scope {
    pub fn new() -> Self {
        let mut s = Self {
            frames: Vec::with_capacity(4),
            user_fns: BTreeMap::new(),
        };
        s.frames.push(BTreeMap::new());
        s
    }

    pub fn lookup_var(&self, name: &str) -> Option<Value> {
        for frame in self.frames.iter().rev() {
            if let Some(v) = frame.get(name) {
                return Some(v.clone());
            }
        }
        None
    }

    pub fn set_var(&mut self, name: String, value: Value) {
        let frame = self.frames.last_mut().expect("at least one frame");
        frame.insert(name, value);
    }

    pub fn push_frame(&mut self) -> Result<()> {
        if self.frames.len() >= MAX_FRAME_DEPTH {
            return Err(Error::DepthExceeded {
                limit: MAX_FRAME_DEPTH,
            });
        }
        self.frames.push(BTreeMap::new());
        Ok(())
    }

    pub fn pop_frame(&mut self) {
        if self.frames.len() > 1 {
            self.frames.pop();
        }
    }

    pub fn define_fn(&mut self, name: String, f: Shared<UserFn>) {
        self.user_fns.insert(name, f);
    }
}

pub fn run(
    program: &Program,
    ns: &Namespace,
    scope: &mut Scope,
    budget: &mut WorkBudget,
) -> Result<Value> {
    let mut stack: Vec<Value> = Vec::with_capacity(16);
    exec(program, ns, scope, &mut stack, budget)?;

    let top = stack.pop().ok_or(Error::UnexpectedEof)?;
    if !stack.is_empty() {
        return Err(Error::UnexpectedEof);
    }
    Ok(top)
}

fn exec(
    program: &Program,
    ns: &Namespace,
    scope: &mut Scope,
    stack: &mut Vec<Value>,
    budget: &mut WorkBudget,
) -> Result<()> {
    let mut pc = 0usize;
    while pc < program.code.len() {
        let inst = &program.code[pc];
        budget.consume(1)?;
        match inst {
            Inst::PushVal(v) => stack.push(v.clone()),

            Inst::LoadVar(name) => {
                if let Some(v) = scope.lookup_var(name) {
                    stack.push(v);
                } else if let Some(v) = ns.lookup_const(name) {
                    stack.push(v);
                } else {
                    return Err(Error::UnknownIdentifier { name: name.clone() });
                }
            }

            Inst::Call { name, arity } => {
                if let Some(user) = scope.user_fns.get(name).cloned() {
                    if user.params.len() != *arity {
                        return Err(Error::ArityMismatch {
                            name: name.clone(),
                            expected: user.params.len(),
                            got: *arity,
                        });
                    }
                    let split_at = stack
                        .len()
                        .checked_sub(*arity)
                        .ok_or(Error::UnexpectedEof)?;
                    let args = stack.split_off(split_at);
                    scope.push_frame()?;
                    for (p, a) in user.params.iter().zip(args) {
                        scope.set_var(p.clone(), a);
                    }
                    let mut sub_stack: Vec<Value> = Vec::with_capacity(8);
                    let res = exec(&user.body, ns, scope, &mut sub_stack, budget);
                    scope.pop_frame();
                    res?;
                    let v = sub_stack.pop().ok_or(Error::UnexpectedEof)?;
                    if !sub_stack.is_empty() {
                        return Err(Error::UnexpectedEof);
                    }
                    stack.push(v);
                } else if let Some(entry) = ns.lookup_fn(name) {
                    if !entry.arity.accepts(*arity) {
                        return Err(Error::ArityMismatch {
                            name: name.clone(),
                            expected: entry.arity.describe(),
                            got: *arity,
                        });
                    }
                    let split_at = stack
                        .len()
                        .checked_sub(*arity)
                        .ok_or(Error::UnexpectedEof)?;
                    let args = stack.split_off(split_at);
                    let v = (entry.call)(&args)?;
                    stack.push(v);
                } else {
                    return Err(Error::UnknownFunction { name: name.clone() });
                }
            }

            Inst::StoreKeep(name) => {
                let top = stack.last().ok_or(Error::UnexpectedEof)?.clone();
                scope.set_var(name.clone(), top);
            }
            Inst::Drop => {
                stack.pop().ok_or(Error::UnexpectedEof)?;
            }
            Inst::DefineFn { name, fn_idx } => {
                let user = program
                    .user_fns
                    .get(*fn_idx)
                    .ok_or(Error::UnexpectedEof)?
                    .clone();
                scope.define_fn(name.clone(), user);
            }

            Inst::Add => binop(stack, ops::add)?,
            Inst::Sub => binop(stack, ops::sub)?,
            Inst::Mul => binop(stack, ops::mul)?,
            Inst::Div => binop(stack, ops::div)?,
            Inst::Rem => binop(stack, ops::rem)?,
            Inst::Pow => binop(stack, ops::pow)?,
            Inst::Compare(op) => {
                let b = stack.pop().ok_or(Error::UnexpectedEof)?;
                let a = stack.pop().ok_or(Error::UnexpectedEof)?;
                stack.push(ops::compare(a, b, *op)?);
            }

            Inst::JumpIfFalse(target) => {
                let value = stack.last().ok_or(Error::UnexpectedEof)?;
                if !matches!(value, Value::Bool(_)) {
                    return Err(Error::TypeMismatch {
                        op: "&&",
                        lhs: value.type_name(),
                        rhs: "boolean",
                    });
                }
                if matches!(value, Value::Bool(false)) {
                    pc = *target;
                    continue;
                }
            }
            Inst::JumpIfTrue(target) => {
                let value = stack.last().ok_or(Error::UnexpectedEof)?;
                if !matches!(value, Value::Bool(_)) {
                    return Err(Error::TypeMismatch {
                        op: "||",
                        lhs: value.type_name(),
                        rhs: "boolean",
                    });
                }
                if matches!(value, Value::Bool(true)) {
                    pc = *target;
                    continue;
                }
            }
            Inst::RequireBool(op) => {
                let value = stack.last().ok_or(Error::UnexpectedEof)?;
                if !matches!(value, Value::Bool(_)) {
                    return Err(Error::TypeMismatch {
                        op,
                        lhs: value.type_name(),
                        rhs: "boolean",
                    });
                }
            }

            Inst::Neg => unop(stack, ops::neg)?,
            Inst::Not => unop(stack, ops::logical_not)?,
            Inst::Percent => unop(stack, ops::percent)?,
            Inst::Fact => unop(stack, ops::factorial)?,
        }
        pc += 1;
    }
    Ok(())
}

fn binop(stack: &mut Vec<Value>, f: fn(Value, Value) -> Result<Value>) -> Result<()> {
    let b = stack.pop().ok_or(Error::UnexpectedEof)?;
    let a = stack.pop().ok_or(Error::UnexpectedEof)?;
    stack.push(f(a, b)?);
    Ok(())
}

fn unop(stack: &mut Vec<Value>, f: fn(Value) -> Result<Value>) -> Result<()> {
    let a = stack.pop().ok_or(Error::UnexpectedEof)?;
    stack.push(f(a)?);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calls_share_compiled_function_body() {
        let function = Shared::new(UserFn {
            params: Vec::new(),
            body: Program {
                code: vec![Inst::PushVal(Value::Num(7.0))],
                user_fns: Vec::new(),
            },
        });
        let program = Program {
            code: vec![
                Inst::DefineFn {
                    name: String::from("f"),
                    fn_idx: 0,
                },
                Inst::Call {
                    name: String::from("f"),
                    arity: 0,
                },
                Inst::Drop,
                Inst::Call {
                    name: String::from("f"),
                    arity: 0,
                },
            ],
            user_fns: vec![Shared::clone(&function)],
        };
        let mut scope = Scope::new();
        let mut budget = WorkBudget::new();
        let value = run(&program, &Namespace::new(), &mut scope, &mut budget).expect("run");

        assert_eq!(value, Value::Num(7.0));
        assert!(Shared::ptr_eq(
            scope.user_fns.get("f").expect("defined function"),
            &function
        ));
    }
}
