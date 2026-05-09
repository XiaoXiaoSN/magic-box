use alloc::boxed::Box;
use alloc::collections::BTreeSet;
use alloc::string::String;
use alloc::vec::Vec;

use crate::error::{Error, Result};
use crate::namespace::Namespace;
use crate::parser::{BinOp, Expr};
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
    Neg,
    Not,
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
    pub user_fns: Vec<UserFn>,
}

pub fn compile(expr: Expr, ns: &Namespace) -> Result<Program> {
    let mut shadowed = BTreeSet::new();
    collect_user_fn_names(&expr, &mut shadowed);
    compile_with(expr, ns, &shadowed)
}

// shared compile path used by both top-level entry and recursive lambda body
// compilation. callers thread the outer shadow set so that a body's inner
// `compile` pass cannot fold a call that the program redefined. expr is
// taken by value so fold can move sub-expressions out of the AST without
// re-cloning the tree at the entry point.
fn compile_with(expr: Expr, ns: &Namespace, shadowed: &BTreeSet<String>) -> Result<Program> {
    let folded = fold(expr, ns, shadowed)?;
    let mut prog = Program::default();
    lower(&folded, &mut prog, ns, shadowed)?;
    Ok(prog)
}

fn collect_user_fn_names(e: &Expr, set: &mut BTreeSet<String>) {
    match e {
        Expr::Assign { name, value } => {
            if matches!(value.as_ref(), Expr::Lambda { .. }) {
                set.insert(name.clone());
            }
            collect_user_fn_names(value, set);
        }
        Expr::Block(stmts) => {
            for s in stmts {
                collect_user_fn_names(s, set);
            }
        }
        Expr::Bin { lhs, rhs, .. } => {
            collect_user_fn_names(lhs, set);
            collect_user_fn_names(rhs, set);
        }
        Expr::Neg(x) | Expr::Pos(x) | Expr::Not(x) | Expr::Fact(x) => {
            collect_user_fn_names(x, set);
        }
        Expr::Call { args, .. } => {
            for a in args {
                collect_user_fn_names(a, set);
            }
        }
        Expr::Lambda { body, .. } => collect_user_fn_names(body, set),
        Expr::Num(_) | Expr::BigLit(_) | Expr::Str(_) | Expr::Var(_) => {}
    }
}

fn fold(e: Expr, ns: &Namespace, shadowed: &BTreeSet<String>) -> Result<Expr> {
    Ok(match e {
        Expr::Num(_) => e,
        Expr::BigLit(_) => e,
        Expr::Str(_) => e,

        Expr::Var(name) => match ns.lookup_const(&name) {
            Some(Value::Num(v)) => Expr::Num(v),
            // non-numeric constants (e.g. complex `i`) cannot be folded into
            // an Expr::Num; leave as Var, runtime LoadVar will resolve.
            _ => Expr::Var(name),
        },

        Expr::Bin { op, lhs, rhs } => {
            let l = fold(*lhs, ns, shadowed)?;
            let r = fold(*rhs, ns, shadowed)?;
            if let (Expr::Num(a), Expr::Num(b)) = (&l, &r) {
                let folded = match op {
                    BinOp::Add => Some(a + b),
                    BinOp::Sub => Some(a - b),
                    BinOp::Mul => Some(a * b),
                    BinOp::Div => Some(a / b),
                    BinOp::Rem => Some(a % b),
                    BinOp::Pow => Some(a.powf(*b)),
                };
                if let Some(v) = folded {
                    return Ok(Expr::Num(v));
                }
            }
            Expr::Bin { op, lhs: Box::new(l), rhs: Box::new(r) }
        }

        Expr::Neg(x) => {
            let x = fold(*x, ns, shadowed)?;
            if let Expr::Num(n) = x {
                return Ok(Expr::Num(-n));
            }
            Expr::Neg(Box::new(x))
        }
        Expr::Pos(x) => fold(*x, ns, shadowed)?,
        Expr::Not(x) => {
            let x = fold(*x, ns, shadowed)?;
            if let Expr::Num(n) = x {
                return Ok(Expr::Num(if n == 0.0 { 1.0 } else { 0.0 }));
            }
            Expr::Not(Box::new(x))
        }
        Expr::Fact(x) => {
            let x = fold(*x, ns, shadowed)?;
            if let Expr::Num(n) = x {
                return Ok(Expr::Num(crate::builtins::factorial_f64(n)?));
            }
            Expr::Fact(Box::new(x))
        }

        Expr::Call { name, args } => {
            let mut folded = Vec::with_capacity(args.len());
            for a in args {
                folded.push(fold(a, ns, shadowed)?);
            }

            if !shadowed.contains(&name)
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
                    && let Ok(Value::Num(v)) = (entry.call)(&nums)
                {
                    return Ok(Expr::Num(v));
                }
            }
            Expr::Call { name, args: folded }
        }

        Expr::Assign { name, value } => {
            Expr::Assign { name, value: Box::new(fold(*value, ns, shadowed)?) }
        }
        Expr::Block(stmts) => {
            let mut out = Vec::with_capacity(stmts.len());
            for s in stmts {
                out.push(fold(s, ns, shadowed)?);
            }
            Expr::Block(out)
        }
        Expr::Lambda { params, body } => Expr::Lambda { params, body },
    })
}

