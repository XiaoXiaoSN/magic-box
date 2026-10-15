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
const MAX_EXACT_FLOAT: f64 = 9_007_199_254_740_991.0;

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

// promote an integral f64 using the integer represented by that f64. This is
// exact for the runtime value, while preserving the documented approximation
// already introduced when a decimal or scientific literal became an f64.
#[cfg(feature = "bigint")]
fn num_to_bigint(n: f64) -> Option<BigInt> {
    use num_traits::FromPrimitive;
    if !n.is_finite() || n.fract() != 0.0 {
        return None;
    }
    BigInt::from_f64(n)
}

#[cfg(feature = "bigint")]
fn promote_num_arithmetic(op: char, x: f64, y: f64) -> Result<Option<Value>> {
    if !x.is_finite()
        || !y.is_finite()
        || x.fract() != 0.0
        || y.fract() != 0.0
        || x.abs() >= 1e21
        || y.abs() >= 1e21
    {
        return Ok(None);
    }
    let both_safe = x.abs() <= MAX_EXACT_FLOAT && y.abs() <= MAX_EXACT_FLOAT;
    let result_exceeds_safe = match op {
        '+' => (x + y).abs() > MAX_EXACT_FLOAT,
        '-' => (x - y).abs() > MAX_EXACT_FLOAT,
        '*' => (x * y).abs() > MAX_EXACT_FLOAT,
        _ => false,
    };
    if both_safe && !result_exceeds_safe {
        return Ok(None);
    }
    let Some(lhs) = num_to_bigint(x) else {
        return Ok(None);
    };
    let Some(rhs) = num_to_bigint(y) else {
        return Ok(None);
    };
    let result = match op {
        '+' => {
            check_big_growth(lhs.bits().max(rhs.bits()).saturating_add(1))?;
            lhs + rhs
        }
        '-' => {
            check_big_growth(lhs.bits().max(rhs.bits()).saturating_add(1))?;
            lhs - rhs
        }
        '*' => bounded_big_multiply(&lhs, &rhs)?,
        _ => return Ok(None),
    };
    check_big_size(&result)?;
    Ok(Some(Value::Big(result)))
}

#[cfg(not(feature = "bigint"))]
fn promote_num_arithmetic(_op: char, _x: f64, _y: f64) -> Result<Option<Value>> {
    Ok(None)
}

#[cfg(feature = "fraction")]
fn fraction_from_num(n: f64) -> Result<Fraction> {
    if !n.is_finite() || n.fract() != 0.0 {
        return Err(Error::Domain {
            what: "fraction conversion requires an integer-valued number",
        });
    }
    #[cfg(feature = "bigint")]
    {
        num_to_bigint(n)
            .map(Fraction::raw_from_int_backend)
            .ok_or(Error::Overflow)
    }
    #[cfg(not(feature = "bigint"))]
    {
        use num_traits::ToPrimitive;
        n.to_i64().map(Fraction::from_int).ok_or(Error::Overflow)
    }
}

#[cfg(feature = "bigint")]
fn floored_big_mod(x: BigInt, y: BigInt) -> BigInt {
    if y == BigInt::from(0) {
        return x;
    }
    let remainder = &x % &y;
    if remainder != BigInt::from(0) && remainder.sign() != y.sign() {
        remainder + y
    } else {
        remainder
    }
}

fn floored_num_mod(x: f64, y: f64) -> f64 {
    if y == 0.0 {
        return x;
    }
    x - y * (x / y).floor()
}

