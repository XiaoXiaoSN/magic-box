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
use num_bigint::BigInt;

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
        (Big(x), Big(y)) => Big(x + y),
        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) | (Num(y), Big(x)) => match num_to_bigint(y) {
            Some(yi) => Big(x + yi),
            None => Num(big_to_f64(&x) + y),
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.add(&y)),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) | (Num(y), Frac(x)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.add(&Fraction::from_int(y as i64)))
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

        (l, r) => return Err(Error::TypeMismatch { op: "+", lhs: l.type_name(), rhs: r.type_name() }),
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
        (Big(x), Big(y)) => Big(x - y),
        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) => match num_to_bigint(y) {
            Some(yi) => Big(x - yi),
            None => Num(big_to_f64(&x) - y),
        },
        #[cfg(feature = "bigint")]
        (Num(x), Big(y)) => match num_to_bigint(x) {
            Some(xi) => Big(xi - y),
            None => Num(x - big_to_f64(&y)),
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.sub(&y)),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.sub(&Fraction::from_int(y as i64)))
            } else {
                Num(x.to_f64() - y)
            }
        }
        #[cfg(feature = "fraction")]
        (Num(x), Frac(y)) => {
            if x.fract() == 0.0 && x.is_finite() {
                Frac(Fraction::from_int(x as i64).sub(&y))
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

        (l, r) => return Err(Error::TypeMismatch { op: "-", lhs: l.type_name(), rhs: r.type_name() }),
    })
}

pub fn mul(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    Ok(match (a, b) {
        (Num(x), Num(y)) => Num(x * y),
        (Bool(x), Bool(y)) => Num(((x as i64) * (y as i64)) as f64),
        (Num(x), Bool(y)) | (Bool(y), Num(x)) => Num(x * (y as i64) as f64),

        #[cfg(feature = "bigint")]
        (Big(x), Big(y)) => Big(x * y),
        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) | (Num(y), Big(x)) => match num_to_bigint(y) {
            Some(yi) => Big(x * yi),
            None => Num(big_to_f64(&x) * y),
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.mul(&y)),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) | (Num(y), Frac(x)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.mul(&Fraction::from_int(y as i64)))
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
        (Unit(x), Unit(y)) => Unit(crate::value::UnitValue {
            base_value: x.base_value * y.base_value,
            unit_label: alloc::format!("{} {}", x.unit_label, y.unit_label),
            dim: x.dim.add(&y.dim),
        }),

        (l, r) => return Err(Error::TypeMismatch { op: "*", lhs: l.type_name(), rhs: r.type_name() }),
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
            let dim = x.dim.sub(&y.dim);
            if dim == crate::value::Dimension::SCALAR {
                Num(base)
            } else {
                Unit(crate::value::UnitValue {
                    base_value: base,
                    unit_label: alloc::format!("{}/{}", x.unit_label, y.unit_label),
                    dim,
                })
            }
        }

        (l, r) => return Err(Error::TypeMismatch { op: "/", lhs: l.type_name(), rhs: r.type_name() }),
    })
}

pub fn rem(a: Value, b: Value) -> Result<Value> {
    let x = a.as_f64().ok_or(Error::Domain { what: "modulo requires numeric operand" })?;
    let y = b.as_f64().ok_or(Error::Domain { what: "modulo requires numeric operand" })?;
    Ok(Value::Num(x % y))
}

pub fn pow(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    Ok(match (&a, &b) {
        (Num(x), Num(y)) => Num(x.powf(*y)),

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
            Complex(crate::value::Complex::new(scale * m_im.cos(), scale * m_im.sin()))
        }

        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) if y.fract() == 0.0 && *y >= 0.0 && *y < 64.0 => {
            // integer power on fraction
            let n = *y as i64;
            let mut acc = crate::value::Fraction::from_int(1);
            for _ in 0..n {
                acc = acc.mul(x);
            }
            Frac(acc)
        }

        _ => Num(
            a.as_f64()
                .ok_or(Error::Domain { what: "pow requires numeric operands" })?
                .powf(
                    b.as_f64()
                        .ok_or(Error::Domain { what: "pow requires numeric operands" })?,
                ),
        ),
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
            return Err(Error::TypeMismatch { op: "unary -", lhs: "string", rhs: "(none)" });
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
    Ok(Value::Num(if a.as_f64().unwrap_or(0.0) == 0.0 { 1.0 } else { 0.0 }))
}

pub fn factorial(a: Value) -> Result<Value> {
    let n = a
        .as_f64()
        .ok_or(Error::Domain { what: "factorial requires a numeric operand" })?;
    Ok(Value::Num(crate::builtins::factorial_f64(n)?))
}
