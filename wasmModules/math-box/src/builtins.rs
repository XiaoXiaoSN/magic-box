use alloc::vec::Vec;
use core::f64::consts;

use crate::error::{Error, Result};
use crate::namespace::{Arity, Namespace};
use crate::ops;
use crate::value::{Value, values_to_f64};

pub fn default_namespace() -> Namespace {
    let mut ns = Namespace::new();

    // constants
    ns.set_const_num("PI", consts::PI);
    ns.set_const_num("pi", consts::PI);
    ns.set_const_num("E", consts::E);
    ns.set_const_num("e", consts::E);
    ns.set_const_num("TAU", consts::TAU);
    ns.set_const_num("tau", consts::TAU);
    ns.set_const_num("Infinity", f64::INFINITY);
    ns.set_const_num("NaN", f64::NAN);

    #[cfg(feature = "complex")]
    ns.set_const("i", Value::Complex(crate::value::Complex::new(0.0, 1.0)));

    // ─── numeric (legacy f64 path) ─────────────────────────────
    let exact = Arity::Exact;
    let range = |min, max| Arity::Range { min, max };

    macro_rules! num1 {
        ($name:literal, $f:expr) => {
            ns.set_fn($name, exact(1), true, |a| {
                let v = values_to_f64(a)?;
                Ok(Value::Num($f(v[0])))
            });
        };
    }
    macro_rules! num2 {
        ($name:literal, $f:expr) => {
            ns.set_fn($name, exact(2), true, |a| {
                let v = values_to_f64(a)?;
                Ok(Value::Num($f(v[0], v[1])))
            });
        };
    }

    num1!("sin", f64::sin);
    num1!("cos", f64::cos);
    num1!("tan", f64::tan);
    num1!("asin", f64::asin);
    num1!("acos", f64::acos);
    num1!("atan", f64::atan);
    num2!("atan2", f64::atan2);

    num1!("sinh", f64::sinh);
    num1!("cosh", f64::cosh);
    num1!("tanh", f64::tanh);
    num1!("asinh", f64::asinh);
    num1!("acosh", f64::acosh);
    num1!("atanh", f64::atanh);

    num1!("exp", f64::exp);
    num1!("ln", f64::ln);
    num1!("log2", f64::log2);
    num1!("log10", f64::log10);
    ns.set_fn("pow", exact(2), true, |a| {
        ops::pow(a[0].clone(), a[1].clone())
    });
    ns.set_fn("sqrt", exact(1), true, sqrt_value);
    num1!("cbrt", f64::cbrt);

    num1!("floor", f64::floor);
    num1!("ceil", f64::ceil);
    num1!("round", f64::round);
    num1!("trunc", f64::trunc);

    ns.set_fn("log", range(1, 2), true, |a| {
        let v = values_to_f64(a)?;
        if v.len() == 1 {
            Ok(Value::Num(v[0].ln()))
        } else {
            let base = v[1];
            if base <= 0.0 || base == 1.0 {
                return Err(Error::Domain {
                    what: "log base must be positive and != 1",
                });
            }
            Ok(Value::Num(v[0].log(base)))
        }
    });

    ns.set_fn("abs", exact(1), true, |a| match &a[0] {
        #[cfg(feature = "bigint")]
        Value::Big(value) => Ok(Value::Big(abs_big(value.clone()))),
        #[cfg(feature = "fraction")]
        Value::Frac(value) => Ok(Value::Frac(value.abs())),
        #[cfg(feature = "complex")]
        Value::Complex(c) => Ok(Value::Num(c.abs())),
        #[cfg(feature = "unit")]
        Value::Unit(value) => {
            let display_value = value.display_value().abs();
            Ok(Value::Unit(crate::value::UnitValue {
                base_value: if value.affine {
                    display_value * value.display_factor + value.display_offset
                } else {
                    value.base_value.abs()
                },
                unit_label: value.unit_label.clone(),
                display_factor: value.display_factor,
                display_offset: value.display_offset,
                dim: value.dim,
                affine: value.affine,
            }))
        }
        _ => Ok(Value::Num(values_to_f64(a)?[0].abs())),
    });

    ns.set_fn("sign", exact(1), true, |a| {
        let n = values_to_f64(a)?[0];
        Ok(Value::Num(if n == 0.0 { 0.0 } else { n.signum() }))
    });

    ns.set_fn("hypot", range(1, 32), true, |a| {
        let v = values_to_f64(a)?;
        Ok(Value::Num(v.iter().map(|x| x * x).sum::<f64>().sqrt()))
    });

    ns.set_fn("min", range(1, 32), true, |a| select_extreme(a, false));
    ns.set_fn("max", range(1, 32), true, |a| select_extreme(a, true));

    ns.set_fn("fact", exact(1), true, |a| ops::factorial(a[0].clone()));

    ns.set_fn("gcd", range(2, 32), true, gcd_values);
    ns.set_fn("lcm", range(2, 32), true, lcm_values);

    // ─── BigInt ────────────────────────────────────────────────
    #[cfg(feature = "bigint")]
    {
        ns.set_fn("big", exact(1), true, |a| {
            use num_traits::FromPrimitive;
            match &a[0] {
                Value::Big(b) => Ok(Value::Big(b.clone())),
                Value::Num(n) => {
                    // reject non-integer or non-finite floats so we never
                    // silently truncate the fractional part. callers wanting
                    // a rounded result should call floor()/round() first.
                    if !n.is_finite() || n.fract() != 0.0 {
                        return Err(Error::Domain {
                            what: "big() requires an integer-valued number",
                        });
                    }
                    num_bigint::BigInt::from_f64(*n)
                        .map(Value::Big)
                        .ok_or(Error::Overflow)
                }
                _ => Err(Error::Domain {
                    what: "big() expects a number",
                }),
            }
        });
    }

    // ─── Fraction ──────────────────────────────────────────────
    #[cfg(feature = "fraction")]
    {
        ns.set_fn("frac", exact(2), true, |a| {
            // accept Num or Big for either side; Big preserves precision
            // when literals come from `n`-suffixed BigInt syntax.
            let num = to_frac(&a[0])?;
            let den = to_frac(&a[1])?;
            Ok(Value::Frac(num.div(&den)?))
        });
    }

    // ─── Complex ───────────────────────────────────────────────
    #[cfg(feature = "complex")]
    {
        ns.set_fn("complex", exact(2), true, |a| {
            let v = values_to_f64(a)?;
            Ok(Value::Complex(crate::value::Complex::new(v[0], v[1])))
        });
        ns.set_fn("re", exact(1), true, |a| match &a[0] {
            Value::Complex(c) => Ok(Value::Num(c.re)),
            other => Ok(Value::Num(other.as_f64().ok_or(Error::Domain {
                what: "re requires a numeric operand",
            })?)),
        });
        ns.set_fn("im", exact(1), true, |a| match &a[0] {
            Value::Complex(c) => Ok(Value::Num(c.im)),
            other => {
                other.as_f64().ok_or(Error::Domain {
                    what: "im requires a numeric operand",
                })?;
                Ok(Value::Num(0.0))
            }
        });
        ns.set_fn("conj", exact(1), true, |a| match &a[0] {
            Value::Complex(c) => Ok(Value::Complex(c.conj())),
            other => Ok(other.clone()),
        });
        ns.set_fn("arg", exact(1), true, |a| match &a[0] {
            Value::Complex(c) => Ok(Value::Num(c.arg())),
            other => {
                let n = other.as_f64().ok_or(Error::Domain {
                    what: "arg requires a numeric operand",
                })?;
                Ok(Value::Num(if n >= 0.0 {
                    0.0
                } else {
                    core::f64::consts::PI
                }))
            }
        });
    }

    // ─── Units ─────────────────────────────────────────────────
    // two API surfaces:
    //   `unit(value, "km")`         → constructs Value::Unit
    //   `convert(unit, "m")`        → 2-arg, dimension-checked rescale
    //   `convert(value, from, to)`  → 3-arg fallback when caller supplies
    //                                 raw SI ratios numerically
    #[cfg(feature = "unit")]
    {
        ns.set_fn("unit", exact(2), true, |a| {
            let value = a[0].as_f64().ok_or(Error::Domain {
                what: "unit() requires a numeric value as the first argument",
            })?;
            let label = a[1].as_str().ok_or(Error::Domain {
                what: "unit() requires a string label as the second argument",
            })?;
            let spec = crate::units::parse_expression(label)?;
            let base_value = value * spec.factor + spec.offset;
            if spec.dim == crate::value::Dimension::TEMPERATURE && base_value < 0.0 {
                return Err(Error::Domain {
                    what: "temperature below absolute zero",
                });
            }
            Ok(Value::Unit(crate::value::UnitValue {
                base_value,
                unit_label: label.into(),
                display_factor: spec.factor,
                display_offset: spec.offset,
                dim: spec.dim,
                affine: spec.affine,
            }))
        });

        ns.set_fn("convert", range(2, 3), true, |a| {
            if a.len() == 3 {
                // legacy 3-arg numeric form: convert(value, from_factor, to_factor)
                let v = values_to_f64(a)?;
                if v[2] == 0.0 {
                    return Err(Error::DivisionByZero);
                }
                return Ok(Value::Num(v[0] * v[1] / v[2]));
            }
            let unit_v = match &a[0] {
                Value::Unit(u) => u.clone(),
                _ => {
                    return Err(Error::Domain {
                        what: "convert() expects a Unit as first argument",
                    });
                }
            };
            let to_label = a[1].as_str().ok_or(Error::Domain {
                what: "convert() expects a string target label",
            })?;
            let spec = crate::units::parse_expression(to_label)?;
            if unit_v.dim != spec.dim {
                return Err(Error::DimensionMismatch);
            }
            if spec.dim == crate::value::Dimension::TEMPERATURE && unit_v.base_value < 0.0 {
                return Err(Error::Domain {
                    what: "temperature below absolute zero",
                });
            }
            Ok(Value::Unit(crate::value::UnitValue {
                base_value: unit_v.base_value,
                unit_label: to_label.into(),
                display_factor: spec.factor,
                display_offset: spec.offset,
                dim: spec.dim,
                affine: spec.affine,
            }))
        });
    }

    ns
}

