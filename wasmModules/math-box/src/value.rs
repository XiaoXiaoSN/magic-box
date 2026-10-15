use alloc::string::{String, ToString};
use alloc::vec::Vec;
use core::fmt;

use crate::error::{Error, Result};
#[cfg(feature = "bigint")]
use crate::limits::MAX_NUMERIC_BITS;

#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Num(f64),
    Bool(bool),
    Str(String),
    Function(String),
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
            Self::Str(_) | Self::Function(_) => None,
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
            Self::Unit(_) => None,
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
            Self::Str(s) | Self::Function(s) => s.clone(),
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

    pub fn display_len_upper_bound(&self) -> usize {
        match self {
            Self::Num(_) => 400,
            Self::Bool(_) => 5,
            Self::Str(value) | Self::Function(value) => value.len(),
            #[cfg(feature = "bigint")]
            Self::Big(value) => {
                decimal_digits_upper_bound(value.bits())
                    + usize::from(value.sign() == num_bigint::Sign::Minus)
            }
            #[cfg(feature = "fraction")]
            Self::Frac(value) => value.display_len_upper_bound(),
            #[cfg(feature = "complex")]
            Self::Complex(_) => 800,
            #[cfg(feature = "unit")]
            Self::Unit(value) => 400 + value.unit_label.len(),
        }
    }

    pub fn check_numeric_limits(&self) -> Result<()> {
        #[cfg(feature = "bigint")]
        if let Self::Big(value) = self
            && value.bits() > MAX_NUMERIC_BITS as u64
        {
            return Err(Error::LimitExceeded {
                what: "numeric bit length",
                limit: MAX_NUMERIC_BITS,
            });
        }
        #[cfg(feature = "fraction")]
        if let Self::Frac(value) = self {
            value.check_size()?;
        }
        Ok(())
    }

    pub fn type_name(&self) -> &'static str {
        match self {
            Self::Num(_) => "number",
            Self::Bool(_) => "boolean",
            Self::Str(_) => "string",
            Self::Function(_) => "function",
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
        return if n.is_sign_negative() {
            "-Infinity"
        } else {
            "Infinity"
        }
        .to_string();
    }
    if n == 0.0 {
        return "0".to_string();
    }
    let abs = n.abs();
    if !(1e-7..1e21).contains(&abs) {
        return format_scientific(&alloc::format!("{n}"));
    }
    if n.fract() == 0.0 && abs < 1e16 {
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

fn format_scientific(decimal: &str) -> String {
    let negative = decimal.starts_with('-');
    let unsigned = decimal.strip_prefix('-').unwrap_or(decimal);
    let (mantissa, explicit_exponent) = unsigned.find(['e', 'E']).map_or((unsigned, 0), |index| {
        let exponent = unsigned[index + 1..].parse::<i32>().unwrap_or(0);
        (&unsigned[..index], exponent)
    });
    let (integer, fraction) = mantissa.split_once('.').unwrap_or((mantissa, ""));
    let decimal_position = integer.len() as i32 + explicit_exponent;
    let mut digits = alloc::format!("{integer}{fraction}");
    let leading_zeroes = digits.bytes().take_while(|byte| *byte == b'0').count();
    if leading_zeroes == digits.len() {
        return "0".to_string();
    }
    digits.drain(..leading_zeroes);
    while digits.len() > 1 && digits.ends_with('0') {
        digits.pop();
    }
    let exponent = decimal_position - leading_zeroes as i32 - 1;
    let mut result = String::new();
    if negative {
        result.push('-');
    }
    result.push(digits.as_bytes()[0] as char);
    if digits.len() > 1 {
        result.push('.');
        result.push_str(&digits[1..]);
    }
    result.push('e');
    if exponent >= 0 {
        result.push('+');
    }
    result.push_str(&exponent.to_string());
    result
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

    pub(crate) fn from_f64_integer(n: f64) -> Result<Self> {
        if !n.is_finite() || n.fract() != 0.0 {
            return Err(Error::Domain {
                what: "fraction conversion requires an integer-valued number",
            });
        }
        #[cfg(feature = "bigint")]
        {
            use num_traits::FromPrimitive;
            num_bigint::BigInt::from_f64(n)
                .map(Self::raw_from_int_backend)
                .ok_or(Error::Overflow)
        }
        #[cfg(not(feature = "bigint"))]
        {
            use num_traits::ToPrimitive;
            n.to_i64().map(Self::from_int).ok_or(Error::Overflow)
        }
    }

    pub(crate) fn integer_backend(&self) -> Option<FracInt> {
        use num_traits::One;
        if self.0.denom().is_one() {
            Some(self.0.numer().clone())
        } else {
            None
        }
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

    pub fn add(&self, other: &Self) -> Result<Self> {
        self.check_growth(
            self.numerator_bits()
                .saturating_add(other.denominator_bits())
                .max(
                    other
                        .numerator_bits()
                        .saturating_add(self.denominator_bits()),
                )
                .saturating_add(1),
            self.denominator_bits()
                .saturating_add(other.denominator_bits()),
        )?;
        let result = Self(&self.0 + &other.0);
        result.check_size()?;
        Ok(result)
    }
    pub fn sub(&self, other: &Self) -> Result<Self> {
        self.check_growth(
            self.numerator_bits()
                .saturating_add(other.denominator_bits())
                .max(
                    other
                        .numerator_bits()
                        .saturating_add(self.denominator_bits()),
                )
                .saturating_add(1),
            self.denominator_bits()
                .saturating_add(other.denominator_bits()),
        )?;
        let result = Self(&self.0 - &other.0);
        result.check_size()?;
        Ok(result)
    }
    pub fn mul(&self, other: &Self) -> Result<Self> {
        self.check_growth(
            self.numerator_bits().saturating_add(other.numerator_bits()),
            self.denominator_bits()
                .saturating_add(other.denominator_bits()),
        )?;
        let result = Self(&self.0 * &other.0);
        result.check_size()?;
        Ok(result)
    }
    pub fn div(&self, other: &Self) -> Result<Self> {
        use num_traits::Zero;
        if other.0.numer().is_zero() {
            return Err(Error::DivisionByZero);
        }
        self.check_growth(
            self.numerator_bits()
                .saturating_add(other.denominator_bits()),
            self.denominator_bits()
                .saturating_add(other.numerator_bits()),
        )?;
        let result = Self(&self.0 / &other.0);
        result.check_size()?;
        Ok(result)
    }
    pub fn neg(&self) -> Self {
        Self(-&self.0)
    }

    pub fn abs(&self) -> Self {
        use num_traits::Signed;
        Self(self.0.clone().abs())
    }

    pub fn pow(&self, exponent: u32) -> Result<Self> {
        self.check_growth(
            self.numerator_bits().saturating_mul(exponent as u64),
            self.denominator_bits().saturating_mul(exponent as u64),
        )?;
        let mut power = exponent;
        let mut base = self.clone();
        let mut result = Self::from_int(1);
        while power > 0 {
            if power & 1 == 1 {
                result = result.mul(&base)?;
            }
            power >>= 1;
            if power > 0 {
                base = base.mul(&base)?;
            }
        }
        Ok(result)
    }

    pub fn rem(&self, other: &Self) -> Result<Self> {
        use num_traits::{One, Zero};
        if other.0.numer().is_zero() {
            return Ok(self.clone());
        }
        self.check_growth(
            self.numerator_bits()
                .saturating_add(other.denominator_bits()),
            self.denominator_bits()
                .saturating_add(other.numerator_bits()),
        )?;
        let quotient = &self.0 / &other.0;
        let mut whole = quotient.to_integer();
        let truncated = RatioInner::from_integer(whole.clone());
        if quotient < truncated {
            #[cfg(feature = "bigint")]
            {
                whole = whole.checked_sub(&FracInt::one()).ok_or(Error::Overflow)?;
            }
            #[cfg(not(feature = "bigint"))]
            {
                whole = whole.checked_sub(FracInt::one()).ok_or(Error::Overflow)?;
            }
        }
        let result = Self(&self.0 - &other.0 * RatioInner::from_integer(whole));
        result.check_size()?;
        Ok(result)
    }

    pub fn check_size(&self) -> Result<()> {
        self.check_growth(self.numerator_bits(), self.denominator_bits())
    }

    pub fn display_len_upper_bound(&self) -> usize {
        use num_traits::{One, Signed};
        decimal_digits_upper_bound(self.numerator_bits())
            + decimal_digits_upper_bound(self.denominator_bits())
            + usize::from(self.0.numer().is_negative())
            + usize::from(!self.0.denom().is_one())
    }

    fn check_growth(&self, numerator_bits: u64, denominator_bits: u64) -> Result<()> {
        #[cfg(feature = "bigint")]
        let limit = MAX_NUMERIC_BITS as u64;
        #[cfg(not(feature = "bigint"))]
        let limit = (i64::BITS - 1) as u64;

        if numerator_bits > limit || denominator_bits > limit {
            return Err(Error::LimitExceeded {
                what: "fraction bit length",
                limit: limit as usize,
            });
        }
        Ok(())
    }

    fn numerator_bits(&self) -> u64 {
        integer_bits(self.0.numer())
    }

    fn denominator_bits(&self) -> u64 {
        integer_bits(self.0.denom())
    }
}

#[cfg(all(feature = "fraction", feature = "bigint"))]
fn integer_bits(value: &FracInt) -> u64 {
    value.bits()
}

#[cfg(all(feature = "fraction", not(feature = "bigint")))]
fn integer_bits(value: &FracInt) -> u64 {
    value
        .unsigned_abs()
        .checked_ilog2()
        .map_or(0, |bits| bits as u64 + 1)
}

fn decimal_digits_upper_bound(bits: u64) -> usize {
    if bits == 0 {
        return 1;
    }
    bits.saturating_mul(30_103)
        .saturating_add(99_999)
        .div_ceil(100_000) as usize
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
        Self {
            re: self.re + other.re,
            im: self.im + other.im,
        }
    }
    pub fn sub(&self, other: &Self) -> Self {
        Self {
            re: self.re - other.re,
            im: self.im - other.im,
        }
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
        Self {
            re: -self.re,
            im: -self.im,
        }
    }
    pub fn abs(&self) -> f64 {
        (self.re * self.re + self.im * self.im).sqrt()
    }
    pub fn arg(&self) -> f64 {
        self.im.atan2(self.re)
    }
    pub fn conj(&self) -> Self {
        Self {
            re: self.re,
            im: -self.im,
        }
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
        let im_part = if im_abs == "1" {
            "i".to_string()
        } else {
            alloc::format!("{im_abs}i")
        };
        alloc::format!("{}{sign}{im_part}", format_num(self.re))
    }
}

// ────────────────────────────────────────────────────────────────────
// Unit — value + dimensional vector + scale to base SI
// ────────────────────────────────────────────────────────────────────

#[cfg(feature = "unit")]
#[derive(Clone, Debug, PartialEq)]
pub struct UnitValue {
    pub base_value: f64,     // value normalised to base SI of the dimension
    pub unit_label: String,  // structured display label, for example `km/h`
    pub display_factor: f64, // scale from the display unit to the base unit
    pub display_offset: f64, // affine offset in base units, zero for multiplicative units
    pub display_value_override: Option<f64>, // preserves explicit display values before arithmetic
    pub dim: Dimension,      // exponents over the base dimensions
    pub affine: bool,
}

#[cfg(feature = "unit")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Dimension {
    pub length: i8,
    pub mass: i8,
    pub time: i8,
    pub temperature: i8,
    pub data: i8,
}