pub fn add(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    Ok(match (a, b) {
        (Num(x), Num(y)) => {
            if let Some(value) = promote_num_arithmetic('+', x, y)? {
                value
            } else {
                Num(x + y)
            }
        }
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
            None => {
                return Err(Error::TypeMismatch {
                    op: "+",
                    lhs: "big",
                    rhs: "number",
                });
            }
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.add(&y)?),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) | (Num(y), Frac(x)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.add(&fraction_from_num(y)?)?)
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
        (Num(x), Num(y)) => {
            if let Some(value) = promote_num_arithmetic('-', x, y)? {
                value
            } else {
                Num(x - y)
            }
        }
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
            None => {
                return Err(Error::TypeMismatch {
                    op: "-",
                    lhs: "big",
                    rhs: "number",
                });
            }
        },
        #[cfg(feature = "bigint")]
        (Num(x), Big(y)) => match num_to_bigint(x) {
            Some(xi) => {
                let result = xi - y;
                check_big_size(&result)?;
                Big(result)
            }
            None => {
                return Err(Error::TypeMismatch {
                    op: "-",
                    lhs: "number",
                    rhs: "big",
                });
            }
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.sub(&y)?),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.sub(&fraction_from_num(y)?)?)
            } else {
                Num(x.to_f64() - y)
            }
        }
        #[cfg(feature = "fraction")]
        (Num(x), Frac(y)) => {
            if x.fract() == 0.0 && x.is_finite() {
                Frac(fraction_from_num(x)?.sub(&y)?)
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
        (Num(x), Num(y)) => {
            if let Some(value) = promote_num_arithmetic('*', x, y)? {
                value
            } else {
                Num(x * y)
            }
        }
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
            None => {
                return Err(Error::TypeMismatch {
                    op: "*",
                    lhs: "big",
                    rhs: "number",
                });
            }
        },

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.mul(&y)?),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) | (Num(y), Frac(x)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.mul(&fraction_from_num(y)?)?)
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
                return Err(Error::TypeMismatch {
                    op: "/",
                    lhs: "big",
                    rhs: "number",
                });
            }
        },
        #[cfg(feature = "bigint")]
        (Num(x), Big(y)) => {
            if y == BigInt::from(0) {
                return Err(Error::DivisionByZero);
            }
            match num_to_bigint(x) {
                Some(xi) => Big(xi / y),
                None => {
                    return Err(Error::TypeMismatch {
                        op: "/",
                        lhs: "number",
                        rhs: "big",
                    });
                }
            }
        }

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Frac(x.div(&y)?),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) => {
            if y.fract() == 0.0 && y.is_finite() {
                Frac(x.div(&fraction_from_num(y)?)?)
            } else {
                Num(x.to_f64() / y)
            }
        }
        #[cfg(feature = "fraction")]
        (Num(x), Frac(y)) => {
            if x.fract() == 0.0 && x.is_finite() {
                Frac(fraction_from_num(x)?.div(&y)?)
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
    use Value::*;
    match (a, b) {
        (Num(x), Num(y)) => Ok(Num(floored_num_mod(x, y))),

        #[cfg(feature = "bigint")]
        (Big(x), Big(y)) => Ok(Big(floored_big_mod(x, y))),
        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) => {
            let y = num_to_bigint(y).ok_or(Error::TypeMismatch {
                op: "%",
                lhs: "big",
                rhs: "number",
            })?;
            Ok(Big(floored_big_mod(x, y)))
        }
        #[cfg(feature = "bigint")]
        (Num(x), Big(y)) => {
            let x = num_to_bigint(x).ok_or(Error::TypeMismatch {
                op: "%",
                lhs: "number",
                rhs: "big",
            })?;
            Ok(Big(floored_big_mod(x, y)))
        }

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => Ok(Frac(x.rem(&y)?)),
        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) if y.is_finite() && y.fract() == 0.0 => {
            Ok(Frac(x.rem(&fraction_from_num(y)?)?))
        }
        #[cfg(feature = "fraction")]
        (Num(x), Frac(y)) if x.is_finite() && x.fract() == 0.0 => {
            Ok(Frac(fraction_from_num(x)?.rem(&y)?))
        }
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Big(x), Frac(y)) => Ok(Frac(Fraction::raw_from_int_backend(x).rem(&y)?)),
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Frac(x), Big(y)) => Ok(Frac(x.rem(&Fraction::raw_from_int_backend(y))?)),

        (l, r) => {
            let x = l.as_f64().ok_or(Error::Domain {
                what: "modulo requires numeric operand",
            })?;
            let y = r.as_f64().ok_or(Error::Domain {
                what: "modulo requires numeric operand",
            })?;
            Ok(Num(floored_num_mod(x, y)))
        }
    }
}

pub fn pow(a: Value, b: Value) -> Result<Value> {
    use Value::*;
    match (a, b) {
        (Num(x), Num(y)) => {
            #[cfg(feature = "bigint")]
            if y.is_finite()
                && y.fract() == 0.0
                && y >= 0.0
                && y <= u32::MAX as f64
                && x.abs() < 1e21
                && (x.abs() > MAX_EXACT_FLOAT || x.powf(y).abs() > MAX_EXACT_FLOAT)
                && let Some(base) = num_to_bigint(x)
            {
                return Ok(Big(bounded_big_power(&base, y as u32)?));
            }
            #[cfg(feature = "complex")]
            if x < 0.0 && y.fract() != 0.0 {
                return Ok(Complex(complex_power(
                    crate::value::Complex::new(x, 0.0),
                    crate::value::Complex::new(y, 0.0),
                )));
            }
            Ok(Num(x.powf(y)))
        }

        #[cfg(feature = "bigint")]
        (Big(x), Num(y)) => {
            if y.fract() == 0.0 && y >= 0.0 && y <= u32::MAX as f64 {
                return Ok(Big(bounded_big_power(&x, y as u32)?));
            }
            Err(Error::TypeMismatch {
                op: "^",
                lhs: "big",
                rhs: "number",
            })
        }

        #[cfg(feature = "bigint")]
        (Num(x), Big(y)) => {
            use num_traits::ToPrimitive;
            let exponent = y.to_u32().ok_or(Error::TypeMismatch {
                op: "^",
                lhs: "number",
                rhs: "big",
            })?;
            let base = num_to_bigint(x).ok_or(Error::TypeMismatch {
                op: "^",
                lhs: "number",
                rhs: "big",
            })?;
            Ok(Big(bounded_big_power(&base, exponent)?))
        }

        #[cfg(feature = "bigint")]
        (Big(x), Big(y)) => {
            use num_traits::ToPrimitive;
            let exponent = y.to_u32().ok_or(Error::TypeMismatch {
                op: "^",
                lhs: "big",
                rhs: "big",
            })?;
            Ok(Big(bounded_big_power(&x, exponent)?))
        }

        #[cfg(feature = "complex")]
        (Complex(x), rhs) => {
            if let Some(exponent) = complex_integer_exponent(&rhs) {
                return Ok(Complex(complex_pow_integer(x, exponent)?));
            }
            Ok(Complex(complex_power(x, to_complex(rhs)?)))
        }
        #[cfg(feature = "complex")]
        (lhs, Complex(y)) => {
            if let Some(exponent) = complex_integer_exponent(&Complex(y)) {
                return Ok(Complex(complex_pow_integer(to_complex(lhs)?, exponent)?));
            }
            Ok(Complex(complex_power(to_complex(lhs)?, y)))
        }

        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) if y.fract() == 0.0 && (0.0..64.0).contains(&y) => {
            Ok(Frac(x.pow(y as u32)?))
        }

        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Frac(x), Big(y)) => {
            use num_traits::ToPrimitive;
            let exponent = y.to_u32().ok_or(Error::TypeMismatch {
                op: "^",
                lhs: "fraction",
                rhs: "big",
            })?;
            Ok(Frac(x.pow(exponent)?))
        }

        (lhs, rhs) => {
            let x = lhs.as_f64().ok_or(Error::Domain {
                what: "pow requires numeric operands",
            })?;
            let y = rhs.as_f64().ok_or(Error::Domain {
                what: "pow requires numeric operands",
            })?;
            Ok(Num(x.powf(y)))
        }
    }
}