fn select_extreme(args: &[Value], maximum: bool) -> Result<Value> {
    let mut selected = args.first().cloned().ok_or(Error::UnexpectedEof)?;
    for candidate in &args[1..] {
        let op = if maximum {
            crate::parser::CmpOp::Gt
        } else {
            crate::parser::CmpOp::Lt
        };
        let is_better = match ops::compare(candidate.clone(), selected.clone(), op)? {
            Value::Bool(value) => value,
            _ => false,
        };
        if is_better {
            selected = candidate.clone();
        }
    }
    Ok(selected)
}

pub fn factorial_f64(n: f64) -> Result<f64> {
    if !n.is_finite() || n < 0.0 || n.fract() != 0.0 {
        return Err(Error::Domain {
            what: "factorial requires a non-negative integer (v0)",
        });
    }
    let k = n as u32;
    if k > 170 {
        return Err(Error::Overflow);
    }
    let mut acc: f64 = 1.0;
    for i in 2..=k {
        acc *= i as f64;
    }
    Ok(acc)
}

#[cfg(feature = "fraction")]
fn to_frac(v: &Value) -> Result<crate::value::Fraction> {
    match v {
        Value::Num(n) => {
            if !n.is_finite() || n.fract() != 0.0 {
                return Err(Error::Domain {
                    what: "frac() expects integer-valued operands",
                });
            }
            crate::value::Fraction::from_f64_integer(*n)
        }
        #[cfg(feature = "bigint")]
        Value::Big(b) => Ok(crate::value::Fraction::raw_from_int_backend(b.clone())),
        Value::Frac(f) => Ok(f.clone()),
        _ => Err(Error::Domain {
            what: "frac() expects an integer-valued argument",
        }),
    }
}