#[cfg(feature = "unit")]
impl Dimension {
    pub const SCALAR: Self = Self {
        length: 0,
        mass: 0,
        time: 0,
        temperature: 0,
        data: 0,
    };
    pub const LENGTH: Self = Self {
        length: 1,
        mass: 0,
        time: 0,
        temperature: 0,
        data: 0,
    };
    pub const MASS: Self = Self {
        length: 0,
        mass: 1,
        time: 0,
        temperature: 0,
        data: 0,
    };
    pub const TIME: Self = Self {
        length: 0,
        mass: 0,
        time: 1,
        temperature: 0,
        data: 0,
    };
    pub const TEMPERATURE: Self = Self {
        length: 0,
        mass: 0,
        time: 0,
        temperature: 1,
        data: 0,
    };
    pub const DATA: Self = Self {
        length: 0,
        mass: 0,
        time: 0,
        temperature: 0,
        data: 1,
    };

    pub fn checked_add(&self, other: &Self) -> Result<Self> {
        Ok(Self {
            length: self
                .length
                .checked_add(other.length)
                .ok_or(Error::Overflow)?,
            mass: self.mass.checked_add(other.mass).ok_or(Error::Overflow)?,
            time: self.time.checked_add(other.time).ok_or(Error::Overflow)?,
            temperature: self
                .temperature
                .checked_add(other.temperature)
                .ok_or(Error::Overflow)?,
            data: self.data.checked_add(other.data).ok_or(Error::Overflow)?,
        })
    }
    pub fn checked_sub(&self, other: &Self) -> Result<Self> {
        Ok(Self {
            length: self
                .length
                .checked_sub(other.length)
                .ok_or(Error::Overflow)?,
            mass: self.mass.checked_sub(other.mass).ok_or(Error::Overflow)?,
            time: self.time.checked_sub(other.time).ok_or(Error::Overflow)?,
            temperature: self
                .temperature
                .checked_sub(other.temperature)
                .ok_or(Error::Overflow)?,
            data: self.data.checked_sub(other.data).ok_or(Error::Overflow)?,
        })
    }

