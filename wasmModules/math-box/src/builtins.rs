use core::f64::consts;

use crate::error::{Error, Result};
use crate::namespace::{Arity, Namespace};
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
    num2!("pow", f64::powf);
    num1!("sqrt", f64::sqrt);
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
                return Err(Error::Domain { what: "log base must be positive and != 1" });
            }
            Ok(Value::Num(v[0].log(base)))
        }
    });

    ns.set_fn("abs", exact(1), true, |a| {
        match &a[0] {
            #[cfg(feature = "complex")]
            Value::Complex(c) => Ok(Value::Num(c.abs())),
            _ => Ok(Value::Num(values_to_f64(a)?[0].abs())),
        }
    });

    ns.set_fn("sign", exact(1), true, |a| {
        let n = values_to_f64(a)?[0];
        Ok(Value::Num(if n == 0.0 { 0.0 } else { n.signum() }))
    });

    ns.set_fn("hypot", range(1, 32), true, |a| {
        let v = values_to_f64(a)?;
        Ok(Value::Num(v.iter().map(|x| x * x).sum::<f64>().sqrt()))
    });

    ns.set_fn("min", range(1, 32), true, |a| {
        let v = values_to_f64(a)?;
        Ok(Value::Num(v.iter().copied().fold(f64::INFINITY, f64::min)))
    });
    ns.set_fn("max", range(1, 32), true, |a| {
        let v = values_to_f64(a)?;
        Ok(Value::Num(v.iter().copied().fold(f64::NEG_INFINITY, f64::max)))
    });

    ns.set_fn("fact", exact(1), true, |a| {
        let n = values_to_f64(a)?[0];
        Ok(Value::Num(factorial_f64(n)?))
    });

    // gcd / lcm — variadic over integer-valued numbers.
    // both delegate to num_integer::Integer::{gcd,lcm}, which canonicalises
    // sign and treats gcd(0,0) = 0 (mathematical convention).
    ns.set_fn("gcd", range(2, 32), true, |a| {
        use num_integer::Integer;
        let v = values_to_f64(a)?;
        let mut acc = v[0].abs() as i64;
        for x in &v[1..] {
            acc = acc.gcd(&(x.abs() as i64));
        }
        Ok(Value::Num(acc as f64))
    });
    ns.set_fn("lcm", range(2, 32), true, |a| {
        use num_integer::Integer;
        let v = values_to_f64(a)?;
        let mut acc = v[0].abs() as i64;
        for x in &v[1..] {
            acc = acc.lcm(&(x.abs() as i64));
        }
        Ok(Value::Num(acc as f64))
    });

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
                _ => Err(Error::Domain { what: "big() expects a number" }),
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
            other => Ok(Value::Num(other.as_f64().unwrap_or(0.0))),
        });
        ns.set_fn("im", exact(1), true, |a| match &a[0] {
            Value::Complex(c) => Ok(Value::Num(c.im)),
            _ => Ok(Value::Num(0.0)),
        });
        ns.set_fn("conj", exact(1), true, |a| match &a[0] {
            Value::Complex(c) => Ok(Value::Complex(c.conj())),
            other => Ok(other.clone()),
        });
        ns.set_fn("arg", exact(1), true, |a| match &a[0] {
            Value::Complex(c) => Ok(Value::Num(c.arg())),
            other => {
                let n = other.as_f64().unwrap_or(0.0);
                Ok(Value::Num(if n >= 0.0 { 0.0 } else { core::f64::consts::PI }))
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
            let value = a[0].as_f64()
                .ok_or(Error::Domain { what: "unit() requires a numeric value as the first argument" })?;
            let label = a[1].as_str()
                .ok_or(Error::Domain { what: "unit() requires a string label as the second argument" })?;
            let (scale, dim) = crate::units::lookup(label)
                .ok_or(Error::Domain { what: "unknown unit label" })?;
            Ok(Value::Unit(crate::value::UnitValue {
                base_value: value * scale,
                unit_label: label.into(),
                dim,
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
                _ => return Err(Error::Domain { what: "convert() expects a Unit as first argument" }),
            };
            let to_label = a[1]
                .as_str()
                .ok_or(Error::Domain { what: "convert() expects a string target label" })?;
            let (_, dim) = crate::units::lookup(to_label)
                .ok_or(Error::Domain { what: "unknown unit label" })?;
            if unit_v.dim != dim {
                return Err(Error::DimensionMismatch);
            }
            // base_value is dimension-invariant; the new label drives display scale.
            Ok(Value::Unit(crate::value::UnitValue {
                base_value: unit_v.base_value,
                unit_label: to_label.into(),
                dim,
            }))
        });
    }

    ns
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
                return Err(Error::Domain { what: "frac() expects integer-valued operands" });
            }
            Ok(crate::value::Fraction::from_int(*n as i64))
        }
        #[cfg(feature = "bigint")]
        Value::Big(b) => Ok(crate::value::Fraction::raw_from_int_backend(b.clone())),
        Value::Frac(f) => Ok(f.clone()),
        _ => Err(Error::Domain { what: "frac() expects an integer-valued argument" }),
    }
}
