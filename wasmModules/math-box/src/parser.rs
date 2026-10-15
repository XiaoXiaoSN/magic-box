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
    Bool(bool),
    Str(String),
    Var(String),
    Call {
        name: String,
        args: Vec<Expr>,
    },
    Neg(Box<Expr>),
    Pos(Box<Expr>),
    Not(Box<Expr>),
    Percent(Box<Expr>),
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
pub enum CmpOp {
    Lt,
    LtEq,
    Gt,
    GtEq,
    Eq,
    NotEq,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    Rem,
    Pow,
    Compare(CmpOp),
    And,
    Or,
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

    fn peek_n(&self, offset: usize) -> &'a Spanned {
        &self.toks[(self.idx + offset).min(self.toks.len() - 1)]
    }

    fn advance(&mut self) -> &'a Spanned {
        let t = &self.toks[self.idx];
        if self.idx + 1 < self.toks.len() {
            self.idx += 1;
        }
        t
    }

    fn parse_stmt(&mut self) -> Result<(Expr, usize)> {
        if let Tok::Ident(_) = self.peek().tok {
            let save = self.idx;
            if let Tok::Ident(name) = &self.toks[save].tok {
                let name = name.clone();
                if matches!(self.toks.get(save + 1).map(|t| &t.tok), Some(Tok::Eq)) {
                    self.advance();
                    self.advance();
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
                if matches!(self.toks.get(save + 1).map(|t| &t.tok), Some(Tok::LParen))
                    && self.find_assign_eq_after_paren(save + 1).is_some()
                {
                    self.advance();
                    self.advance();
                    let params = self.parse_param_list()?;
                    self.advance();
                    let (body, body_height) = self.parse_expr(0)?;
                    let lambda_height = self.checked_ast_height(body_height.saturating_add(1))?;
                    let assign_height = self.checked_ast_height(lambda_height.saturating_add(1))?;
                    return Ok((
                        Expr::Assign {
                            name,
                            value: Box::new(Expr::Lambda {
                                params,
                                body: Box::new(body),
                            }),
                        },
                        assign_height,
                    ));
                }
            }
        }
        self.parse_expr(0)
    }

    fn find_assign_eq_after_paren(&self, lparen_idx: usize) -> Option<usize> {
        let mut depth = 0usize;
        let mut i = lparen_idx;
        while i < self.toks.len() {
            match &self.toks[i].tok {
                Tok::LParen => depth += 1,
                Tok::RParen => {
                    depth -= 1;
                    if depth == 0 {
                        return self
                            .toks
                            .get(i + 1)
                            .filter(|token| matches!(token.tok, Tok::Eq))
                            .map(|_| i + 1);
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

    fn parse_expr(&mut self, min_bp: u8) -> Result<(Expr, usize)> {
        self.enter()?;
        let parsed = self.parse_expr_inner(min_bp);
        self.leave();
        parsed
    }

    fn parse_expr_inner(&mut self, min_bp: u8) -> Result<(Expr, usize)> {
        let (mut lhs, mut lhs_height) = self.parse_prefix()?;

        loop {
            let op_tok = &self.peek().tok;

            if let Tok::Ident(name) = op_tok
                && name == "to"
                && min_bp <= TO_BP
            {
                self.advance();
                let label = self.parse_unit_target()?;
                lhs_height = self.checked_ast_height(lhs_height.saturating_add(1))?;
                lhs = Expr::Call {
                    name: String::from("convert"),
                    args: vec![lhs, Expr::Str(label)],
                };
                continue;
            }

            if matches!(op_tok, Tok::Percent) && self.percent_is_postfix() {
                self.advance();
                lhs_height = self.checked_ast_height(lhs_height.saturating_add(1))?;
                lhs = Expr::Percent(Box::new(lhs));
                if matches!(self.peek().tok, Tok::Ident(ref name) if name == "of") {
                    self.advance();
                    let (rhs, rhs_height) = self.parse_expr(0)?;
                    lhs_height =
                        self.checked_ast_height(lhs_height.max(rhs_height).saturating_add(1))?;
                    lhs = Expr::Bin {
                        op: BinOp::Mul,
                        lhs: Box::new(lhs),
                        rhs: Box::new(rhs),
                    };
                }
                continue;
            }

            if let Some((l_bp, _)) = postfix_bp(op_tok) {
                if l_bp < min_bp {
                    break;
                }
                self.advance();
                lhs_height = self.checked_ast_height(lhs_height.saturating_add(1))?;
                lhs = Expr::Fact(Box::new(lhs));
                continue;
            }

            if let Some((l_bp, r_bp, op)) = infix_bp(op_tok) {
                if l_bp < min_bp {
                    break;
                }
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

            // Adjacent primary expressions are calculator-style implicit
            // multiplication. Function calls have already been consumed as a
            // single primary, so `min(1, 2)` remains a function call.
            if min_bp <= MUL_BP && starts_primary(op_tok) {
                let (rhs, rhs_height) = self.parse_expr(MUL_BP + 1)?;
                lhs_height =
                    self.checked_ast_height(lhs_height.max(rhs_height).saturating_add(1))?;
                lhs = Expr::Bin {
                    op: BinOp::Mul,
                    lhs: Box::new(lhs),
                    rhs: Box::new(rhs),
                };
                continue;
            }

            break;
        }
        Ok((lhs, lhs_height))
    }

    fn percent_is_postfix(&self) -> bool {
        matches!(
            self.peek_n(1).tok,
            Tok::Eof | Tok::RParen | Tok::Comma | Tok::Semicolon
        ) || matches!(self.peek_n(1).tok, Tok::Ident(ref name) if name == "of")
    }

    fn parse_prefix(&mut self) -> Result<(Expr, usize)> {
        let head = self.advance().clone();
        match head.tok {
            Tok::Num(n) => self.parse_numeric_prefix(Expr::Num(n)),
            Tok::BigLit(text) => self.parse_numeric_prefix(Expr::BigLit(text)),
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
                if name == "true" {
                    return Ok((Expr::Bool(true), 1));
                }
                if name == "false" {
                    return Ok((Expr::Bool(false), 1));
                }
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
                            if matches!(self.peek().tok, Tok::Comma) {
                                self.advance();
                            } else {
                                break;
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

    fn parse_numeric_prefix(&mut self, value: Expr) -> Result<(Expr, usize)> {
        let Some(label) = self.unit_label() else {
            return Ok((value, 1));
        };
        self.advance();
        let mut label = label;
        self.append_unit_exponent(&mut label)?;
        while matches!(self.peek().tok, Tok::Slash | Tok::Star)
            && self.unit_label_after_operator().is_some()
        {
            let operator = self.advance().clone();
            let next = self.advance().clone();
            let rhs = match next.tok {
                Tok::Ident(label) => label,
                _ => String::new(),
            };
            if rhs.is_empty() {
                return Err(Error::UnexpectedToken {
                    what: "unit label",
                    pos: next.pos,
                });
            }
            label.push(if matches!(operator.tok, Tok::Slash) {
                '/'
            } else {
                '*'
            });
            label.push_str(&rhs);
            self.append_unit_exponent(&mut label)?;
        }
        Ok((
            Expr::Call {
                name: String::from("unit"),
                args: vec![value, Expr::Str(label)],
            },
            2,
        ))
    }

    fn unit_label(&self) -> Option<String> {
        match &self.peek().tok {
            Tok::Ident(label) if crate::units::is_label(label) => Some(label.clone()),
            _ => None,
        }
    }

    fn unit_label_after_operator(&self) -> Option<String> {
        match (&self.peek().tok, &self.peek_n(1).tok) {
            (Tok::Slash | Tok::Star, Tok::Ident(label)) if crate::units::is_label(label) => {
                Some(label.clone())
            }
            _ => None,
        }
    }

    fn parse_unit_target(&mut self) -> Result<String> {
        let first = self.advance().clone();
        let mut label = match first.tok {
            Tok::Ident(label) if crate::units::is_label(&label) => label,
            _ => {
                return Err(Error::UnexpectedToken {
                    what: "unit label after `to`",
                    pos: first.pos,
                });
            }
        };
        self.append_unit_exponent(&mut label)?;
        while self.unit_label_after_operator().is_some() {
            let operator = self.advance().clone();
            let next = self.advance().clone();
            label.push(if matches!(operator.tok, Tok::Slash) {
                '/'
            } else {
                '*'
            });
            if let Tok::Ident(rhs) = next.tok {
                label.push_str(&rhs);
            }
            self.append_unit_exponent(&mut label)?;
        }
        crate::units::parse_expression(&label)?;
        Ok(label)
    }

    fn append_unit_exponent(&mut self, label: &mut String) -> Result<()> {
        if !matches!(self.peek().tok, Tok::Caret) {
            return Ok(());
        }
        let mut exponent_text = String::new();
        if matches!(self.peek_n(1).tok, Tok::Plus | Tok::Minus) {
            let sign = self.peek_n(1).tok.clone();
            if let Tok::Plus = sign {
                exponent_text.push('+');
            } else {
                exponent_text.push('-');
            }
            if !matches!(self.peek_n(2).tok, Tok::Num(_) | Tok::BigLit(_)) {
                return Ok(());
            }
            self.advance();
            self.advance();
        } else if !matches!(self.peek_n(1).tok, Tok::Num(_) | Tok::BigLit(_)) {
            return Ok(());
        } else {
            self.advance();
        }
        let exponent = self.advance().clone();
        match exponent.tok {
            Tok::Num(n) if n.fract() == 0.0 => exponent_text.push_str(&n.to_string()),
            Tok::BigLit(text) => exponent_text.push_str(&text),
            _ => {
                return Err(Error::UnexpectedToken {
                    what: "unit exponent",
                    pos: exponent.pos,
                });
            }
        }
        label.push('^');
        label.push_str(&exponent_text);
        Ok(())
    }
}

const MUL_BP: u8 = 100;
const TO_BP: u8 = 60;

fn prefix_bp_unary() -> u8 {
    110
}

fn starts_primary(tok: &Tok) -> bool {
    matches!(
        tok,
        Tok::Num(_) | Tok::BigLit(_) | Tok::Ident(_) | Tok::LParen | Tok::Str(_)
    )
}

fn postfix_bp(tok: &Tok) -> Option<(u8, ())> {
    matches!(tok, Tok::Bang).then_some((130, ()))
}

fn infix_bp(tok: &Tok) -> Option<(u8, u8, BinOp)> {
    match tok {
        Tok::OrOr => Some((10, 11, BinOp::Or)),
        Tok::AndAnd => Some((20, 21, BinOp::And)),
        Tok::EqEq => Some((30, 31, BinOp::Compare(CmpOp::Eq))),
        Tok::NotEq => Some((30, 31, BinOp::Compare(CmpOp::NotEq))),
        Tok::Lt => Some((40, 41, BinOp::Compare(CmpOp::Lt))),
        Tok::LtEq => Some((40, 41, BinOp::Compare(CmpOp::LtEq))),
        Tok::Gt => Some((40, 41, BinOp::Compare(CmpOp::Gt))),
        Tok::GtEq => Some((40, 41, BinOp::Compare(CmpOp::GtEq))),
        Tok::Plus => Some((95, 96, BinOp::Add)),
        Tok::Minus => Some((95, 96, BinOp::Sub)),
        Tok::Star => Some((MUL_BP, MUL_BP + 1, BinOp::Mul)),
        Tok::Slash => Some((MUL_BP, MUL_BP + 1, BinOp::Div)),
        Tok::Percent => Some((MUL_BP, MUL_BP + 1, BinOp::Rem)),
        Tok::Caret => Some((121, 120, BinOp::Pow)),
        _ => None,
    }
}
