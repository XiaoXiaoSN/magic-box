use alloc::string::{String, ToString};
use alloc::vec::Vec;
use core::fmt;

use crate::error::{Error, Result};

#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Num(f64),
    Bool(bool),
    Str(String),
    #[cfg(feature = "bigint")]
    Big(num_bigint::BigInt),
    #[cfg(feature = "fraction")]
    Frac(Fraction),
    #[cfg(feature = "complex")]
    Complex(Complex),
    #[cfg(feature = "unit")]
    Unit(UnitValue),
}

impl Value {
    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Num(n) => Some(*n),
            Self::Bool(b) => Some(if *b { 1.0 } else { 0.0 }),
            Self::Str(_) => None,
            #[cfg(feature = "bigint")]
            Self::Big(b) => bigint_to_f64(b),
            #[cfg(feature = "fraction")]
            Self::Frac(f) => Some(f.to_f64()),
            #[cfg(feature = "complex")]
            Self::Complex(c) => {
                if c.im == 0.0 {
                    Some(c.re)
                } else {
                    None
                }
            }
            #[cfg(feature = "unit")]
            Self::Unit(u) => Some(u.display_value()),
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            Self::Str(s) => Some(s.as_str()),
            _ => None,
        }
    }

    pub fn to_display_string(&self) -> String {
        match self {
            Self::Num(n) => format_num(*n),
            Self::Bool(b) => b.to_string(),
            Self::Str(s) => s.clone(),
            #[cfg(feature = "bigint")]
            Self::Big(b) => b.to_string(),
            #[cfg(feature = "fraction")]
            Self::Frac(f) => f.to_display_string(),
            #[cfg(feature = "complex")]
            Self::Complex(c) => c.to_display_string(),
            #[cfg(feature = "unit")]
            Self::Unit(u) => u.to_display_string(),
        }
    }

    pub fn type_name(&self) -> &'static str {
        match self {
            Self::Num(_) => "number",
            Self::Bool(_) => "boolean",
            Self::Str(_) => "string",
            #[cfg(feature = "bigint")]
            Self::Big(_) => "big",
            #[cfg(feature = "fraction")]
            Self::Frac(_) => "fraction",
            #[cfg(feature = "complex")]
            Self::Complex(_) => "complex",
            #[cfg(feature = "unit")]
            Self::Unit(_) => "unit",
        }
    }
}

impl fmt::Display for Value {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.to_display_string())
    }
}

#[cfg(feature = "bigint")]
fn bigint_to_f64(b: &num_bigint::BigInt) -> Option<f64> {
    use num_traits::ToPrimitive;
    b.to_f64()
}

pub fn format_num(n: f64) -> String {
    if n.is_nan() {
        return "NaN".to_string();
    }
    if n.is_infinite() {
        return if n.is_sign_negative() { "-Infinity" } else { "Infinity" }.to_string();
    }
    if n.fract() == 0.0 && n.abs() < 1e16 {
        return (n as i64).to_string();
    }
    let mut s = alloc::format!("{n}");
    if s.contains('.') && !s.contains('e') && !s.contains('E') {
        while s.ends_with('0') {
            s.pop();
        }
        if s.ends_with('.') {
            s.pop();
        }
    }
    s
}

// ────────────────────────────────────────────────────────────────────
// Fraction — newtype over num_rational::Ratio<FracInt>
// — backend: BigInt when `bigint` feature on, i64 otherwise
// — Ratio normalises (gcd reduce + sign canonicalise) on construction
// ────────────────────────────────────────────────────────────────────

#[cfg(all(feature = "fraction", feature = "bigint"))]
pub type FracInt = num_bigint::BigInt;

#[cfg(all(feature = "fraction", not(feature = "bigint")))]
pub type FracInt = i64;

#[cfg(feature = "fraction")]
type RatioInner = num_rational::Ratio<FracInt>;

#[cfg(feature = "fraction")]
#[derive(Clone, Debug, PartialEq)]
pub struct Fraction(pub(crate) RatioInner);

#[cfg(feature = "fraction")]
impl Fraction {
    pub fn new(num: FracInt, den: FracInt) -> Result<Self> {
        use num_traits::Zero;
        if den.is_zero() {
            return Err(Error::DivisionByZero);
        }
        // Ratio::new normalises (gcd reduce + flips sign so den > 0)
        Ok(Self(RatioInner::new(num, den)))
    }

    pub fn from_int(n: i64) -> Self {
        Self(RatioInner::from_integer(frac_from_i64(n)))
    }

    // wrap an integer that's already in the active backend (BigInt or i64)
    // as a fraction with denominator 1. avoids re-allocating through i64
    // when the caller already has a backend-native value.
    pub(crate) fn raw_from_int_backend(num: FracInt) -> Self {
        Self(RatioInner::from_integer(num))
    }

    pub fn to_f64(&self) -> f64 {
        // num_rational's ToPrimitive impl is gated on num-bigint-std; sidestep
        // it by converting numerator/denominator separately. ToPrimitive is
        // implemented on both BigInt and i64 unconditionally.
        use num_traits::ToPrimitive;
        let n = self.0.numer().to_f64().unwrap_or(0.0);
        let d = self.0.denom().to_f64().unwrap_or(1.0);
        n / d
    }

    pub fn to_display_string(&self) -> String {
        use num_traits::One;
        if self.0.denom().is_one() {
            self.0.numer().to_string()
        } else {
            alloc::format!("{}/{}", self.0.numer(), self.0.denom())
        }
    }

