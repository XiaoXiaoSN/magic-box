use alloc::boxed::Box;
use alloc::string::String;
use alloc::vec::Vec;

use crate::error::{Error, Result};
use crate::lexer::{Spanned, Tok};
use crate::limits::{MAX_AST_HEIGHT, MAX_CALL_ARITY, MAX_DEPTH};

#[derive(Clone, Debug)]
pub enum Expr {
    Num(f64),
    BigLit(String),
    Str(String),
    Var(String),
    Call {
        name: String,
        args: Vec<Expr>,
    },
    Neg(Box<Expr>),
    Pos(Box<Expr>),
    Not(Box<Expr>),
    Fact(Box<Expr>),
    Bin {
        op: BinOp,
        lhs: Box<Expr>,
        rhs: Box<Expr>,
    },
    Assign {
        name: String,
        value: Box<Expr>,
    },
    Block(Vec<Expr>),
    Lambda {
        params: Vec<String>,
        body: Box<Expr>,
    },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    Rem,
    Pow,
}

pub fn parse(tokens: &[Spanned]) -> Result<Expr> {
    let mut p = Parser {
        toks: tokens,
        idx: 0,
        depth: 0,
    };
    let mut stmts = Vec::new();
    let (first, mut height) = p.parse_stmt()?;
    stmts.push(first);
    while matches!(p.peek().tok, Tok::Semicolon) {
        p.advance();
        if matches!(p.peek().tok, Tok::Eof) {
            break;
        }
        let (stmt, stmt_height) = p.parse_stmt()?;
        height = height.max(stmt_height);
        stmts.push(stmt);
    }
    if !matches!(p.peek().tok, Tok::Eof) {
        return Err(Error::UnexpectedToken {
            what: "end of input",
            pos: p.peek().pos,
        });
    }
    if stmts.len() == 1 {
        Ok(stmts.pop().expect("len==1"))
    } else {
        p.checked_ast_height(height.saturating_add(1))?;
        Ok(Expr::Block(stmts))
    }
}

struct Parser<'a> {
    toks: &'a [Spanned],
    idx: usize,
    depth: usize,
}

