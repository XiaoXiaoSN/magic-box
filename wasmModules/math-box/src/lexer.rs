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
    EqEq,
    NotEq,
    Lt,
    LtEq,
    Gt,
    GtEq,
    AndAnd,
    OrOr,
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
        return Err(Error::InputTooLong {
            len: src.len(),
            limit: MAX_INPUT_LEN,
        });
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
            // `n` is a suffix only at an identifier boundary. This keeps
            // unit labels such as `ns` and `nm` attached to their number.
            let has_big_suffix = bytes.get(i + consumed) == Some(&b'n')
                && !bytes
                    .get(i + consumed + 1)
                    .is_some_and(|next| is_identifier_continuation(*next));
            if let Some(text) = integer_text
                && (has_big_suffix || (cfg!(feature = "bigint") && is_large_integer(&text)))
            {
                push_tok(&mut out, Tok::BigLit(text), start)?;
                i += consumed + usize::from(has_big_suffix);
                continue;
            }
            push_tok(&mut out, Tok::Num(n), start)?;
            i += consumed;
            continue;
        }

        // degree temperature labels are the only supported non-ASCII unit
        // identifiers; keep the token intact so `0 °C` remains a literal.
        if b == 0xc2
            && bytes.get(i + 1) == Some(&0xb0)
            && matches!(bytes.get(i + 2), Some(b'C' | b'F'))
        {
            let j = i + 3;
            let ident = core::str::from_utf8(&bytes[i..j])
                .expect("degree label is valid UTF-8")
                .into();
            push_tok(&mut out, Tok::Ident(ident), start)?;
            i = j;
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
                let rest = core::str::from_utf8(&bytes[j..]).expect("input is valid UTF-8");
                let c = rest.chars().next().expect("non-empty input");
                if c == '"' {
                    break;
                }
                if c == '\\' {
                    j += c.len_utf8();
                    let escape = core::str::from_utf8(&bytes[j..])
                        .expect("input is valid UTF-8")
                        .chars()
                        .next()
                        .ok_or(Error::UnexpectedEof)?;
                    let pushed = match escape {
                        '"' => '"',
                        '\\' => '\\',
                        'n' => '\n',
                        't' => '\t',
                        _ => {
                            return Err(Error::UnexpectedChar { ch: escape, pos: j });
                        }
                    };
                    s.push(pushed);
                    j += escape.len_utf8();
                    continue;
                }
                s.push(c);
                j += c.len_utf8();
            }
            push_tok(&mut out, Tok::Str(s), start)?;
            i = j + 1;
            continue;
        }

        // two-character punctuation/operators
        let two = bytes.get(i..i.saturating_add(2));
        let two_tok = match two {
            Some(b"==") => Some(Tok::EqEq),
            Some(b"!=") => Some(Tok::NotEq),
            Some(b"<=") => Some(Tok::LtEq),
            Some(b">=") => Some(Tok::GtEq),
            Some(b"&&") => Some(Tok::AndAnd),
            Some(b"||") => Some(Tok::OrOr),
            _ => None,
        };
        if let Some(tok) = two_tok {
            push_tok(&mut out, tok, start)?;
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
            b'<' => Tok::Lt,
            b'>' => Tok::Gt,
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

fn is_identifier_continuation(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || byte == b'_'
}

fn is_large_integer(text: &str) -> bool {
    let significant = text.trim_start_matches('0');
    significant.len() > 16 || (significant.len() == 16 && significant > "9007199254740991")
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
    let n: f64 = text.parse().map_err(|_| Error::InvalidNumber {
        text: text.into(),
        pos,
    })?;
    let integer_text = if !has_fraction && !has_exp {
        Some(
            core::str::from_utf8(&bytes[..int_end])
                .expect("ascii digits")
                .into(),
        )
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
        let text = core::str::from_utf8(&bytes[..j]).unwrap_or("?").into();
        return Err(Error::InvalidNumber { text, pos });
    }
    let text = core::str::from_utf8(&bytes[prefix..j]).expect("ascii digits");
    #[cfg(feature = "bigint")]
    {
        use num_bigint::BigInt;
        use num_traits::ToPrimitive;

        let value =
            BigInt::parse_bytes(text.as_bytes(), radix).ok_or_else(|| Error::InvalidNumber {
                text: text.into(),
                pos,
            })?;
        let decimal = value.to_string();
        Ok((value.to_f64().unwrap_or(f64::INFINITY), j, Some(decimal)))
    }
    #[cfg(not(feature = "bigint"))]
    {
        let n = u64::from_str_radix(text, radix).map_err(|_| Error::InvalidNumber {
            text: text.into(),
            pos,
        })?;
        Ok((n as f64, j, Some(alloc::format!("{n}"))))
    }
}