fn sqrt_value(args: &[Value]) -> Result<Value> {
    #[cfg(feature = "unit")]
    if let Value::Unit(value) = &args[0] {
        if value.affine
            || value.dim.length % 2 != 0
            || value.dim.mass % 2 != 0
            || value.dim.time % 2 != 0
            || value.dim.temperature % 2 != 0
            || value.dim.data % 2 != 0
        {
            return Err(Error::TypeMismatch {
                op: "sqrt",
                lhs: "unit",
                rhs: "even-dimensional unit",
            });
        }
        if value.base_value < 0.0 {
            return Err(Error::Domain {
                what: "sqrt requires a non-negative unit value",
            });
        }
        let dim = crate::value::Dimension {
            length: value.dim.length / 2,
            mass: value.dim.mass / 2,
            time: value.dim.time / 2,
            temperature: value.dim.temperature / 2,
            data: value.dim.data / 2,
        };
        return Ok(Value::Unit(crate::value::UnitValue {
            base_value: value.base_value.sqrt(),
            unit_label: crate::units::format_sqrt(&value.unit_label)
                .unwrap_or_else(|| value.dim.canonical_label()),
            display_factor: value.display_factor.sqrt(),
            display_offset: 0.0,
            dim,
            affine: false,
        }));
    }

    #[cfg(feature = "complex")]
    if let Value::Complex(value) = &args[0] {
        let radius = value.abs();
        let re = ((radius + value.re) / 2.0).sqrt();
        let im = ((radius - value.re) / 2.0).sqrt()
            * if value.im.is_sign_negative() {
                -1.0
            } else {
                1.0
            };
        return Ok(Value::Complex(crate::value::Complex::new(re, im)));
    }

    let value = args[0].as_f64().ok_or(Error::Domain {
        what: "sqrt requires a numeric operand",
    })?;
    #[cfg(feature = "complex")]
    if value < 0.0 {
        return Ok(Value::Complex(crate::value::Complex::new(
            0.0,
            (-value).sqrt(),
        )));
    }
    Ok(Value::Num(value.sqrt()))
}

