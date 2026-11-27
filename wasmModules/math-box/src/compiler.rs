use alloc::boxed::Box;
use alloc::collections::BTreeSet;
use alloc::string::String;
use alloc::vec::Vec;

// preserve native thread safety without atomic reference counts in the WASM VM.
#[cfg(target_arch = "wasm32")]
pub(crate) use alloc::rc::Rc as Shared;
#[cfg(not(target_arch = "wasm32"))]
pub(crate) use alloc::sync::Arc as Shared;

use crate::error::{Error, Result};
use crate::limits::WorkBudget;
use crate::namespace::Namespace;
use crate::ops;
use crate::parser::{BinOp, CmpOp, Expr};
use crate::value::Value;

#[derive(Clone, Debug)]
pub enum Inst {
    PushVal(Value),
    LoadVar(String),
    Call { name: String, arity: usize },
    StoreKeep(String),
    Drop,
    DefineFn { name: String, fn_idx: usize },
    Add,
    Sub,
    Mul,
    Div,
    Rem,
    Pow,
    Compare(CmpOp),
    JumpIfFalse(usize),
    JumpIfTrue(usize),
    RequireBool(&'static str),
    Neg,
    Not,
    Percent,
    Fact,
}

#[derive(Clone, Debug)]
pub struct UserFn {
    pub params: Vec<String>,
    pub body: Program,
}

#[derive(Clone, Debug, Default)]
pub struct Program {
    pub code: Vec<Inst>,
    pub user_fns: Vec<Shared<UserFn>>,
}

#[derive(Default)]
struct BoundNames {
    assigned: BTreeSet<String>,
    parameters: BTreeSet<String>,
}

#[derive(Clone, Copy)]
struct FoldScope<'a> {
    names: &'a BoundNames,
    local_params: Option<&'a [String]>,
}

impl FoldScope<'_> {
    fn shadows_constant(self, name: &str) -> bool {
        // Function bodies can read parameters from any active caller frame.
        self.names.assigned.contains(name)
            || (self.local_params.is_some() && self.names.parameters.contains(name))
    }

    fn shadows_function(self, name: &str) -> bool {
        self.names.assigned.contains(name)
            || self
                .local_params
                .is_some_and(|params| params.iter().any(|param| param == name))
    }
}

pub fn compile(expr: Expr, ns: &Namespace, budget: &mut WorkBudget) -> Result<Program> {
    let mut names = BoundNames::default();
    collect_bound_names(&expr, &mut names);
    let shadowed = FoldScope {
        names: &names,
        local_params: None,
    };
    compile_with(expr, ns, shadowed, budget)
}

// Top-level expressions and function bodies share the program's binding names.
// Take the expr by value so folding can move sub-expressions out of the AST.
fn compile_with(
    expr: Expr,
    ns: &Namespace,
    shadowed: FoldScope<'_>,
    budget: &mut WorkBudget,
) -> Result<Program> {
    let folded = fold(expr, ns, shadowed, budget)?;
    let mut prog = Program::default();
    lower(folded, &mut prog, ns, shadowed, budget)?;
    Ok(prog)
}

fn collect_bound_names(e: &Expr, names: &mut BoundNames) {
    match e {
        Expr::Assign { name, value } => {
            names.assigned.insert(name.clone());
            collect_bound_names(value, names);
        }
        Expr::Block(stmts) => {
            for s in stmts {
                collect_bound_names(s, names);
            }
        }
        Expr::Bin { lhs, rhs, .. } => {
            collect_bound_names(lhs, names);
            collect_bound_names(rhs, names);
        }
        Expr::Neg(x) | Expr::Pos(x) | Expr::Not(x) | Expr::Percent(x) | Expr::Fact(x) => {
            collect_bound_names(x, names);
        }
        Expr::Call { args, .. } => {
            for a in args {
                collect_bound_names(a, names);
            }
        }
        Expr::Lambda { params, body } => {
            names.parameters.extend(params.iter().cloned());
            collect_bound_names(body, names);
        }
        Expr::Num(_) | Expr::BigLit(_) | Expr::Bool(_) | Expr::Str(_) | Expr::Var(_) => {}
    }
}

