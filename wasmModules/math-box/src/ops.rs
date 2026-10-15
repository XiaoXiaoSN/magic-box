// runtime arithmetic dispatch over the heterogeneous Value type. each
// op walks a small match table covering the supported operand
// combinations, promoting where reasonable (e.g. Num + Big → Big).

use crate::error::{Error, Result};
use crate::value::Value;

#[cfg(feature = "complex")]
use crate::value::Complex;
#[cfg(feature = "fraction")]
use crate::value::Fraction;

#[cfg(feature = "bigint")]
use crate::limits::MAX_NUMERIC_BITS;
#[cfg(feature = "bigint")]
use num_bigint::BigInt;

#[cfg(feature = "bigint")]
fn check_big_growth(bits: u64) -> Result<()> {
    if bits > MAX_NUMERIC_BITS as u64 {
        return Err(Error::LimitExceeded {
            what: "numeric bit length",
            limit: MAX_NUMERIC_BITS,
        });
    }
    Ok(())
}

#[cfg(feature = "bigint")]
fn check_big_size(value: &BigInt) -> Result<()> {
    check_big_growth(value.bits())
}

#[cfg(feature = "bigint")]
fn big_power_of_two_exponent(value: &BigInt) -> Option<u64> {
    let bits = value.bits();
    value
        .magnitude()
        .trailing_zeros()
        .filter(|zeros| zeros.saturating_add(1) == bits)
}

#[cfg(feature = "bigint")]
fn big_multiply_growth_bits(lhs: &BigInt, rhs: &BigInt) -> u64 {
    if lhs.bits() == 0 || rhs.bits() == 0 {
        0
    } else if let Some(shift) = big_power_of_two_exponent(lhs) {
        rhs.bits().saturating_add(shift)
    } else if let Some(shift) = big_power_of_two_exponent(rhs) {
        lhs.bits().saturating_add(shift)
    } else {
        lhs.bits().saturating_add(rhs.bits())
    }
}

#[cfg(feature = "bigint")]
fn bounded_big_multiply(lhs: &BigInt, rhs: &BigInt) -> Result<BigInt> {
    let minimum_bits = if lhs.bits() == 0 || rhs.bits() == 0 {
        0
    } else {
        lhs.bits().saturating_add(rhs.bits()).saturating_sub(1)
    };
    check_big_growth(minimum_bits)?;
    let result = lhs * rhs;
    check_big_size(&result)?;
    Ok(result)
}

#[cfg(feature = "bigint")]
fn bounded_big_power(value: &BigInt, exponent: u32) -> Result<BigInt> {
    let mut remaining = exponent;
    if remaining == 0 {
        return Ok(BigInt::from(1));
    }

    let mut factor = value.clone();
    let mut result = BigInt::from(1);
    while remaining > 0 {
        if remaining & 1 == 1 {
            result = bounded_big_multiply(&result, &factor)?;
        }
        remaining >>= 1;
        if remaining > 0 {
            factor = bounded_big_multiply(&factor, &factor)?;
        }
    }
    Ok(result)
}

// promote a numeric f64 to BigInt only when the value is an exact
// integer. fractional or non-finite inputs yield None so callers can
// fall back to f64 arithmetic instead of truncating silently.
#[cfg(feature = "bigint")]
fn num_to_bigint(n: f64) -> Option<BigInt> {
    use num_traits::FromPrimitive;
    if !n.is_finite() || n.fract() != 0.0 {
        return None;
    }
    BigInt::from_f64(n)
}

#[cfg(feature = "bigint")]
fn big_to_f64(b: &BigInt) -> f64 {
    use num_traits::ToPrimitive;
    b.to_f64().unwrap_or(0.0)
}