#[cfg(feature = "bigint")]
fn integer_big(value: &Value) -> Result<num_bigint::BigInt> {
    use num_traits::FromPrimitive;

    match value {
        Value::Big(value) => Ok(value.clone()),
        Value::Num(value) if value.is_finite() && value.fract() == 0.0 => {
            num_bigint::BigInt::from_f64(*value).ok_or(Error::Overflow)
        }
        #[cfg(feature = "fraction")]
        Value::Frac(value) => value.integer_backend().ok_or(Error::Domain {
            what: "gcd/lcm requires integer arguments",
        }),
        _ => Err(Error::Domain {
            what: "gcd/lcm requires integer arguments",
        }),
    }
}

#[cfg(feature = "bigint")]
fn abs_big(value: num_bigint::BigInt) -> num_bigint::BigInt {
    if value.sign() == num_bigint::Sign::Minus {
        -value
    } else {
        value
    }
}

#[cfg(feature = "bigint")]
fn gcd_big(mut left: num_bigint::BigInt, mut right: num_bigint::BigInt) -> num_bigint::BigInt {
    left = abs_big(left);
    right = abs_big(right);
    while right != num_bigint::BigInt::from(0) {
        let remainder = &left % &right;
        left = right;
        right = remainder;
    }
    left
}

#[cfg(feature = "bigint")]
fn gcd_values(args: &[Value]) -> Result<Value> {
    let mut result = integer_big(&args[0])?;
    for value in &args[1..] {
        result = gcd_big(result, integer_big(value)?);
    }
    Ok(Value::Big(result))
}

#[cfg(feature = "bigint")]
fn lcm_values(args: &[Value]) -> Result<Value> {
    use crate::limits::MAX_NUMERIC_BITS;

    let values = args.iter().map(integer_big).collect::<Result<Vec<_>>>()?;
    let mut result = abs_big(values[0].clone());
    for value in values.into_iter().skip(1).map(abs_big) {
        if result == num_bigint::BigInt::from(0) || value == num_bigint::BigInt::from(0) {
            return Ok(Value::Big(num_bigint::BigInt::from(0)));
        }
        let divisor = gcd_big(result.clone(), value.clone());
        let reduced = &result / &divisor;
        let minimum_bits = reduced
            .bits()
            .saturating_add(value.bits())
            .saturating_sub(1);
        if minimum_bits > MAX_NUMERIC_BITS as u64 {
            return Err(Error::LimitExceeded {
                what: "numeric bit length",
                limit: MAX_NUMERIC_BITS,
            });
        }
        result = reduced * value;
        if result.bits() > MAX_NUMERIC_BITS as u64 {
            return Err(Error::LimitExceeded {
                what: "numeric bit length",
                limit: MAX_NUMERIC_BITS,
            });
        }
    }
    Ok(Value::Big(result))
}

#[cfg(not(feature = "bigint"))]
fn integer_i128(value: &Value) -> Result<i128> {
    match value {
        Value::Num(value)
            if value.is_finite()
                && value.fract() == 0.0
                && *value >= i64::MIN as f64
                && *value < 9_223_372_036_854_775_808.0 =>
        {
            Ok(*value as i128)
        }
        #[cfg(feature = "fraction")]
        Value::Frac(value) => value
            .integer_backend()
            .map(i128::from)
            .ok_or(Error::Domain {
                what: "gcd/lcm requires integer arguments",
            }),
        _ => Err(Error::Domain {
            what: "gcd/lcm requires integer arguments",
        }),
    }
}

#[cfg(not(feature = "bigint"))]
fn gcd_values(args: &[Value]) -> Result<Value> {
    let mut left = integer_i128(&args[0])?.abs();
    for value in &args[1..] {
        let mut right = integer_i128(value)?.abs();
        while right != 0 {
            let remainder = left % right;
            left = right;
            right = remainder;
        }
    }
    Ok(Value::Num(left as f64))
}

#[cfg(not(feature = "bigint"))]
fn lcm_values(args: &[Value]) -> Result<Value> {
    let values = args.iter().map(integer_i128).collect::<Result<Vec<_>>>()?;
    let mut result = values[0].abs();
    for value in values.into_iter().skip(1).map(i128::abs) {
        if result == 0 || value == 0 {
            return Ok(Value::Num(0.0));
        }
        let mut left = result;
        let mut right = value;
        while right != 0 {
            let remainder = left % right;
            left = right;
            right = remainder;
        }
        result = (result / left).checked_mul(value).ok_or(Error::Overflow)?;
    }
    Ok(Value::Num(result as f64))
}
