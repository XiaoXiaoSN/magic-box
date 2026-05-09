use alloc::string::String;
use alloc::vec::Vec;

use crate::error::{Error, Result};
use crate::limits::{MAX_INPUT_LEN, MAX_TOKENS};

#[derive(Clone, Debug, PartialEq)]
pub enum Tok {
    Num(f64),
    BigLit(String),
    Str(String),
    Ident(String),
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    Caret,
    Bang,
    Eq,
    Arrow,
    LParen,
    RParen,
    Comma,
    Semicolon,
    Eof,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Spanned {
    pub tok: Tok,
    pub pos: usize,
}

pub fn tokenize(src: &str) -> Result<Vec<Spanned>> {
    if src.len() > MAX_INPUT_LEN {
        return Err(Error::InputTooLong { len: src.len(), limit: MAX_INPUT_LEN });
    }

    let bytes = src.as_bytes();
    // average token is at least two bytes; halving the input length is a
    // cheap, mostly-correct preallocation that avoids the early reallocs.
    let mut out = Vec::with_capacity(bytes.len() / 2 + 1);
    let mut i = 0;

    while i < bytes.len() {
        let b = bytes[i];

        // ascii whitespace
        if b.is_ascii_whitespace() {
            i += 1;
            continue;
        }

        // line comment
        if b == b'/' && bytes.get(i + 1) == Some(&b'/') {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }

        // block comment
        if b == b'/' && bytes.get(i + 1) == Some(&b'*') {
            i += 2;
            let mut closed = false;
            while i + 1 < bytes.len() {
                if bytes[i] == b'*' && bytes[i + 1] == b'/' {
                    i += 2;
                    closed = true;
                    break;
                }
                i += 1;
            }
            if !closed {
                return Err(Error::UnexpectedEof);
            }
            continue;
        }

        let start = i;

        // number literal: decimal, hex, binary, octal, optional `n` suffix
        // for arbitrary-precision integers.
        if b.is_ascii_digit() || (b == b'.' && bytes.get(i + 1).is_some_and(|c| c.is_ascii_digit()))
        {
            let (n, consumed, integer_text) = parse_number(&bytes[i..], start)?;
            // `n` suffix marks the literal as BigInt; integer_text holds the
            // raw decimal/radix-decoded integer string when applicable.
            if let Some(text) = integer_text
                && bytes.get(i + consumed) == Some(&b'n')
            {
                push_tok(&mut out, Tok::BigLit(text), start)?;
                i += consumed + 1;
                continue;
            }
            push_tok(&mut out, Tok::Num(n), start)?;
            i += consumed;
            continue;
        }

        // identifier
        if b.is_ascii_alphabetic() || b == b'_' {
            let mut j = i + 1;
            while j < bytes.len() && (bytes[j].is_ascii_alphanumeric() || bytes[j] == b'_') {
                j += 1;
            }
            let ident = core::str::from_utf8(&bytes[i..j])
                .expect("ascii by construction")
                .into();
            push_tok(&mut out, Tok::Ident(ident), start)?;
            i = j;
            continue;
        }

        // string literal "..." with simple \" and \\ escapes
        if b == b'"' {
            let mut j = i + 1;
            let mut s = String::new();
            loop {
                if j >= bytes.len() {
                    return Err(Error::UnexpectedEof);
                }
                let c = bytes[j];
                if c == b'"' {
                    break;
                }
                if c == b'\\' && j + 1 < bytes.len() {
                    let next = bytes[j + 1];
                    let pushed = match next {
                        b'"' => '"',
                        b'\\' => '\\',
                        b'n' => '\n',
                        b't' => '\t',
                        _ => return Err(Error::UnexpectedChar { ch: next as char, pos: j + 1 }),
                    };
                    s.push(pushed);
                    j += 2;
                    continue;
                }
                s.push(c as char);
                j += 1;
            }
            push_tok(&mut out, Tok::Str(s), start)?;
            i = j + 1;
            continue;
        }

        // multi-char first: -> (function arrow)
        if b == b'-' && bytes.get(i + 1) == Some(&b'>') {
            push_tok(&mut out, Tok::Arrow, start)?;
            i += 2;
            continue;
        }

        // single-char punctuation/operators
        let tok = match b {
            b'+' => Tok::Plus,
            b'-' => Tok::Minus,
            b'*' => Tok::Star,
            b'/' => Tok::Slash,
            b'%' => Tok::Percent,
            b'^' => Tok::Caret,
            b'!' => Tok::Bang,
            b'=' => Tok::Eq,
            b'(' => Tok::LParen,
            b')' => Tok::RParen,
            b',' => Tok::Comma,
            b';' => Tok::Semicolon,
            _ => {
                let ch = src[i..].chars().next().unwrap_or('?');
                return Err(Error::UnexpectedChar { ch, pos: i });
            }
        };
        push_tok(&mut out, tok, start)?;
        i += 1;
    }

    push_tok(&mut out, Tok::Eof, bytes.len())?;
    Ok(out)
}

fn push_tok(out: &mut Vec<Spanned>, tok: Tok, pos: usize) -> Result<()> {
    if out.len() >= MAX_TOKENS {
        return Err(Error::TooManyTokens { limit: MAX_TOKENS });
    }
    out.push(Spanned { tok, pos });
    Ok(())
}

// returns (value, bytes_consumed, integer_text_if_pure_integer).
// integer_text is Some when the literal has no fractional or exponent part —
// callers rely on it to construct BigInt when an `n` suffix follows.
fn parse_number(bytes: &[u8], pos: usize) -> Result<(f64, usize, Option<String>)> {
    if bytes.len() >= 2 && bytes[0] == b'0' {
        match bytes[1] {
            b'x' | b'X' => return parse_radix(bytes, pos, 16, 2),
            b'b' | b'B' => return parse_radix(bytes, pos, 2, 2),
            b'o' | b'O' => return parse_radix(bytes, pos, 8, 2),
            _ => {}
        }
    }

    let mut j = 0;
    while j < bytes.len() && bytes[j].is_ascii_digit() {
        j += 1;
    }
    let int_end = j;
    let mut has_fraction = false;
    if j < bytes.len() && bytes[j] == b'.' {
        has_fraction = true;
        j += 1;
        while j < bytes.len() && bytes[j].is_ascii_digit() {
            j += 1;
        }
    }
    let mut has_exp = false;
    if j < bytes.len() && (bytes[j] == b'e' || bytes[j] == b'E') {
        has_exp = true;
        j += 1;
        if j < bytes.len() && (bytes[j] == b'+' || bytes[j] == b'-') {
            j += 1;
        }
        while j < bytes.len() && bytes[j].is_ascii_digit() {
            j += 1;
        }
    }

    let text = core::str::from_utf8(&bytes[..j]).expect("ascii digits");
    let n: f64 = text
        .parse()
        .map_err(|_| Error::InvalidNumber { text: text.into(), pos })?;
    let integer_text = if !has_fraction && !has_exp {
        Some(core::str::from_utf8(&bytes[..int_end]).expect("ascii digits").into())
    } else {
        None
    };
    Ok((n, j, integer_text))
}

fn parse_radix(
    bytes: &[u8],
    pos: usize,
    radix: u32,
    prefix: usize,
) -> Result<(f64, usize, Option<String>)> {
    let mut j = prefix;
    while j < bytes.len() && (bytes[j] as char).is_digit(radix) {
        j += 1;
    }
    if j == prefix {
        let text = core::str::from_utf8(&bytes[..j])
            .unwrap_or("?")
            .into();
        return Err(Error::InvalidNumber { text, pos });
    }
    let text = core::str::from_utf8(&bytes[prefix..j]).expect("ascii digits");
    let n = u64::from_str_radix(text, radix)
        .map_err(|_| Error::InvalidNumber { text: text.into(), pos })?;
    // for radix literals, hand back the decimal-equivalent text so that an
    // `n` suffix can construct a BigInt with the same value
    Ok((n as f64, j, Some(alloc::format!("{n}"))))
}