pub fn add(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    Ok(match (a, b) {
        (Num(x), Num(y)) => Num(x + y),
        (Bool(x), Bool(y)) => Num(((x as i64) + (y as i64)) as f64),
        (Num(x), Bool(y)) | (Bool(y), Num(x)) => Num(x + (y as i64) as f64),

        #[cfg(feature = "bigint")]
        (Big(x), Big(y)) => {
            let result = x + y;
            check_big_size(&result)?;
            Big(result)
        }
        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) | (Num(y), Big(x)) => match num_to_bigint(y) {
            Some(yi) => {
                let result = x + yi;
                check_big_size(&result)?;
                Big(result)
            }
            None => Num(big_to_f64(&x) + y),
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.add(&y)?),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) | (Num(y), Frac(x)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.add(&Fraction::from_int(y as i64))?)
            } else {
                Num(x.to_f64() + y)
            }
        }

        #[cfg(feature = "complex")]
        (Complex(x), Complex(y)) => Complex(x.add(&y)),
        #[cfg(feature = "complex")]
        (Complex(x), Num(y)) | (Num(y), Complex(x)) => {
            Complex(crate::value::Complex::new(x.re + y, x.im))
        }

        #[cfg(feature = "unit")]
        (Unit(x), Unit(y)) => {
            if x.dim != y.dim {
                return Err(Error::DimensionMismatch);
            }
            // result keeps lhs's display unit; display value derives from base_value via the label's scale.
            Unit(crate::value::UnitValue {
                base_value: x.base_value + y.base_value,
                unit_label: x.unit_label,
                dim: x.dim,
            })
        }

        (l, r) => {
            return Err(Error::TypeMismatch {
                op: "+",
                lhs: l.type_name(),
                rhs: r.type_name(),
            });
        }
    })
}

pub fn sub(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    Ok(match (a, b) {
        (Num(x), Num(y)) => Num(x - y),
        (Bool(x), Bool(y)) => Num(((x as i64) - (y as i64)) as f64),
        (Num(x), Bool(y)) => Num(x - (y as i64) as f64),
        (Bool(x), Num(y)) => Num((x as i64) as f64 - y),

        #[cfg(feature = "bigint")]
        (Big(x), Big(y)) => {
            let result = x - y;
            check_big_size(&result)?;
            Big(result)
        }
        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) => match num_to_bigint(y) {
            Some(yi) => {
                let result = x - yi;
                check_big_size(&result)?;
                Big(result)
            }
            None => Num(big_to_f64(&x) - y),
        },
        #[cfg(feature = "bigint")]
        (Num(x), Big(y)) => match num_to_bigint(x) {
            Some(xi) => {
                let result = xi - y;
                check_big_size(&result)?;
                Big(result)
            }
            None => Num(x - big_to_f64(&y)),
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.sub(&y)?),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.sub(&Fraction::from_int(y as i64))?)
            } else {
                Num(x.to_f64() - y)
            }
        }
        #[cfg(feature = "fraction")]
        (Num(x), Frac(y)) => {
            if x.fract() == 0.0 && x.is_finite() {
                Frac(Fraction::from_int(x as i64).sub(&y)?)
            } else {
                Num(x - y.to_f64())
            }
        }

        #[cfg(feature = "complex")]
        (Complex(x), Complex(y)) => Complex(x.sub(&y)),
        #[cfg(feature = "complex")]
        (Complex(x), Num(y)) => Complex(crate::value::Complex::new(x.re - y, x.im)),
        #[cfg(feature = "complex")]
        (Num(x), Complex(y)) => Complex(crate::value::Complex::new(x - y.re, -y.im)),

        #[cfg(feature = "unit")]
        (Unit(x), Unit(y)) => {
            if x.dim != y.dim {
                return Err(Error::DimensionMismatch);
            }
            Unit(crate::value::UnitValue {
                base_value: x.base_value - y.base_value,
                unit_label: x.unit_label,
                dim: x.dim,
            })
        }

        (l, r) => {
            return Err(Error::TypeMismatch {
                op: "-",
                lhs: l.type_name(),
                rhs: r.type_name(),
            });
        }
    })
}

