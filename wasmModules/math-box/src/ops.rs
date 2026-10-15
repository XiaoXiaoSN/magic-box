// runtime arithmetic dispatch over the heterogeneous Value type. each
// op walks a small match table covering the supported operand
// combinations, promoting where reasonable (e.g. Num + Big → Big).

use crate::error::{Error, Result};
use crate::parser::CmpOp;
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
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Big(x), Frac(y)) => Frac(Fraction::raw_from_int_backend(x).add(&y)?),
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Frac(x), Big(y)) => Frac(x.add(&Fraction::raw_from_int_backend(y))?),

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
            if x.affine || y.affine {
                return Err(Error::TypeMismatch {
                    op: "+",
                    lhs: "affine unit",
                    rhs: "affine unit",
                });
            }
            let base_value = x.base_value + y.base_value;
            check_temperature(base_value, x.dim)?;
            Unit(crate::value::UnitValue {
                base_value,
                unit_label: x.unit_label,
                display_factor: x.display_factor,
                display_offset: x.display_offset,
                dim: x.dim,
                affine: false,
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
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Big(x), Frac(y)) => Frac(Fraction::raw_from_int_backend(x).sub(&y)?),
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Frac(x), Big(y)) => Frac(x.sub(&Fraction::raw_from_int_backend(y))?),

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
            if x.affine || y.affine {
                return Err(Error::TypeMismatch {
                    op: "-",
                    lhs: "affine unit",
                    rhs: "affine unit",
                });
            }
            let base_value = x.base_value - y.base_value;
            check_temperature(base_value, x.dim)?;
            Unit(crate::value::UnitValue {
                base_value,
                unit_label: x.unit_label,
                display_factor: x.display_factor,
                display_offset: x.display_offset,
                dim: x.dim,
                affine: false,
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
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Big(x), Frac(y)) => Frac(Fraction::raw_from_int_backend(x).mul(&y)?),
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Frac(x), Big(y)) => Frac(x.mul(&Fraction::raw_from_int_backend(y))?),

        #[cfg(feature = "complex")]
        (Complex(x), Complex(y)) => Complex(x.mul(&y)),
        #[cfg(feature = "complex")]
        (Complex(x), Num(y)) | (Num(y), Complex(x)) => {
            Complex(crate::value::Complex::new(x.re * y, x.im * y))
        }

        #[cfg(feature = "unit")]
        (Unit(x), Num(y)) | (Num(y), Unit(x)) => {
            if x.affine {
                return Err(Error::TypeMismatch {
                    op: "*",
                    lhs: "affine unit",
                    rhs: "number",
                });
            }
            let base_value = x.base_value * y;
            check_temperature(base_value, x.dim)?;
            Unit(crate::value::UnitValue {
                base_value,
                unit_label: x.unit_label,
                display_factor: x.display_factor,
                display_offset: 0.0,
                dim: x.dim,
                affine: false,
            })
        }
        #[cfg(feature = "unit")]
        (Unit(x), Unit(y)) => {
            if x.affine || y.affine {
                return Err(Error::TypeMismatch {
                    op: "*",
                    lhs: "affine unit",
                    rhs: "unit",
                });
            }
            let dim = x.dim.checked_add(&y.dim)?;
            let base_value = x.base_value * y.base_value;
            if dim == crate::value::Dimension::SCALAR {
                Num(base_value)
            } else {
                check_temperature(base_value, dim)?;
                let same_dimension = x.dim == y.dim;
                Unit(crate::value::UnitValue {
                    base_value,
                    unit_label: if same_dimension {
                        dim.canonical_label()
                    } else {
                        crate::units::format_product(&x.unit_label, &y.unit_label)
                    },
                    display_factor: if same_dimension {
                        1.0
                    } else {
                        x.display_factor * y.display_factor
                    },
                    display_offset: 0.0,
                    dim,
                    affine: false,
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
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Big(x), Frac(y)) => Frac(Fraction::raw_from_int_backend(x).div(&y)?),
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Frac(x), Big(y)) => Frac(x.div(&Fraction::raw_from_int_backend(y))?),

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
            if x.affine {
                return Err(Error::TypeMismatch {
                    op: "/",
                    lhs: "affine unit",
                    rhs: "number",
                });
            }
            let base_value = x.base_value / y;
            check_temperature(base_value, x.dim)?;
            Unit(crate::value::UnitValue {
                base_value,
                unit_label: x.unit_label,
                display_factor: x.display_factor,
                display_offset: 0.0,
                dim: x.dim,
                affine: false,
            })
        }
        #[cfg(feature = "unit")]
        (Num(x), Unit(y)) => {
            if y.affine {
                return Err(Error::TypeMismatch {
                    op: "/",
                    lhs: "number",
                    rhs: "affine unit",
                });
            }
            if y.base_value == 0.0 {
                return Err(Error::DivisionByZero);
            }
            let dim = crate::value::Dimension::SCALAR.checked_sub(&y.dim)?;
            if dim == crate::value::Dimension::SCALAR {
                Num(x / y.base_value)
            } else {
                let base_value = x / y.base_value;
                check_temperature(base_value, dim)?;
                Unit(crate::value::UnitValue {
                    base_value,
                    unit_label: crate::units::format_quotient("", &y.unit_label),
                    display_factor: 1.0 / y.display_factor,
                    display_offset: 0.0,
                    dim,
                    affine: false,
                })
            }
        }
        #[cfg(feature = "unit")]
        (Unit(x), Unit(y)) => {
            if x.affine || y.affine {
                return Err(Error::TypeMismatch {
                    op: "/",
                    lhs: "affine unit",
                    rhs: "unit",
                });
            }
            if y.base_value == 0.0 {
                return Err(Error::DivisionByZero);
            }
            let base = x.base_value / y.base_value;
            let dim = x.dim.checked_sub(&y.dim)?;
            if dim == crate::value::Dimension::SCALAR {
                Num(base)
            } else {
                check_temperature(base, dim)?;
                Unit(crate::value::UnitValue {
                    base_value: base,
                    unit_label: crate::units::format_quotient(&x.unit_label, &y.unit_label),
                    display_factor: x.display_factor / y.display_factor,
                    display_offset: 0.0,
                    dim,
                    affine: false,
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
            if y == 0.0 {
                return Ok(Big(x));
            }
            let y = num_to_bigint(y).ok_or(Error::TypeMismatch {
                op: "%",
                lhs: "big",
                rhs: "number",
            })?;
            Ok(Big(floored_big_mod(x, y)))
        }
        #[cfg(feature = "bigint")]
        (Num(x), Big(y)) => {
            if y == BigInt::from(0) {
                return Ok(Num(x));
            }
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
        (Big(x), Frac(y)) => {
            use num_traits::Zero;
            if y.0.numer().is_zero() {
                return Ok(Big(x));
            }
            Ok(Frac(Fraction::raw_from_int_backend(x).rem(&y)?))
        }
        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Frac(x), Big(y)) => Ok(Frac(x.rem(&Fraction::raw_from_int_backend(y))?)),

        #[cfg(feature = "unit")]
        (Unit(x), Unit(y)) => {
            if x.dim != y.dim {
                return Err(Error::DimensionMismatch);
            }
            if x.affine || y.affine {
                return Err(Error::TypeMismatch {
                    op: "%",
                    lhs: "affine unit",
                    rhs: "affine unit",
                });
            }
            let value = floored_num_mod(x.base_value, y.base_value);
            check_temperature(value, x.dim)?;
            Ok(Unit(crate::value::UnitValue {
                base_value: value,
                unit_label: x.unit_label,
                display_factor: x.display_factor,
                display_offset: 0.0,
                dim: x.dim,
                affine: false,
            }))
        }

        #[cfg(feature = "bigint")]
        (Big(_), rhs) => Err(Error::TypeMismatch {
            op: "%",
            lhs: "big",
            rhs: rhs.type_name(),
        }),
        #[cfg(feature = "bigint")]
        (lhs, Big(_)) => Err(Error::TypeMismatch {
            op: "%",
            lhs: lhs.type_name(),
            rhs: "big",
        }),
        #[cfg(all(feature = "fraction", feature = "complex"))]
        (Frac(_), Complex(_)) | (Complex(_), Frac(_)) => Err(Error::TypeMismatch {
            op: "%",
            lhs: "fraction",
            rhs: "complex",
        }),

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
            if y.is_finite() && y.fract() == 0.0 && y >= 0.0 && y <= u32::MAX as f64 {
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

        #[cfg(all(feature = "bigint", feature = "fraction"))]
        (Big(x), Frac(y)) => {
            use num_traits::ToPrimitive;
            let exponent = y.integer_backend().and_then(|value| value.to_u32()).ok_or(
                Error::TypeMismatch {
                    op: "^",
                    lhs: "big",
                    rhs: "fraction",
                },
            )?;
            Ok(Big(bounded_big_power(&x, exponent)?))
        }

        #[cfg(feature = "fraction")]
        (Frac(x), Num(y)) => {
            if y.is_finite() && y.fract() == 0.0 && y >= 0.0 && y <= u32::MAX as f64 {
                return Ok(Frac(x.pow(y as u32)?));
            }
            #[cfg(feature = "complex")]
            if y.is_finite() && y.fract() != 0.0 && x.to_f64() < 0.0 {
                return Ok(Complex(complex_power(
                    crate::value::Complex::new(x.to_f64(), 0.0),
                    crate::value::Complex::new(y, 0.0),
                )));
            }
            Err(Error::TypeMismatch {
                op: "^",
                lhs: "fraction",
                rhs: "number",
            })
        }

        #[cfg(feature = "fraction")]
        (Num(x), Frac(y)) => {
            use num_traits::ToPrimitive;
            if let Some(integer) = y.integer_backend() {
                if let Some(exponent) = integer.to_u32() {
                    #[cfg(feature = "bigint")]
                    if x.is_finite()
                        && x.fract() == 0.0
                        && x.abs() < 1e21
                        && let Some(base) = num_to_bigint(x)
                        && (x.abs() > MAX_EXACT_FLOAT
                            || x.powf(exponent as f64).abs() > MAX_EXACT_FLOAT)
                    {
                        return Ok(Big(bounded_big_power(&base, exponent)?));
                    }
                    return Ok(Num(x.powf(exponent as f64)));
                }
                return Err(Error::TypeMismatch {
                    op: "^",
                    lhs: "number",
                    rhs: "fraction",
                });
            }
            #[cfg(feature = "complex")]
            if x < 0.0 {
                return Ok(Complex(complex_power(
                    crate::value::Complex::new(x, 0.0),
                    crate::value::Complex::new(y.to_f64(), 0.0),
                )));
            }
            if y.to_f64().is_finite() {
                Ok(Num(x.powf(y.to_f64())))
            } else {
                Err(Error::TypeMismatch {
                    op: "^",
                    lhs: "number",
                    rhs: "fraction",
                })
            }
        }

        #[cfg(all(feature = "fraction", feature = "bigint"))]
        (Frac(x), Big(y)) => {
            use num_traits::ToPrimitive;
            let exponent = y.to_u32().ok_or(Error::TypeMismatch {
                op: "^",
                lhs: "fraction",
                rhs: "big",
            })?;
            Ok(Frac(x.pow(exponent)?))
        }

        #[cfg(feature = "fraction")]
        (Frac(x), Frac(y)) => {
            use num_traits::ToPrimitive;
            if let Some(integer) = y.integer_backend() {
                if let Some(exponent) = integer.to_u32() {
                    return Ok(Frac(x.pow(exponent)?));
                }
                return Err(Error::TypeMismatch {
                    op: "^",
                    lhs: "fraction",
                    rhs: "fraction",
                });
            }
            #[cfg(feature = "complex")]
            if x.to_f64() < 0.0 {
                return Ok(Complex(complex_power(
                    crate::value::Complex::new(x.to_f64(), 0.0),
                    crate::value::Complex::new(y.to_f64(), 0.0),
                )));
            }
            Err(Error::TypeMismatch {
                op: "^",
                lhs: "fraction",
                rhs: "fraction",
            })
        }

        #[cfg(feature = "unit")]
        (Unit(value), exponent) => {
            let exponent_name = exponent.type_name();
            if value.affine {
                return Err(Error::TypeMismatch {
                    op: "^",
                    lhs: "affine unit",
                    rhs: exponent_name,
                });
            }
            let exponent = integer_exponent(&exponent).ok_or(Error::TypeMismatch {
                op: "^",
                lhs: "unit",
                rhs: exponent_name,
            })?;
            let dim = value.dim.checked_mul(exponent)?;
            if dim == crate::value::Dimension::SCALAR {
                return Ok(Num(value.base_value.powi(i32::from(exponent))));
            }
            let base_value = value.base_value.powi(i32::from(exponent));
            check_temperature(base_value, dim)?;
            Ok(Unit(crate::value::UnitValue {
                base_value,
                unit_label: alloc::format!("{}^{}", value.unit_label, exponent),
                display_factor: value.display_factor.powi(i32::from(exponent)),
                display_offset: 0.0,
                dim,
                affine: false,
            }))
        }

        #[cfg(all(feature = "bigint", feature = "complex"))]
        (Big(_), Complex(_)) => Err(Error::TypeMismatch {
            op: "^",
            lhs: "big",
            rhs: "complex",
        }),
        #[cfg(all(feature = "fraction", feature = "complex"))]
        (Frac(_), Complex(_)) => Err(Error::TypeMismatch {
            op: "^",
            lhs: "fraction",
            rhs: "complex",
        }),

        #[cfg(feature = "complex")]
        (Complex(x), rhs) => {
            let rhs_name = rhs.type_name();
            if let Some(exponent) = complex_integer_exponent(&rhs) {
                return Ok(Complex(complex_pow_integer(x, exponent)?));
            }
            if is_exact_integral_value(&rhs) {
                return Err(Error::TypeMismatch {
                    op: "^",
                    lhs: "complex",
                    rhs: rhs_name,
                });
            }
            Ok(Complex(complex_power(x, to_complex(rhs)?)))
        }
        #[cfg(feature = "complex")]
        (lhs, Complex(y)) => {
            let lhs_name = lhs.type_name();
            if let Some(exponent) = complex_integer_exponent(&Complex(y)) {
                return Ok(Complex(complex_pow_integer(to_complex(lhs)?, exponent)?));
            }
            if is_exact_integral_value(&Complex(y)) {
                return Err(Error::TypeMismatch {
                    op: "^",
                    lhs: lhs_name,
                    rhs: "complex",
                });
            }
            Ok(Complex(complex_power(to_complex(lhs)?, y)))
        }

        #[cfg(feature = "bigint")]
        (Big(_), rhs) => Err(Error::TypeMismatch {
            op: "^",
            lhs: "big",
            rhs: rhs.type_name(),
        }),
        #[cfg(feature = "bigint")]
        (lhs, Big(_)) => Err(Error::TypeMismatch {
            op: "^",
            lhs: lhs.type_name(),
            rhs: "big",
        }),
        #[cfg(feature = "fraction")]
        (Frac(_), rhs) => Err(Error::TypeMismatch {
            op: "^",
            lhs: "fraction",
            rhs: rhs.type_name(),
        }),
        #[cfg(feature = "fraction")]
        (lhs, Frac(_)) => Err(Error::TypeMismatch {
            op: "^",
            lhs: lhs.type_name(),
            rhs: "fraction",
        }),

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

#[cfg(feature = "unit")]
fn integer_exponent(value: &Value) -> Option<i8> {
    match value {
        Value::Num(value) if value.is_finite() && value.fract() == 0.0 => {
            i8::try_from(*value as i16).ok()
        }
        #[cfg(feature = "bigint")]
        Value::Big(value) => {
            use num_traits::ToPrimitive;
            value.to_i8()
        }
        #[cfg(feature = "fraction")]
        Value::Frac(value) => {
            use num_traits::ToPrimitive;
            value.integer_backend()?.to_i8()
        }
        _ => None,
    }
}

pub fn compare(a: Value, b: Value, op: CmpOp) -> Result<Value> {
    use core::cmp::Ordering;

    if let (Value::Bool(left), Value::Bool(right)) = (&a, &b) {
        let equal = left == right;
        return Ok(Value::Bool(match op {
            CmpOp::Eq => equal,
            CmpOp::NotEq => !equal,
            _ => (*left as u8).cmp(&(*right as u8)).matches(op),
        }));
    }

    #[cfg(feature = "unit")]
    if let (Value::Unit(left), Value::Unit(right)) = (&a, &b) {
        if left.dim != right.dim {
            return Err(Error::DimensionMismatch);
        }
        return Ok(Value::Bool(compare_f64(
            left.base_value,
            right.base_value,
            op,
        )));
    }

    if matches!(&a, Value::Str(_)) || matches!(&b, Value::Str(_)) {
        return Err(Error::TypeMismatch {
            op: comparison_symbol(op),
            lhs: a.type_name(),
            rhs: b.type_name(),
        });
    }

    #[cfg(feature = "complex")]
    if let (Value::Complex(left), Value::Complex(right)) = (&a, &b) {
        if !matches!(op, CmpOp::Eq | CmpOp::NotEq) {
            return Err(Error::TypeMismatch {
                op: comparison_symbol(op),
                lhs: "complex",
                rhs: "complex",
            });
        }
        let equal = left.re == right.re && left.im == right.im;
        return Ok(Value::Bool(if op == CmpOp::Eq { equal } else { !equal }));
    }

    #[cfg(feature = "bigint")]
    if let (Value::Big(left), Value::Big(right)) = (&a, &b) {
        return Ok(Value::Bool(left.cmp(right).matches(op)));
    }

    #[cfg(feature = "bigint")]
    if let (Value::Big(left), Value::Num(right)) = (&a, &b)
        && let Some(right) = num_to_bigint(*right)
    {
        return Ok(Value::Bool(left.cmp(&right).matches(op)));
    }

    #[cfg(feature = "bigint")]
    if let (Value::Num(left), Value::Big(right)) = (&a, &b)
        && let Some(left) = num_to_bigint(*left)
    {
        return Ok(Value::Bool(left.cmp(right).matches(op)));
    }

    #[cfg(feature = "fraction")]
    if let (Value::Frac(left), Value::Frac(right)) = (&a, &b) {
        return Ok(Value::Bool(left.0.cmp(&right.0).matches(op)));
    }

    #[cfg(feature = "fraction")]
    if let (Value::Frac(left), Value::Num(right)) = (&a, &b)
        && let Ok(right) = Fraction::from_f64_integer(*right)
    {
        return Ok(Value::Bool(left.0.cmp(&right.0).matches(op)));
    }

    #[cfg(feature = "fraction")]
    if let (Value::Num(left), Value::Frac(right)) = (&a, &b)
        && let Ok(left) = Fraction::from_f64_integer(*left)
    {
        return Ok(Value::Bool(left.0.cmp(&right.0).matches(op)));
    }

    #[cfg(all(feature = "bigint", feature = "fraction"))]
    if let (Value::Big(left), Value::Frac(right)) = (&a, &b) {
        let left = crate::value::Fraction::raw_from_int_backend(left.clone());
        return Ok(Value::Bool(left.0.cmp(&right.0).matches(op)));
    }

    #[cfg(all(feature = "bigint", feature = "fraction"))]
    if let (Value::Frac(left), Value::Big(right)) = (&a, &b) {
        let right = crate::value::Fraction::raw_from_int_backend(right.clone());
        return Ok(Value::Bool(left.0.cmp(&right.0).matches(op)));
    }

    let left = a.as_f64().ok_or(Error::TypeMismatch {
        op: comparison_symbol(op),
        lhs: a.type_name(),
        rhs: b.type_name(),
    })?;
    let right = b.as_f64().ok_or(Error::TypeMismatch {
        op: comparison_symbol(op),
        lhs: a.type_name(),
        rhs: b.type_name(),
    })?;
    let ordering = left.partial_cmp(&right);
    let result = match op {
        CmpOp::Eq => ordering == Some(Ordering::Equal),
        CmpOp::NotEq => ordering != Some(Ordering::Equal),
        CmpOp::Lt => ordering == Some(Ordering::Less),
        CmpOp::LtEq => matches!(ordering, Some(Ordering::Less | Ordering::Equal)),
        CmpOp::Gt => ordering == Some(Ordering::Greater),
        CmpOp::GtEq => matches!(ordering, Some(Ordering::Greater | Ordering::Equal)),
    };
    Ok(Value::Bool(result))
}

fn comparison_symbol(op: CmpOp) -> &'static str {
    match op {
        CmpOp::Lt => "<",
        CmpOp::LtEq => "<=",
        CmpOp::Gt => ">",
        CmpOp::GtEq => ">=",
        CmpOp::Eq => "==",
        CmpOp::NotEq => "!=",
    }
}

fn compare_f64(left: f64, right: f64, op: CmpOp) -> bool {
    use core::cmp::Ordering;
    let ordering = left.partial_cmp(&right);
    match op {
        CmpOp::Eq => ordering == Some(Ordering::Equal),
        CmpOp::NotEq => ordering != Some(Ordering::Equal),
        CmpOp::Lt => ordering == Some(Ordering::Less),
        CmpOp::LtEq => matches!(ordering, Some(Ordering::Less | Ordering::Equal)),
        CmpOp::Gt => ordering == Some(Ordering::Greater),
        CmpOp::GtEq => matches!(ordering, Some(Ordering::Greater | Ordering::Equal)),
    }
}

trait OrderingMatches {
    fn matches(self, op: CmpOp) -> bool;
}

impl OrderingMatches for core::cmp::Ordering {
    fn matches(self, op: CmpOp) -> bool {
        match op {
            CmpOp::Eq => self == core::cmp::Ordering::Equal,
            CmpOp::NotEq => self != core::cmp::Ordering::Equal,
            CmpOp::Lt => self == core::cmp::Ordering::Less,
            CmpOp::LtEq => matches!(self, core::cmp::Ordering::Less | core::cmp::Ordering::Equal),
            CmpOp::Gt => self == core::cmp::Ordering::Greater,
            CmpOp::GtEq => {
                matches!(
                    self,
                    core::cmp::Ordering::Greater | core::cmp::Ordering::Equal
                )
            }
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
            if *n >= i64::MIN as f64 && *n < 9_223_372_036_854_775_808.0 {
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
        #[cfg(feature = "fraction")]
        Value::Frac(value) => {
            use num_traits::ToPrimitive;
            value.integer_backend()?.to_i64()
        }
        Value::Complex(c) if c.im == 0.0 && c.re.is_finite() && c.re.fract() == 0.0 => {
            if c.re >= i64::MIN as f64 && c.re < 9_223_372_036_854_775_808.0 {
                Some(c.re as i64)
            } else {
                None
            }
        }
        _ => None,
    }
}

#[cfg(feature = "complex")]
fn is_exact_integral_value(value: &Value) -> bool {
    match value {
        Value::Num(n) => n.is_finite() && n.fract() == 0.0,
        #[cfg(feature = "bigint")]
        Value::Big(_) => true,
        #[cfg(feature = "fraction")]
        Value::Frac(value) => value.integer_backend().is_some(),
        Value::Complex(value) => value.im == 0.0 && value.re.is_finite() && value.re.fract() == 0.0,
        _ => false,
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
        Unit(x) => {
            let display_value = -x.display_value();
            let base_value = if x.affine {
                display_value * x.display_factor + x.display_offset
            } else {
                -x.base_value
            };
            check_temperature(base_value, x.dim)?;
            Unit(crate::value::UnitValue {
                base_value,
                unit_label: x.unit_label,
                display_factor: x.display_factor,
                display_offset: x.display_offset,
                dim: x.dim,
                affine: x.affine,
            })
        }
    })
}

#[cfg(feature = "unit")]
fn check_temperature(base_value: f64, dim: crate::value::Dimension) -> Result<()> {
    if dim == crate::value::Dimension::TEMPERATURE && base_value < 0.0 {
        return Err(Error::Domain {
            what: "temperature below absolute zero",
        });
    }
    Ok(())
}

pub fn logical_not(a: Value) -> Result<Value> {
    match a {
        Value::Bool(value) => Ok(Value::Bool(!value)),
        value => Err(Error::TypeMismatch {
            op: "!",
            lhs: value.type_name(),
            rhs: "boolean",
        }),
    }
}

pub fn percent(a: Value) -> Result<Value> {
    #[cfg(all(feature = "bigint", feature = "fraction"))]
    if let Value::Big(value) = a {
        return Ok(Value::Frac(
            Fraction::raw_from_int_backend(value).div(&fraction_from_num(100.0)?)?,
        ));
    }
    #[cfg(all(feature = "bigint", not(feature = "fraction")))]
    if let Value::Big(value) = a {
        use num_traits::ToPrimitive;
        return Ok(Value::Num(value.to_f64().ok_or(Error::Overflow)? / 100.0));
    }
    div(a, Value::Num(100.0))
}

pub fn factorial(a: Value) -> Result<Value> {
    #[cfg(feature = "bigint")]
    {
        use num_traits::FromPrimitive;

        let count = match &a {
            Value::Big(value) => Some(value.clone()),
            Value::Num(value) if value.is_finite() && value.fract() == 0.0 => {
                Some(BigInt::from_f64(*value).ok_or(Error::Overflow)?)
            }
            #[cfg(feature = "fraction")]
            Value::Frac(value) => Some(value.integer_backend().ok_or(Error::Domain {
                what: "factorial requires a non-negative integer",
            })?),
            _ => None,
        };
        if let Some(count) = count {
            use num_bigint::Sign;
            use num_traits::ToPrimitive;

            if count.sign() == Sign::Minus {
                return Err(Error::Domain {
                    what: "factorial requires a non-negative integer",
                });
            }
            let count = count.to_u32().ok_or(Error::LimitExceeded {
                what: "factorial operand",
                limit: u32::MAX as usize,
            })?;
            let mut result = BigInt::from(1);
            for value in 2..=count {
                result = bounded_big_multiply(&result, &BigInt::from(value))?;
            }
            return Ok(Value::Big(result));
        }
    }

    #[cfg(all(feature = "fraction", not(feature = "bigint")))]
    if let Value::Frac(value) = &a {
        if value.integer_backend().is_none() {
            return Err(Error::Domain {
                what: "factorial requires a non-negative integer",
            });
        }
    }
    let n = a.as_f64().ok_or(Error::Domain {
        what: "factorial requires a numeric operand",
    })?;
    Ok(Value::Num(crate::builtins::factorial_f64(n)?))
}