impl<'a> Parser<'a> {
    fn peek(&self) -> &'a Spanned {
        &self.toks[self.idx.min(self.toks.len() - 1)]
    }

    fn advance(&mut self) -> &'a Spanned {
        let t = &self.toks[self.idx];
        if self.idx + 1 < self.toks.len() {
            self.idx += 1;
        }
        t
    }

    // statement = `ident = expr`, `(p1, p2) -> expr`, or just expr.
    // assignments and lambdas are detected via lookahead on tokens after
    // the identifier/parenthesised list.
    fn parse_stmt(&mut self) -> Result<(Expr, usize)> {
        // ident = expr (assignment) — ident can be plain or function form
        // ident(p1, p2, ...) = expr (function definition sugar)
        if let Tok::Ident(_) = self.peek().tok {
            let save = self.idx;
            // try plain assign first
            if let Tok::Ident(name) = &self.toks[save].tok {
                let name = name.clone();
                if let Some(next) = self.toks.get(save + 1) {
                    if matches!(next.tok, Tok::Eq) {
                        self.advance(); // ident
                        self.advance(); // =
                        let (value, height) = self.parse_expr(0)?;
                        let height = self.checked_ast_height(height.saturating_add(1))?;
                        return Ok((
                            Expr::Assign {
                                name,
                                value: Box::new(value),
                            },
                            height,
                        ));
                    }
                    // function definition sugar: f(x, y) = body
                    if matches!(next.tok, Tok::LParen)
                        && let Some(eq_idx) = self.find_assign_eq_after_paren(save + 1)
                    {
                        self.advance(); // ident
                        self.advance(); // (
                        let params = self.parse_param_list()?;
                        // close paren consumed by parse_param_list
                        // expect =
                        if !matches!(self.peek().tok, Tok::Eq) {
                            self.idx = save;
                            return self.parse_expr(0);
                        }
                        self.advance(); // =
                        let (body, body_height) = self.parse_expr(0)?;
                        let _ = eq_idx;
                        let lambda_height =
                            self.checked_ast_height(body_height.saturating_add(1))?;
                        let assign_height =
                            self.checked_ast_height(lambda_height.saturating_add(1))?;
                        let lambda = Expr::Lambda {
                            params,
                            body: Box::new(body),
                        };
                        return Ok((
                            Expr::Assign {
                                name,
                                value: Box::new(lambda),
                            },
                            assign_height,
                        ));
                    }
                }
            }
        }
        self.parse_expr(0)
    }

    // peek ahead: after `(`, is there a matching `)` followed by `=`?
    // returns the index of the `=` if so. used to disambiguate `f(x) = x+1`
    // (function def) from `f(x)` (call).
    fn find_assign_eq_after_paren(&self, lparen_idx: usize) -> Option<usize> {
        let mut depth = 0usize;
        let mut i = lparen_idx;
        while i < self.toks.len() {
            match &self.toks[i].tok {
                Tok::LParen => depth += 1,
                Tok::RParen => {
                    depth -= 1;
                    if depth == 0 {
                        let next = self.toks.get(i + 1)?;
                        return if matches!(next.tok, Tok::Eq) {
                            Some(i + 1)
                        } else {
                            None
                        };
                    }
                }
                Tok::Eof | Tok::Semicolon => return None,
                _ => {}
            }
            i += 1;
        }
        None
    }

    fn parse_param_list(&mut self) -> Result<Vec<String>> {
        let mut params = Vec::new();
        if matches!(self.peek().tok, Tok::RParen) {
            self.advance();
            return Ok(params);
        }
        loop {
            let head = self.advance().clone();
            match head.tok {
                Tok::Ident(name) => params.push(name),
                _ => {
                    return Err(Error::UnexpectedToken {
                        what: "parameter name",
                        pos: head.pos,
                    });
                }
            }
            match self.peek().tok {
                Tok::Comma => {
                    self.advance();
                }
                Tok::RParen => {
                    self.advance();
                    return Ok(params);
                }
                _ => {
                    return Err(Error::UnexpectedToken {
                        what: "',' or ')'",
                        pos: self.peek().pos,
                    });
                }
            }
        }
    }

    fn enter(&mut self) -> Result<()> {
        self.depth += 1;
        if self.depth > MAX_DEPTH {
            return Err(Error::DepthExceeded { limit: MAX_DEPTH });
        }
        Ok(())
    }

    fn leave(&mut self) {
        self.depth -= 1;
    }

    fn checked_ast_height(&self, height: usize) -> Result<usize> {
        if height > MAX_AST_HEIGHT {
            return Err(Error::LimitExceeded {
                what: "AST height",
                limit: MAX_AST_HEIGHT,
            });
        }
        Ok(height)
    }

    // Pratt parsing bounds both recursive nesting and the height of the AST
    // built by iterative postfix and infix chains.
    fn parse_expr(&mut self, min_bp: u8) -> Result<(Expr, usize)> {
        self.enter()?;
        let (mut lhs, mut lhs_height) = self.parse_prefix()?;

        loop {
            // peek by reference to avoid cloning Tok::Ident's String for
            // every loop iteration. only clone when actually consuming.
            let op_tok = &self.peek().tok;

            // `to` keyword for unit conversion: `expr to label`. low-binding
            // so it sits below comparison/equality. RHS must be a single
            // identifier matching a known SI unit.
            if let Tok::Ident(name) = op_tok
                && name == "to"
                && min_bp <= TO_BP
            {
                self.advance();
                let rhs_tok = self.advance().clone();
                let label = match rhs_tok.tok {
                    Tok::Ident(label) if crate::units::is_label(&label) => label,
                    _ => {
                        return Err(Error::UnexpectedToken {
                            what: "unit label after `to`",
                            pos: rhs_tok.pos,
                        });
                    }
                };
                lhs_height = self.checked_ast_height(lhs_height.max(1).saturating_add(1))?;
                lhs = Expr::Call {
                    name: alloc::string::String::from("convert"),
                    args: alloc::vec![lhs, Expr::Str(label)],
                };
                continue;
            }

            if let Some((l_bp, _)) = postfix_bp(op_tok) {
                if l_bp < min_bp {
                    break;
                }
                let kind = op_tok.clone();
                self.advance();
                lhs_height = self.checked_ast_height(lhs_height.saturating_add(1))?;
                lhs = match kind {
                    Tok::Bang => Expr::Fact(Box::new(lhs)),
                    _ => unreachable!(),
                };
                continue;
            }

            if let Some((l_bp, r_bp)) = infix_bp(op_tok) {
                if l_bp < min_bp {
                    break;
                }
                let op = match op_tok {
                    Tok::Plus => BinOp::Add,
                    Tok::Minus => BinOp::Sub,
                    Tok::Star => BinOp::Mul,
                    Tok::Slash => BinOp::Div,
                    Tok::Percent => BinOp::Rem,
                    Tok::Caret => BinOp::Pow,
                    _ => unreachable!(),
                };
                self.advance();
                let (rhs, rhs_height) = self.parse_expr(r_bp)?;
                lhs_height =
                    self.checked_ast_height(lhs_height.max(rhs_height).saturating_add(1))?;
                lhs = Expr::Bin {
                    op,
                    lhs: Box::new(lhs),
                    rhs: Box::new(rhs),
                };
                continue;
            }

            break;
        }

        self.leave();
        Ok((lhs, lhs_height))
    }

    fn parse_prefix(&mut self) -> Result<(Expr, usize)> {
        let head = self.advance().clone();
        match head.tok {
            Tok::Num(n) => {
                // implicit unit literal: `1 km` → unit(1, "km"). only fires
                // when the very next token is an identifier registered in
                // the SI table; otherwise leaves the number alone.
                if let Tok::Ident(label) = &self.peek().tok
                    && crate::units::is_label(label)
                {
                    let label = label.clone();
                    self.advance();
                    return Ok((
                        Expr::Call {
                            name: alloc::string::String::from("unit"),
                            args: alloc::vec![Expr::Num(n), Expr::Str(label)],
                        },
                        2,
                    ));
                }
                Ok((Expr::Num(n), 1))
            }
            Tok::BigLit(text) => Ok((Expr::BigLit(text), 1)),
            Tok::Str(s) => Ok((Expr::Str(s), 1)),

            Tok::Minus => {
                let (rhs, height) = self.parse_expr(prefix_bp_unary())?;
                let height = self.checked_ast_height(height.saturating_add(1))?;
                Ok((Expr::Neg(Box::new(rhs)), height))
            }
            Tok::Plus => {
                let (rhs, height) = self.parse_expr(prefix_bp_unary())?;
                let height = self.checked_ast_height(height.saturating_add(1))?;
                Ok((Expr::Pos(Box::new(rhs)), height))
            }

            Tok::LParen => {
                let inner = self.parse_expr(0)?;
                let next = self.advance();
                if !matches!(next.tok, Tok::RParen) {
                    return Err(Error::UnexpectedToken {
                        what: ")",
                        pos: next.pos,
                    });
                }
                Ok(inner)
            }

            Tok::Ident(name) => {
                if matches!(self.peek().tok, Tok::LParen) {
                    self.advance();
                    let mut args = Vec::new();
                    let mut args_height = 0;
                    if !matches!(self.peek().tok, Tok::RParen) {
                        loop {
                            if args.len() >= MAX_CALL_ARITY {
                                return Err(Error::ArityMismatch {
                                    name: name.clone(),
                                    expected: MAX_CALL_ARITY,
                                    got: args.len() + 1,
                                });
                            }
                            let (arg, height) = self.parse_expr(0)?;
                            args_height = args_height.max(height);
                            args.push(arg);
                            match self.peek().tok {
                                Tok::Comma => {
                                    self.advance();
                                }
                                _ => break,
                            }
                        }
                    }
                    let close = self.advance();
                    if !matches!(close.tok, Tok::RParen) {
                        return Err(Error::UnexpectedToken {
                            what: ")",
                            pos: close.pos,
                        });
                    }
                    let height = self.checked_ast_height(args_height.max(1).saturating_add(1))?;
                    Ok((Expr::Call { name, args }, height))
                } else {
                    Ok((Expr::Var(name), 1))
                }
            }

            Tok::Bang => {
                // logical not. wires to fact's spot via a separate node so
                // compiler distinguishes prefix-not from postfix-fact.
                let (rhs, height) = self.parse_expr(prefix_bp_unary())?;
                let height = self.checked_ast_height(height.saturating_add(1))?;
                Ok((Expr::Not(Box::new(rhs)), height))
            }

            Tok::Eof => Err(Error::UnexpectedEof),
            _ => Err(Error::UnexpectedToken {
                what: "expression",
                pos: head.pos,
            }),
        }
    }
}

// see NOTES.md §2.2 — derived from public precedence convention.
fn prefix_bp_unary() -> u8 {
    110
}

// `to` sits below comparison so `a + b to m` parses as `(a + b) to m`,
// which mathjs follows. assignments (`=`) are still lower so `x = 1 m to cm`
// binds the converted value.
const TO_BP: u8 = 60;

fn postfix_bp(tok: &Tok) -> Option<(u8, ())> {
    match tok {
        Tok::Bang => Some((130, ())),
        _ => None,
    }
}

// returns (left_bp, right_bp). right > left for left-assoc (e.g. +),
// left > right for right-assoc (e.g. ^).
fn infix_bp(tok: &Tok) -> Option<(u8, u8)> {
    match tok {
        Tok::Plus | Tok::Minus => Some((95, 96)),
        Tok::Star | Tok::Slash | Tok::Percent => Some((100, 101)),
        Tok::Caret => Some((121, 120)),
        _ => None,
    }
}