pub fn mul(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    Ok(match (a, b) {
        (Num(x), Num(y)) => Num(x * y),
        (Bool(x), Bool(y)) => Num(((x as i64) * (y as i64)) as f64),
        (Num(x), Bool(y)) | (Bool(y), Num(x)) => Num(x * (y as i64) as f64),

        #[cfg(feature = "bigint")]
        (Big(x), Big(y)) => {
            check_big_growth(big_multiply_growth_bits(&x, &y))?;
            let result = x * y;
            check_big_size(&result)?;
            Big(result)
        }
        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) | (Num(y), Big(x)) => match num_to_bigint(y) {
            Some(yi) => {
                check_big_growth(big_multiply_growth_bits(&x, &yi))?;
                let result = x * yi;
                check_big_size(&result)?;
                Big(result)
            }
            None => Num(big_to_f64(&x) * y),
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.mul(&y)?),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) | (Num(y), Frac(x)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.mul(&Fraction::from_int(y as i64))?)
            } else {
                Num(x.to_f64() * y)
            }
        }

        #[cfg(feature = "complex")]
        (Complex(x), Complex(y)) => Complex(x.mul(&y)),
        #[cfg(feature = "complex")]
        (Complex(x), Num(y)) | (Num(y), Complex(x)) => {
            Complex(crate::value::Complex::new(x.re * y, x.im * y))
        }

        #[cfg(feature = "unit")]
        (Unit(x), Num(y)) | (Num(y), Unit(x)) => Unit(crate::value::UnitValue {
            base_value: x.base_value * y,
            unit_label: x.unit_label,
            dim: x.dim,
        }),
        #[cfg(feature = "unit")]
        (Unit(x), Unit(y)) => {
            let dim = x.dim.checked_add(&y.dim)?;
            let base_value = x.base_value * y.base_value;
            if dim == crate::value::Dimension::SCALAR {
                Num(base_value)
            } else {
                Unit(crate::value::UnitValue {
                    base_value,
                    unit_label: dim.canonical_label(),
                    dim,
                })
            }
        }

        (l, r) => {
            return Err(Error::TypeMismatch {
                op: "*",
                lhs: l.type_name(),
                rhs: r.type_name(),
            });
        }
    })
}

pub fn div(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    Ok(match (a, b) {
        (Num(x), Num(y)) => Num(x / y),

        #[cfg(feature = "bigint")]
        (Big(x), Big(y)) => {
            use num_bigint::BigInt;
            if y == BigInt::from(0) {
                return Err(Error::DivisionByZero);
            }
            Big(x / y)
        }
        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) => match num_to_bigint(y) {
            Some(yi) => {
                if yi == BigInt::from(0) {
                    return Err(Error::DivisionByZero);
                }
                Big(x / yi)
            }
            None => {
                if y == 0.0 {
                    return Err(Error::DivisionByZero);
                }
                Num(big_to_f64(&x) / y)
            }
        },
        #[cfg(feature = "bigint")]
        (Num(x), Big(y)) => {
            if y == BigInt::from(0) {
                return Err(Error::DivisionByZero);
            }
            match num_to_bigint(x) {
                Some(xi) => Big(xi / y),
                None => Num(x / big_to_f64(&y)),
            }
        }

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.div(&y)?),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.div(&Fraction::from_int(y as i64))?)
            } else {
                Num(x.to_f64() / y)
            }
        }
        #[cfg(feature = "fraction")]
        (Num(x), Frac(y)) => {
            if x.fract() == 0.0 && x.is_finite() {
                Frac(Fraction::from_int(x as i64).div(&y)?)
            } else {
                Num(x / y.to_f64())
            }
        }

        #[cfg(feature = "complex")]
        (Complex(x), Complex(y)) => Complex(x.div(&y)?),
        #[cfg(feature = "complex")]
        (Complex(x), Num(y)) => {
            if y == 0.0 {
                return Err(Error::DivisionByZero);
            }
            Complex(crate::value::Complex::new(x.re / y, x.im / y))
        }
        #[cfg(feature = "complex")]
        (Num(x), Complex(y)) => Complex(crate::value::Complex::new(x, 0.0).div(&y)?),

        #[cfg(feature = "unit")]
        (Unit(x), Num(y)) => {
            if y == 0.0 {
                return Err(Error::DivisionByZero);
            }
            Unit(crate::value::UnitValue {
                base_value: x.base_value / y,
                unit_label: x.unit_label,
                dim: x.dim,
            })
        }
        #[cfg(feature = "unit")]
        (Unit(x), Unit(y)) => {
            if y.base_value == 0.0 {
                return Err(Error::DivisionByZero);
            }
            let base = x.base_value / y.base_value;
            let dim = x.dim.checked_sub(&y.dim)?;
            if dim == crate::value::Dimension::SCALAR {
                Num(base)
            } else {
                Unit(crate::value::UnitValue {
                    base_value: base,
                    unit_label: dim.canonical_label(),
                    dim,
                })
            }
        }

        (l, r) => {
            return Err(Error::TypeMismatch {
                op: "/",
                lhs: l.type_name(),
                rhs: r.type_name(),
            });
        }
    })
}