    pub fn add(&self, other: &Self) -> Self {
        Self(&self.0 + &other.0)
    }
    pub fn sub(&self, other: &Self) -> Self {
        Self(&self.0 - &other.0)
    }
    pub fn mul(&self, other: &Self) -> Self {
        Self(&self.0 * &other.0)
    }
    pub fn div(&self, other: &Self) -> Result<Self> {
        use num_traits::Zero;
        if other.0.numer().is_zero() {
            return Err(Error::DivisionByZero);
        }
        Ok(Self(&self.0 / &other.0))
    }
    pub fn neg(&self) -> Self {
        Self(-&self.0)
    }
}

#[cfg(feature = "fraction")]
#[inline]
fn frac_from_i64(n: i64) -> FracInt {
    #[cfg(feature = "bigint")]
    {
        num_bigint::BigInt::from(n)
    }
    #[cfg(not(feature = "bigint"))]
    {
        n
    }
}

// ────────────────────────────────────────────────────────────────────
// Complex — re + im*i, both f64
// ────────────────────────────────────────────────────────────────────

#[cfg(feature = "complex")]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Complex {
    pub re: f64,
    pub im: f64,
}

#[cfg(feature = "complex")]
impl Complex {
    pub fn new(re: f64, im: f64) -> Self {
        Self { re, im }
    }

    pub fn add(&self, other: &Self) -> Self {
        Self { re: self.re + other.re, im: self.im + other.im }
    }
    pub fn sub(&self, other: &Self) -> Self {
        Self { re: self.re - other.re, im: self.im - other.im }
    }
    pub fn mul(&self, other: &Self) -> Self {
        Self {
            re: self.re * other.re - self.im * other.im,
            im: self.re * other.im + self.im * other.re,
        }
    }
    pub fn div(&self, other: &Self) -> Result<Self> {
        let denom = other.re * other.re + other.im * other.im;
        if denom == 0.0 {
            return Err(Error::DivisionByZero);
        }
        Ok(Self {
            re: (self.re * other.re + self.im * other.im) / denom,
            im: (self.im * other.re - self.re * other.im) / denom,
        })
    }
    pub fn neg(&self) -> Self {
        Self { re: -self.re, im: -self.im }
    }
    pub fn abs(&self) -> f64 {
        (self.re * self.re + self.im * self.im).sqrt()
    }
    pub fn arg(&self) -> f64 {
        self.im.atan2(self.re)
    }
    pub fn conj(&self) -> Self {
        Self { re: self.re, im: -self.im }
    }

    pub fn to_display_string(self) -> String {
        if self.im == 0.0 {
            return format_num(self.re);
        }
        if self.re == 0.0 {
            if self.im == 1.0 {
                return "i".to_string();
            }
            if self.im == -1.0 {
                return "-i".to_string();
            }
            return alloc::format!("{}i", format_num(self.im));
        }
        let sign = if self.im >= 0.0 { "+" } else { "-" };
        let im_abs = format_num(self.im.abs());
        let im_part = if im_abs == "1" { "i".to_string() } else { alloc::format!("{im_abs}i") };
        alloc::format!("{}{sign}{im_part}", format_num(self.re))
    }
}

// ────────────────────────────────────────────────────────────────────
// Unit — value + dimensional vector + scale to base SI
// ────────────────────────────────────────────────────────────────────

#[cfg(feature = "unit")]
#[derive(Clone, Debug, PartialEq)]
pub struct UnitValue {
    pub base_value: f64,    // value normalised to base SI of the dimension
    pub unit_label: String, // e.g. "km" — single labels look up scale; composite forms ("km m", "m/s") imply scale 1
    pub dim: Dimension,     // exponents over (length, mass, time)
}

#[cfg(feature = "unit")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Dimension {
    pub length: i8,
    pub mass: i8,
    pub time: i8,
}

#[cfg(feature = "unit")]
impl Dimension {
    pub const SCALAR: Self = Self { length: 0, mass: 0, time: 0 };
    pub const LENGTH: Self = Self { length: 1, mass: 0, time: 0 };
    pub const MASS: Self = Self { length: 0, mass: 1, time: 0 };
    pub const TIME: Self = Self { length: 0, mass: 0, time: 1 };

    pub fn add(&self, other: &Self) -> Self {
        Self {
            length: self.length + other.length,
            mass: self.mass + other.mass,
            time: self.time + other.time,
        }
    }
    pub fn sub(&self, other: &Self) -> Self {
        Self {
            length: self.length - other.length,
            mass: self.mass - other.mass,
            time: self.time - other.time,
        }
    }
}

#[cfg(feature = "unit")]
impl UnitValue {
    // value scaled back into the display unit. for composite labels not
    // present in the lookup table, the label carries no implicit scale,
    // so display value equals base_value directly.
    pub fn display_value(&self) -> f64 {
        match crate::units::lookup(&self.unit_label) {
            Some((scale, _)) if scale != 0.0 => self.base_value / scale,
            _ => self.base_value,
        }
    }

    pub fn to_display_string(&self) -> String {
        alloc::format!("{} {}", format_num(self.display_value()), self.unit_label)
    }
}

// ────────────────────────────────────────────────────────────────────
// Pull a contiguous f64 slice from a value list (for legacy builtins)
// ────────────────────────────────────────────────────────────────────

pub fn values_to_f64(args: &[Value]) -> Result<Vec<f64>> {
    let mut out = Vec::with_capacity(args.len());
    for a in args {
        out.push(
            a.as_f64()
                .ok_or(Error::Domain { what: "expected a numeric argument" })?,
        );
    }
    Ok(out)
}
