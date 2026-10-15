//! Unit definitions and the small grammar used by the expression evaluator.

#[cfg(feature = "unit")]
use alloc::string::{String, ToString};

#[cfg(feature = "unit")]
use crate::error::{Error, Result};
#[cfg(feature = "unit")]
use crate::value::Dimension;

#[cfg(feature = "unit")]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct UnitSpec {
    pub factor: f64,
    pub offset: f64,
    pub dim: Dimension,
    pub affine: bool,
}

#[cfg(feature = "unit")]
pub fn lookup(label: &str) -> Option<UnitSpec> {
    let spec = match label {
        // length (base: meter)
        "m" => spec(1.0, Dimension::LENGTH),
        "km" => spec(1000.0, Dimension::LENGTH),
        "cm" => spec(0.01, Dimension::LENGTH),
        "mm" => spec(0.001, Dimension::LENGTH),
        "um" => spec(1e-6, Dimension::LENGTH),
        "nm" => spec(1e-9, Dimension::LENGTH),
        "mi" => spec(1609.344, Dimension::LENGTH),
        "yd" => spec(0.9144, Dimension::LENGTH),
        "ft" => spec(0.3048, Dimension::LENGTH),
        "in" => spec(0.0254, Dimension::LENGTH),
        // mass (base: kilogram)
        "kg" => spec(1.0, Dimension::MASS),
        "g" => spec(0.001, Dimension::MASS),
        "mg" => spec(1e-6, Dimension::MASS),
        "t" => spec(1000.0, Dimension::MASS),
        "lb" => spec(0.45359237, Dimension::MASS),
        "oz" => spec(0.028349523125, Dimension::MASS),
        // time (base: second)
        "s" => spec(1.0, Dimension::TIME),
        "ms" => spec(0.001, Dimension::TIME),
        "us" => spec(1e-6, Dimension::TIME),
        "ns" => spec(1e-9, Dimension::TIME),
        "min" => spec(60.0, Dimension::TIME),
        "h" => spec(3600.0, Dimension::TIME),
        "day" => spec(86400.0, Dimension::TIME),
        "week" => spec(604800.0, Dimension::TIME),
        // temperature (base: kelvin)
        "K" | "k" => spec(1.0, Dimension::TEMPERATURE),
        "degC" | "°C" => affine_spec(1.0, 273.15, Dimension::TEMPERATURE),
        "degF" | "°F" => affine_spec(5.0 / 9.0, 255.3722222222222, Dimension::TEMPERATURE),
        // data (base: byte)
        "B" => spec(1.0, Dimension::DATA),
        "KB" => spec(1_000.0, Dimension::DATA),
        "MB" => spec(1_000_000.0, Dimension::DATA),
        "GB" => spec(1_000_000_000.0, Dimension::DATA),
        "TB" => spec(1_000_000_000_000.0, Dimension::DATA),
        "KiB" => spec(1024.0, Dimension::DATA),
        "MiB" => spec(1024.0 * 1024.0, Dimension::DATA),
        "GiB" => spec(1024.0 * 1024.0 * 1024.0, Dimension::DATA),
        "TiB" => spec(1024.0 * 1024.0 * 1024.0 * 1024.0, Dimension::DATA),
        "b" | "bit" | "bits" => spec(0.125, Dimension::DATA),
        // common derived SI units
        "Hz" => spec(1.0, Dimension::TIME.with_time(-1)),
        "N" => spec(1.0, Dimension::LENGTH.with_mass(1).with_time(-2)),
        "Pa" => spec(
            1.0,
            Dimension::LENGTH.with_length(-1).with_mass(1).with_time(-2),
        ),
        "J" => spec(
            1.0,
            Dimension::LENGTH.with_length(2).with_mass(1).with_time(-2),
        ),
        "W" => spec(
            1.0,
            Dimension::LENGTH.with_length(2).with_mass(1).with_time(-3),
        ),
        _ => return None,
    };
    Some(spec)
}

#[cfg(feature = "unit")]
const fn spec(factor: f64, dim: Dimension) -> UnitSpec {
    UnitSpec {
        factor,
        offset: 0.0,
        dim,
        affine: false,
    }
}

#[cfg(feature = "unit")]
const fn affine_spec(factor: f64, offset: f64, dim: Dimension) -> UnitSpec {
    UnitSpec {
        factor,
        offset,
        dim,
        affine: true,
    }
}

#[cfg(feature = "unit")]
pub fn is_label(label: &str) -> bool {
    lookup(label).is_some()
}

