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
            let divide = match self.input.as_bytes()[self.position] {
                b'*' | 0xc2 => false,
                b'/' => true,
                _ => break,
            };
            if self.input.as_bytes()[self.position] == 0xc2 {
                self.position = self.position.saturating_add(2);
            } else {
                self.position += 1;
            }
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
        while self.position < self.input.len() {
            let c = self.input.as_bytes()[self.position];
            if c.is_ascii_alphabetic() || c == b'_' || c == 0xc2 {
                self.position += 1;
            } else {
                break;
            }
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
    if lhs.is_empty() {
        return rhs.to_string();
    }
    if rhs.is_empty() {
        return lhs.to_string();
    }
    alloc::format!("{lhs}·{rhs}")
}

#[cfg(feature = "unit")]
pub fn format_quotient(lhs: &str, rhs: &str) -> String {
    if lhs.is_empty() {
        if rhs.contains('/') || rhs.contains('·') || rhs.contains('^') {
            return alloc::format!("({rhs})^-1");
        }
        return alloc::format!("{rhs}^-1");
    }
    if rhs.is_empty() {
        return lhs.to_string();
    }
    alloc::format!("{lhs}/{rhs}")
}