fn literal_expr(value: Value) -> Option<Expr> {
    match value {
        Value::Num(value) => Some(Expr::Num(value)),
        Value::Bool(value) => Some(Expr::Bool(value)),
        #[cfg(feature = "bigint")]
        Value::Big(value) => Some(Expr::BigLit(value.to_string())),
        _ => None,
    }
}

fn literal_value(expr: &Expr) -> Option<Value> {
    match expr {
        Expr::Num(value) => Some(Value::Num(*value)),
        Expr::Bool(value) => Some(Value::Bool(*value)),
        #[cfg(feature = "bigint")]
        Expr::BigLit(text) => {
            use core::str::FromStr;
            num_bigint::BigInt::from_str(text).ok().map(Value::Big)
        }
        _ => None,
    }
}

fn fold(e: Expr, ns: &Namespace, shadowed: FoldScope<'_>, budget: &mut WorkBudget) -> Result<Expr> {
    budget.consume(1)?;
    Ok(match e {
        Expr::Num(_) => e,
        Expr::BigLit(_) => e,
        Expr::Bool(_) => e,
        Expr::Str(_) => e,

        Expr::Var(name) if !shadowed.shadows_constant(&name) => match ns.lookup_const(&name) {
            Some(Value::Num(v)) => Expr::Num(v),
            // non-numeric constants (e.g. complex `i`) cannot be folded into
            // an Expr::Num; leave as Var, runtime LoadVar will resolve.
            _ => Expr::Var(name),
        },
        Expr::Var(name) => Expr::Var(name),

        Expr::Bin { op, lhs, rhs } if matches!(op, BinOp::And | BinOp::Or) => {
            let l = fold(*lhs, ns, shadowed, budget)?;
            let Some(left) = (match l {
                Expr::Bool(value) => Some(value),
                _ => None,
            }) else {
                return Ok(Expr::Bin {
                    op,
                    lhs: Box::new(l),
                    rhs,
                });
            };
            if (matches!(op, BinOp::And) && !left) || (matches!(op, BinOp::Or) && left) {
                return Ok(Expr::Bool(left));
            }
            let r = fold(*rhs, ns, shadowed, budget)?;
            if let Expr::Bool(right) = r {
                return Ok(Expr::Bool(match op {
                    BinOp::And => left && right,
                    BinOp::Or => left || right,
                    _ => unreachable!(),
                }));
            }
            Expr::Bin {
                op,
                lhs: Box::new(Expr::Bool(left)),
                rhs: Box::new(r),
            }
        }
        Expr::Bin { op, lhs, rhs } => {
            let l = fold(*lhs, ns, shadowed, budget)?;
            let r = fold(*rhs, ns, shadowed, budget)?;
            if let (Expr::Num(a), Expr::Num(b)) = (&l, &r) {
                let folded = match op {
                    BinOp::Add => ops::add(Value::Num(*a), Value::Num(*b)),
                    BinOp::Sub => ops::sub(Value::Num(*a), Value::Num(*b)),
                    BinOp::Mul => ops::mul(Value::Num(*a), Value::Num(*b)),
                    BinOp::Div => ops::div(Value::Num(*a), Value::Num(*b)),
                    BinOp::Rem => ops::rem(Value::Num(*a), Value::Num(*b)),
                    BinOp::Pow => ops::pow(Value::Num(*a), Value::Num(*b)),
                    BinOp::Compare(_) | BinOp::And | BinOp::Or => {
                        return Ok(Expr::Bin {
                            op,
                            lhs: Box::new(l),
                            rhs: Box::new(r),
                        });
                    }
                };
                if let Ok(value) = folded
                    && let Some(expr) = literal_expr(value)
                {
                    return Ok(expr);
                }
            }
            Expr::Bin {
                op,
                lhs: Box::new(l),
                rhs: Box::new(r),
            }
        }

        Expr::Neg(x) => {
            let x = fold(*x, ns, shadowed, budget)?;
            if let Expr::Num(n) = x {
                return Ok(Expr::Num(-n));
            }
            Expr::Neg(Box::new(x))
        }
        Expr::Pos(x) => fold(*x, ns, shadowed, budget)?,
        Expr::Not(x) => {
            let x = fold(*x, ns, shadowed, budget)?;
            if let Expr::Bool(value) = x {
                return Ok(Expr::Bool(!value));
            }
            Expr::Not(Box::new(x))
        }
        Expr::Percent(x) => {
            let x = fold(*x, ns, shadowed, budget)?;
            if let Some(value) = literal_value(&x)
                && let Ok(value) = ops::percent(value)
                && let Some(expr) = literal_expr(value)
            {
                return Ok(expr);
            }
            Expr::Percent(Box::new(x))
        }
        Expr::Fact(x) => {
            let x = fold(*x, ns, shadowed, budget)?;
            if let Expr::Num(n) = x
                && let Some(expr) = literal_expr(ops::factorial(Value::Num(n))?)
            {
                return Ok(expr);
            }
            Expr::Fact(Box::new(x))
        }

        Expr::Call { name, args } => {
            let mut folded = Vec::with_capacity(args.len());
            for a in args {
                folded.push(fold(a, ns, shadowed, budget)?);
            }

            if !shadowed.shadows_function(&name)
                && let Some(entry) = ns.lookup_fn(&name)
                && entry.pure
            {
                let mut nums: Vec<Value> = Vec::with_capacity(folded.len());
                let mut all_literal = true;
                for arg in &folded {
                    match arg {
                        Expr::Num(n) => nums.push(Value::Num(*n)),
                        _ => {
                            all_literal = false;
                            break;
                        }
                    }
                }
                if all_literal
                    && entry.arity.accepts(nums.len())
                    && let Ok(value) = (entry.call)(&nums)
                {
                    value.check_numeric_limits()?;
                    if let Some(expr) = literal_expr(value) {
                        return Ok(expr);
                    }
                }
            }
            Expr::Call { name, args: folded }
        }

        Expr::Assign { name, value } => Expr::Assign {
            name,
            value: Box::new(fold(*value, ns, shadowed, budget)?),
        },
        Expr::Block(stmts) => {
            let mut out = Vec::with_capacity(stmts.len());
            for s in stmts {
                out.push(fold(s, ns, shadowed, budget)?);
            }
            Expr::Block(out)
        }
        Expr::Lambda { params, body } => Expr::Lambda { params, body },
    })
}