#[cfg(feature = "unit")]
pub fn parse_expression(input: &str) -> Result<UnitSpec> {
    if let Some(spec) = lookup(input) {
        return Ok(spec);
    }
    let mut parser = UnitParser {
        input,
        position: 0,
        depth: 0,
    };
    let result = parser.parse_product()?;
    if parser.position != input.len() {
        return Err(Error::Domain {
            what: "invalid unit expression",
        });
    }
    Ok(result)
}

#[cfg(feature = "unit")]
struct UnitParser<'a> {
    input: &'a str,
    position: usize,
    depth: usize,
}

#[cfg(feature = "unit")]
impl UnitParser<'_> {
    fn parse_product(&mut self) -> Result<UnitSpec> {
        let mut result = self.parse_factor()?;
        while self.position < self.input.len() {
            let operator = self.input[self.position..]
                .chars()
                .next()
                .ok_or(Error::UnexpectedEof)?;
            let divide = match operator {
                '*' => false,
                '/' => true,
                _ => break,
            };
            self.position += operator.len_utf8();
            let rhs = self.parse_factor()?;
            result = combine(result, rhs, divide)?;
        }
        Ok(result)
    }

    fn parse_factor(&mut self) -> Result<UnitSpec> {
        self.depth += 1;
        if self.depth > 16 {
            return Err(Error::DepthExceeded { limit: 16 });
        }
        let start = self.position;
        let first = self.input[self.position..]
            .chars()
            .next()
            .ok_or(Error::UnexpectedEof)?;
        if first == '°' {
            self.position += first.len_utf8();
            let suffix = self.input[self.position..]
                .chars()
                .next()
                .ok_or(Error::Domain {
                    what: "unknown unit label",
                })?;
            if !matches!(suffix, 'C' | 'F') {
                return Err(Error::Domain {
                    what: "unknown unit label",
                });
            }
            self.position += suffix.len_utf8();
        } else if first.is_ascii_alphabetic() || first == '_' {
            self.position += first.len_utf8();
            while let Some(c) = self.input[self.position..].chars().next() {
                if c.is_ascii_alphanumeric() || c == '_' {
                    self.position += c.len_utf8();
                } else {
                    break;
                }
            }
        } else {
            return Err(Error::Domain {
                what: "unknown unit label",
            });
        }
        let label = &self.input[start..self.position];
        let mut result = lookup(label).ok_or(Error::Domain {
            what: "unknown unit label",
        })?;
        if self.position < self.input.len() && self.input.as_bytes()[self.position] == b'^' {
            self.position += 1;
            let exponent_start = self.position;
            if self.input.as_bytes().get(self.position) == Some(&b'-') {
                self.position += 1;
            }
            while self
                .input
                .as_bytes()
                .get(self.position)
                .is_some_and(u8::is_ascii_digit)
            {
                self.position += 1;
            }
            let exponent = self.input[exponent_start..self.position]
                .parse::<i8>()
                .map_err(|_| Error::Domain {
                    what: "unit exponent must be a small integer",
                })?;
            result = pow(result, exponent)?;
        }
        self.depth -= 1;
        Ok(result)
    }
}

#[cfg(feature = "unit")]
fn combine(lhs: UnitSpec, rhs: UnitSpec, divide: bool) -> Result<UnitSpec> {
    if lhs.affine || rhs.affine {
        return Err(Error::TypeMismatch {
            op: if divide { "/" } else { "*" },
            lhs: "affine unit",
            rhs: "unit",
        });
    }
    let dim = if divide {
        lhs.dim.checked_sub(&rhs.dim)?
    } else {
        lhs.dim.checked_add(&rhs.dim)?
    };
    let factor = if divide {
        lhs.factor / rhs.factor
    } else {
        lhs.factor * rhs.factor
    };
    Ok(spec(factor, dim))
}

#[cfg(feature = "unit")]
fn pow(value: UnitSpec, exponent: i8) -> Result<UnitSpec> {
    if value.affine {
        return Err(Error::TypeMismatch {
            op: "^",
            lhs: "affine unit",
            rhs: "number",
        });
    }
    let dim = value.dim.checked_mul(exponent)?;
    let factor = value.factor.powi(i32::from(exponent));
    Ok(spec(factor, dim))
}

#[cfg(not(feature = "unit"))]
pub fn is_label(_label: &str) -> bool {
    false
}

#[cfg(not(feature = "unit"))]
pub fn parse_expression(_input: &str) -> crate::error::Result<()> {
    Err(crate::error::Error::Domain {
        what: "unit support is disabled",
    })
}

#[cfg(feature = "unit")]
pub fn format_product(lhs: &str, rhs: &str) -> String {
    format_combined(lhs, rhs, false)
}

#[cfg(feature = "unit")]
pub fn format_quotient(lhs: &str, rhs: &str) -> String {
    format_combined(lhs, rhs, true)
}