pub fn rem(a: Value, b: Value) -> Result<Value> {
    let x = a.as_f64().ok_or(Error::Domain {
        what: "modulo requires numeric operand",
    })?;
    let y = b.as_f64().ok_or(Error::Domain {
        what: "modulo requires numeric operand",
    })?;
    Ok(Value::Num(x % y))
}

pub fn pow(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    Ok(match (&a, &b) {
        (Num(x), Num(y)) => Num(x.powf(*y)),

        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) if y.fract() == 0.0 && *y >= 0.0 && *y <= u32::MAX as f64 => {
            let exponent = *y as u32;
            let result = bounded_big_power(x, exponent)?;
            Big(result)
        }

        #[cfg(feature = "bigint")]
        (Big(x), Big(y)) => {
            use num_traits::ToPrimitive;
            if let Some(exponent) = y.to_u32() {
                let result = bounded_big_power(x, exponent)?;
                Big(result)
            } else {
                Num(a
                    .as_f64()
                    .ok_or(Error::Domain {
                        what: "pow requires numeric operands",
                    })?
                    .powf(b.as_f64().ok_or(Error::Domain {
                        what: "pow requires numeric operands",
                    })?))
            }
        }

        #[cfg(feature = "complex")]
        (Complex(_), _) | (_, Complex(_)) => {
            // generic complex power: a^b = exp(b * ln(a))
            let ax = to_complex(a)?;
            let bx = to_complex(b)?;
            let r = ax.abs();
            let theta = ax.arg();
            // ln(a) = ln|a| + i*theta
            let ln_re = r.ln();
            let ln_im = theta;
            // b * ln(a)
            let m_re = bx.re * ln_re - bx.im * ln_im;
            let m_im = bx.re * ln_im + bx.im * ln_re;
            // exp = e^re * (cos im + i sin im)
            let scale = m_re.exp();
            Complex(crate::value::Complex::new(
                scale * m_im.cos(),
                scale * m_im.sin(),
            ))
        }

        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) if y.fract() == 0.0 && *y >= 0.0 && *y < 64.0 => Frac(x.pow(*y as u32)?),

        _ => Num(a
            .as_f64()
            .ok_or(Error::Domain {
                what: "pow requires numeric operands",
            })?
            .powf(b.as_f64().ok_or(Error::Domain {
                what: "pow requires numeric operands",
            })?)),
    })
}

#[cfg(feature = "complex")]
fn to_complex(v: Value) -> Result<Complex> {
    Ok(match v {
        Value::Complex(c) => c,
        Value::Num(n) => Complex::new(n, 0.0),
        Value::Bool(b) => Complex::new(if b { 1.0 } else { 0.0 }, 0.0),
        other => {
            return Err(Error::TypeMismatch {
                op: "complex coercion",
                lhs: other.type_name(),
                rhs: "complex",
            });
        }
    })
}

pub fn neg(a: Value) -> Result<Value> {
    use Value::*;
    Ok(match a {
        Num(x) => Num(-x),
        Bool(x) => Num(-((x as i64) as f64)),
        Str(_) => {
            return Err(Error::TypeMismatch {
                op: "unary -",
                lhs: "string",
                rhs: "(none)",
            });
        }
        #[cfg(feature = "bigint")]
        Big(x) => Big(-x),
        #[cfg(feature = "fraction")]
        Frac(x) => Frac(x.neg()),
        #[cfg(feature = "complex")]
        Complex(x) => Complex(x.neg()),
        #[cfg(feature = "unit")]
        Unit(x) => Unit(crate::value::UnitValue {
            base_value: -x.base_value,
            unit_label: x.unit_label,
            dim: x.dim,
        }),
    })
}

pub fn logical_not(a: Value) -> Result<Value> {
    Ok(Value::Num(if a.as_f64().unwrap_or(0.0) == 0.0 {
        1.0
    } else {
        0.0
    }))
}

pub fn factorial(a: Value) -> Result<Value> {
    let n = a.as_f64().ok_or(Error::Domain {
        what: "factorial requires a numeric operand",
    })?;
    Ok(Value::Num(crate::builtins::factorial_f64(n)?))
}