fn lower(
    e: Expr,
    prog: &mut Program,
    ns: &Namespace,
    shadowed: FoldScope<'_>,
    budget: &mut WorkBudget,
) -> Result<()> {
    budget.consume(1)?;
    match e {
        Expr::Num(n) => prog.code.push(Inst::PushVal(Value::Num(n))),
        Expr::Bool(value) => prog.code.push(Inst::PushVal(Value::Bool(value))),
        Expr::BigLit(text) => {
            #[cfg(feature = "bigint")]
            {
                use core::str::FromStr;
                let v = num_bigint::BigInt::from_str(&text)
                    .map_err(|_| Error::InvalidNumber { text, pos: 0 })?;
                prog.code.push(Inst::PushVal(Value::Big(v)));
            }
            #[cfg(not(feature = "bigint"))]
            {
                let n: f64 = text
                    .parse()
                    .map_err(|_| Error::InvalidNumber { text, pos: 0 })?;
                prog.code.push(Inst::PushVal(Value::Num(n)));
            }
        }
        Expr::Str(s) => prog.code.push(Inst::PushVal(Value::Str(s))),
        Expr::Var(name) => prog.code.push(Inst::LoadVar(name)),
        Expr::Bin { op, lhs, rhs } => match op {
            BinOp::And => {
                lower(*lhs, prog, ns, shadowed, budget)?;
                let jump = prog.code.len();
                prog.code.push(Inst::JumpIfFalse(usize::MAX));
                prog.code.push(Inst::Drop);
                lower(*rhs, prog, ns, shadowed, budget)?;
                prog.code.push(Inst::RequireBool("&&"));
                let target = prog.code.len();
                prog.code[jump] = Inst::JumpIfFalse(target);
            }
            BinOp::Or => {
                lower(*lhs, prog, ns, shadowed, budget)?;
                let jump = prog.code.len();
                prog.code.push(Inst::JumpIfTrue(usize::MAX));
                prog.code.push(Inst::Drop);
                lower(*rhs, prog, ns, shadowed, budget)?;
                prog.code.push(Inst::RequireBool("||"));
                let target = prog.code.len();
                prog.code[jump] = Inst::JumpIfTrue(target);
            }
            _ => {
                lower(*lhs, prog, ns, shadowed, budget)?;
                lower(*rhs, prog, ns, shadowed, budget)?;
                prog.code.push(match op {
                    BinOp::Add => Inst::Add,
                    BinOp::Sub => Inst::Sub,
                    BinOp::Mul => Inst::Mul,
                    BinOp::Div => Inst::Div,
                    BinOp::Rem => Inst::Rem,
                    BinOp::Pow => Inst::Pow,
                    BinOp::Compare(op) => Inst::Compare(op),
                    BinOp::And | BinOp::Or => unreachable!(),
                });
            }
        },
        Expr::Neg(x) => {
            lower(*x, prog, ns, shadowed, budget)?;
            prog.code.push(Inst::Neg);
        }
        Expr::Pos(x) => lower(*x, prog, ns, shadowed, budget)?,
        Expr::Not(x) => {
            lower(*x, prog, ns, shadowed, budget)?;
            prog.code.push(Inst::Not);
        }
        Expr::Percent(x) => {
            lower(*x, prog, ns, shadowed, budget)?;
            prog.code.push(Inst::Percent);
        }
        Expr::Fact(x) => {
            lower(*x, prog, ns, shadowed, budget)?;
            prog.code.push(Inst::Fact);
        }
        Expr::Call { name, args } => {
            let arity = args.len();
            for a in args {
                lower(a, prog, ns, shadowed, budget)?;
            }
            prog.code.push(Inst::Call { name, arity });
        }
        Expr::Assign { name, value } => {
            if let Expr::Lambda { params, body } = *value {
                let body_scope = FoldScope {
                    local_params: Some(&params),
                    ..shadowed
                };
                let body_prog = compile_with(*body, ns, body_scope, budget)?;
                let fn_idx = prog.user_fns.len();
                let param_count = params.len();
                prog.user_fns.push(Shared::new(UserFn {
                    params,
                    body: body_prog,
                }));
                let sentinel = alloc::format!("<fn {name}/{param_count}>");
                prog.code.push(Inst::DefineFn { name, fn_idx });
                // function definitions are statements; retain a distinct value
                // kind so a user string cannot be mistaken for a function.
                prog.code.push(Inst::PushVal(Value::Function(sentinel)));
            } else {
                lower(*value, prog, ns, shadowed, budget)?;
                prog.code.push(Inst::StoreKeep(name));
            }
        }
        Expr::Block(stmts) => {
            if stmts.is_empty() {
                prog.code.push(Inst::PushVal(Value::Num(0.0)));
                return Ok(());
            }
            let last = stmts.len() - 1;
            for (i, s) in stmts.into_iter().enumerate() {
                lower(s, prog, ns, shadowed, budget)?;
                if i != last {
                    prog.code.push(Inst::Drop);
                }
            }
        }
        Expr::Lambda { .. } => {
            return Err(Error::UnexpectedToken {
                what: "lambda must appear in `name(params) = body` form",
                pos: 0,
            });
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{builtins::default_namespace, lexer, parser};
    use core::f64::consts::{E, TAU};

    #[test]
    fn folds_constants_unaffected_by_caller_parameters() {
        let input = "f() = 2 * pi; g(e) = f() + e; 2 * e";
        let tokens = lexer::tokenize(input).expect("tokenize");
        let expr = parser::parse(&tokens).expect("parse");
        let program = compile(expr, &default_namespace(), &mut WorkBudget::new()).expect("compile");

        assert!(matches!(
            program.user_fns[0].body.code.as_slice(),
            [Inst::PushVal(Value::Num(value))] if *value == TAU
        ));
        assert!(matches!(
            program.code.last(),
            Some(Inst::PushVal(Value::Num(value))) if *value == 2.0 * E
        ));
    }
}