#[cfg(feature = "unit")]
pub fn format_power(label: &str, exponent: i8) -> String {
    let Some(mut terms) = parse_terms(label) else {
        return alloc::format!("{label}^{exponent}");
    };
    for (_, term_exponent) in &mut terms {
        *term_exponent = term_exponent.saturating_mul(i16::from(exponent));
    }
    format_terms(&terms)
}

#[cfg(feature = "unit")]
pub fn format_sqrt(label: &str) -> Option<String> {
    let mut terms = parse_terms(label)?;
    for (_, exponent) in &mut terms {
        if *exponent % 2 != 0 {
            return None;
        }
        *exponent /= 2;
    }
    Some(format_terms(&terms))
}

#[cfg(feature = "unit")]
fn format_combined(lhs: &str, rhs: &str, divide_rhs: bool) -> String {
    let mut terms = parse_terms(lhs).unwrap_or_default();
    let rhs_terms = parse_terms(rhs).unwrap_or_default();
    if terms.is_empty() && lhs.is_empty() && rhs.is_empty() {
        return String::new();
    }
    if terms.is_empty() && !lhs.is_empty() {
        return if divide_rhs {
            alloc::format!("{lhs}/{rhs}")
        } else {
            alloc::format!("{lhs}*{rhs}")
        };
    }
    if rhs_terms.is_empty() && !rhs.is_empty() {
        return if divide_rhs {
            alloc::format!("{lhs}/{rhs}")
        } else {
            alloc::format!("{lhs}*{rhs}")
        };
    }
    for (term, exponent) in rhs_terms {
        let exponent = if divide_rhs { -exponent } else { exponent };
        if let Some((_, current)) = terms.iter_mut().find(|(name, _)| name == &term) {
            *current = current.saturating_add(exponent);
        } else {
            terms.push((term, exponent));
        }
    }
    terms.retain(|(_, exponent)| *exponent != 0);
    format_terms(&terms)
}

#[cfg(feature = "unit")]
fn parse_terms(label: &str) -> Option<alloc::vec::Vec<(String, i16)>> {
    if label.is_empty() {
        return Some(alloc::vec::Vec::new());
    }
    let mut terms: alloc::vec::Vec<(String, i16)> = alloc::vec::Vec::new();
    let mut start = 0;
    let mut sign = 1_i16;
    for (index, operator) in label.char_indices() {
        if matches!(operator, '*' | '/') {
            let term = &label[start..index];
            add_term(&mut terms, term, sign)?;
            sign = if operator == '/' { -1 } else { 1 };
            start = index + operator.len_utf8();
        }
    }
    add_term(&mut terms, &label[start..], sign)?;
    Some(terms)
}

#[cfg(feature = "unit")]
fn add_term(terms: &mut alloc::vec::Vec<(String, i16)>, raw: &str, sign: i16) -> Option<()> {
    if raw.is_empty() {
        return None;
    }
    let (base, exponent) = raw
        .rsplit_once('^')
        .map_or((raw, 1_i16), |(base, exponent)| {
            (base, exponent.parse::<i16>().ok().unwrap_or(0))
        });
    if base.is_empty() || exponent == 0 {
        return None;
    }
    let exponent = sign.checked_mul(exponent)?;
    if let Some((_, current)) = terms.iter_mut().find(|(term, _)| term == base) {
        *current = current.checked_add(exponent)?;
    } else {
        terms.push((base.to_string(), exponent));
    }
    Some(())
}

#[cfg(feature = "unit")]
fn format_terms(terms: &[(String, i16)]) -> String {
    let mut numerator = alloc::vec::Vec::new();
    let mut denominator = alloc::vec::Vec::new();
    for (term, exponent) in terms {
        if *exponent > 0 {
            numerator.push(format_term(term, *exponent));
        } else if *exponent < 0 {
            denominator.push(format_term(term, exponent.saturating_abs()));
        }
    }
    if numerator.is_empty() {
        if denominator.len() == 1 {
            let Some((term, exponent)) = terms.iter().find(|(_, exponent)| *exponent < 0) else {
                return String::new();
            };
            return alloc::format!("{term}^{exponent}");
        }
        return terms
            .iter()
            .filter(|(_, exponent)| *exponent < 0)
            .map(|(term, exponent)| alloc::format!("{term}^{}", exponent))
            .collect::<alloc::vec::Vec<_>>()
            .join("*");
    }
    let mut result = numerator.join("*");
    for term in denominator {
        result.push('/');
        result.push_str(&term);
    }
    result
}

#[cfg(feature = "unit")]
fn format_term(term: &str, exponent: i16) -> String {
    if exponent == 1 {
        term.to_string()
    } else {
        alloc::format!("{term}^{exponent}")
    }
}