fn lower(e: &Expr, prog: &mut Program, ns: &Namespace, shadowed: &BTreeSet<String>) -> Result<()> {
    match e {
        Expr::Num(n) => prog.code.push(Inst::PushVal(Value::Num(*n))),
        Expr::BigLit(text) => {
            #[cfg(feature = "bigint")]
            {
                use core::str::FromStr;
                let v = num_bigint::BigInt::from_str(text)
                    .map_err(|_| Error::InvalidNumber { text: text.clone(), pos: 0 })?;
                prog.code.push(Inst::PushVal(Value::Big(v)));
            }
            #[cfg(not(feature = "bigint"))]
            {
                let n: f64 = text
                    .parse()
                    .map_err(|_| Error::InvalidNumber { text: text.clone(), pos: 0 })?;
                prog.code.push(Inst::PushVal(Value::Num(n)));
            }
        }
        Expr::Str(s) => prog.code.push(Inst::PushVal(Value::Str(s.clone()))),
        Expr::Var(name) => prog.code.push(Inst::LoadVar(name.clone())),
        Expr::Bin { op, lhs, rhs } => {
            lower(lhs, prog, ns, shadowed)?;
            lower(rhs, prog, ns, shadowed)?;
            prog.code.push(match op {
                BinOp::Add => Inst::Add,
                BinOp::Sub => Inst::Sub,
                BinOp::Mul => Inst::Mul,
                BinOp::Div => Inst::Div,
                BinOp::Rem => Inst::Rem,
                BinOp::Pow => Inst::Pow,
            });
        }
        Expr::Neg(x) => {
            lower(x, prog, ns, shadowed)?;
            prog.code.push(Inst::Neg);
        }
        Expr::Pos(x) => lower(x, prog, ns, shadowed)?,
        Expr::Not(x) => {
            lower(x, prog, ns, shadowed)?;
            prog.code.push(Inst::Not);
        }
        Expr::Fact(x) => {
            lower(x, prog, ns, shadowed)?;
            prog.code.push(Inst::Fact);
        }
        Expr::Call { name, args } => {
            for a in args {
                lower(a, prog, ns, shadowed)?;
            }
            prog.code.push(Inst::Call { name: name.clone(), arity: args.len() });
        }
        Expr::Assign { name, value } => {
            if let Expr::Lambda { params, body } = value.as_ref() {
                // recurse with the *outer* shadow set so that calls inside
                // the body cannot be folded against builtins of the same
                // name as a user-defined function in the surrounding program.
                // we clone the body sub-tree because lower owns only a borrow
                // of the surrounding Assign node.
                let body_prog = compile_with((**body).clone(), ns, shadowed)?;
                let fn_idx = prog.user_fns.len();
                prog.user_fns.push(UserFn { params: params.clone(), body: body_prog });
                prog.code.push(Inst::DefineFn { name: name.clone(), fn_idx });
                // function definitions are statements; push a string sentinel so
                // the result of `f(x) = …` displays as `<fn name/arity>` rather
                // than the previous surprising `params.len()` numeric value.
                let sentinel = alloc::format!("<fn {}/{}>", name, params.len());
                prog.code.push(Inst::PushVal(Value::Str(sentinel)));
            } else {
                lower(value, prog, ns, shadowed)?;
                prog.code.push(Inst::StoreKeep(name.clone()));
            }
        }
        Expr::Block(stmts) => {
            if stmts.is_empty() {
                prog.code.push(Inst::PushVal(Value::Num(0.0)));
                return Ok(());
            }
            let last = stmts.len() - 1;
            for (i, s) in stmts.iter().enumerate() {
                lower(s, prog, ns, shadowed)?;
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
