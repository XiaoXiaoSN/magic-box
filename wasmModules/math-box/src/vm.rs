use alloc::collections::BTreeMap;
use alloc::string::String;
use alloc::vec::Vec;

use crate::compiler::{Inst, Program, UserFn};
use crate::error::{Error, Result};
use crate::namespace::Namespace;
use crate::ops;
use crate::value::Value;

const MAX_FRAME_DEPTH: usize = 32;

pub struct Scope {
    frames: Vec<BTreeMap<String, Value>>,
    user_fns: BTreeMap<String, UserFn>,
}

impl Default for Scope {
    fn default() -> Self {
        Self::new()
    }
}

impl Scope {
    pub fn new() -> Self {
        let mut s = Self { frames: Vec::with_capacity(4), user_fns: BTreeMap::new() };
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
            return Err(Error::DepthExceeded { limit: MAX_FRAME_DEPTH });
        }
        self.frames.push(BTreeMap::new());
        Ok(())
    }

    pub fn pop_frame(&mut self) {
        if self.frames.len() > 1 {
            self.frames.pop();
        }
    }

    pub fn define_fn(&mut self, name: String, f: UserFn) {
        self.user_fns.insert(name, f);
    }
}

pub fn run(program: &Program, ns: &Namespace, scope: &mut Scope) -> Result<Value> {
    let mut stack: Vec<Value> = Vec::with_capacity(16);
    exec(program, ns, scope, &mut stack)?;

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
) -> Result<()> {
    for inst in &program.code {
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
                    let split_at =
                        stack.len().checked_sub(*arity).ok_or(Error::UnexpectedEof)?;
                    let args = stack.split_off(split_at);
                    scope.push_frame()?;
                    for (p, a) in user.params.iter().zip(args) {
                        scope.set_var(p.clone(), a);
                    }
                    let mut sub_stack: Vec<Value> = Vec::with_capacity(8);
                    let res = exec(&user.body, ns, scope, &mut sub_stack);
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
                    let split_at =
                        stack.len().checked_sub(*arity).ok_or(Error::UnexpectedEof)?;
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

            Inst::Neg => unop(stack, ops::neg)?,
            Inst::Not => unop(stack, ops::logical_not)?,
            Inst::Fact => unop(stack, ops::factorial)?,
        }
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