    pub fn checked_mul(&self, exponent: i8) -> Result<Self> {
        Ok(Self {
            length: self.length.checked_mul(exponent).ok_or(Error::Overflow)?,
            mass: self.mass.checked_mul(exponent).ok_or(Error::Overflow)?,
            time: self.time.checked_mul(exponent).ok_or(Error::Overflow)?,
            temperature: self
                .temperature
                .checked_mul(exponent)
                .ok_or(Error::Overflow)?,
            data: self.data.checked_mul(exponent).ok_or(Error::Overflow)?,
        })
    }

    pub const fn with_length(self, value: i8) -> Self {
        Self {
            length: value,
            ..self
        }
    }

    pub const fn with_mass(self, value: i8) -> Self {
        Self {
            mass: value,
            ..self
        }
    }

    pub const fn with_time(self, value: i8) -> Self {
        Self {
            time: value,
            ..self
        }
    }

    pub fn canonical_label(&self) -> String {
        let mut numerator = Vec::new();
        let mut denominator = Vec::new();
        for (unit, exponent) in [
            ("m", self.length),
            ("kg", self.mass),
            ("s", self.time),
            ("K", self.temperature),
            ("B", self.data),
        ] {
            if exponent > 0 {
                numerator.push(dimension_factor(unit, i16::from(exponent)));
            } else if exponent < 0 {
                denominator.push(dimension_factor(unit, -i16::from(exponent)));
            }
        }
        let numerator = numerator.join("*");
        let denominator = denominator.join("*");
        if denominator.is_empty() {
            numerator
        } else if numerator.is_empty() {
            [
                ("m", self.length),
                ("kg", self.mass),
                ("s", self.time),
                ("K", self.temperature),
                ("B", self.data),
            ]
            .into_iter()
            .filter(|(_, exponent)| *exponent < 0)
            .map(|(unit, exponent)| dimension_factor(unit, i16::from(exponent)))
            .collect::<Vec<_>>()
            .join("*")
        } else {
            alloc::format!("{numerator}/{denominator}")
        }
    }
}

#[cfg(feature = "unit")]
fn dimension_factor(unit: &str, exponent: i16) -> String {
    if exponent == 1 {
        unit.into()
    } else {
        alloc::format!("{unit}^{exponent}")
    }
}

#[cfg(feature = "unit")]
impl UnitValue {
    pub fn display_value(&self) -> f64 {
        self.display_value_override
            .unwrap_or_else(|| (self.base_value - self.display_offset) / self.display_factor)
    }

    pub fn validate_display(&self) -> Result<()> {
        if !self.display_factor.is_finite() || self.display_factor == 0.0 {
            return Err(Error::Overflow);
        }
        let value = self.display_value();
        if !value.is_finite() {
            return Err(Error::Overflow);
        }
        Ok(())
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
        out.push(a.as_f64().ok_or(Error::Domain {
            what: "expected a numeric argument",
        })?);
    }
    Ok(out)
}