#[cfg(feature = "complex")]
fn to_complex(v: Value) -> Result<Complex> {
    Ok(match v {
        Value::Complex(c) => c,
        Value::Num(n) => Complex::new(n, 0.0),
        Value::Bool(b) => Complex::new(if b { 1.0 } else { 0.0 }, 0.0),
        #[cfg(feature = "bigint")]
        Value::Big(b) => {
            use num_traits::ToPrimitive;
            Complex::new(b.to_f64().ok_or(Error::Overflow)?, 0.0)
        }
        #[cfg(feature = "fraction")]
        Value::Frac(f) => Complex::new(f.to_f64(), 0.0),
        other => {
            return Err(Error::TypeMismatch {
                op: "complex coercion",
                lhs: other.type_name(),
                rhs: "complex",
            });
        }
    })
}

#[cfg(feature = "complex")]
fn complex_integer_exponent(value: &Value) -> Option<i64> {
    match value {
        Value::Num(n) if n.is_finite() && n.fract() == 0.0 => {
            if *n >= i64::MIN as f64 && *n <= i64::MAX as f64 {
                Some(*n as i64)
            } else {
                None
            }
        }
        #[cfg(feature = "bigint")]
        Value::Big(n) => {
            use num_traits::ToPrimitive;
            n.to_i64()
        }
        Value::Complex(c) if c.im == 0.0 && c.re.is_finite() && c.re.fract() == 0.0 => {
            if c.re >= i64::MIN as f64 && c.re <= i64::MAX as f64 {
                Some(c.re as i64)
            } else {
                None
            }
        }
        _ => None,
    }
}

#[cfg(feature = "complex")]
fn complex_pow_integer(base: Complex, exponent: i64) -> Result<Complex> {
    let negative = exponent < 0;
    let mut remaining = exponent.unsigned_abs();
    let mut factor = base;
    if negative {
        factor = Complex::new(1.0, 0.0).div(&factor)?;
    }
    let mut result = Complex::new(1.0, 0.0);
    while remaining > 0 {
        if remaining & 1 == 1 {
            result = result.mul(&factor);
        }
        remaining >>= 1;
        if remaining > 0 {
            factor = factor.mul(&factor);
        }
    }
    Ok(result)
}

#[cfg(feature = "complex")]
fn complex_power(base: Complex, exponent: Complex) -> Complex {
    // principal complex power: a^b = exp(b * ln(a)).
    let radius = base.abs();
    let angle = base.arg();
    let log_re = radius.ln();
    let log_im = angle;
    let magnitude_re = exponent.re * log_re - exponent.im * log_im;
    let magnitude_im = exponent.re * log_im + exponent.im * log_re;
    let scale = magnitude_re.exp();
    Complex::new(scale * magnitude_im.cos(), scale * magnitude_im.sin())
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
    #[cfg(feature = "bigint")]
    if let Value::Big(n) = &a {
        use num_bigint::Sign;
        use num_traits::ToPrimitive;

        if n.sign() == Sign::Minus {
            return Err(Error::Domain {
                what: "factorial requires a non-negative integer",
            });
        }
        let count = n.to_u32().ok_or(Error::LimitExceeded {
            what: "factorial operand",
            limit: u32::MAX as usize,
        })?;
        let mut result = BigInt::from(1);
        for value in 2..=count {
            result = bounded_big_multiply(&result, &BigInt::from(value))?;
        }
        return Ok(Value::Big(result));
    }
    let n = a.as_f64().ok_or(Error::Domain {
        what: "factorial requires a numeric operand",
    })?;
    Ok(Value::Num(crate::builtins::factorial_f64(n)?))
}
