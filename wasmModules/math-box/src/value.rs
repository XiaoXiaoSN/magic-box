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

    pub(crate) fn floor(&self) -> Self {
        use num_integer::Integer;
        Self::raw_from_int_backend(self.0.numer().div_floor(self.0.denom()))
    }

    pub(crate) fn ceil(&self) -> Self {
        use num_integer::Integer;
        Self::raw_from_int_backend(self.0.numer().div_ceil(self.0.denom()))
    }

    pub(crate) fn round(&self) -> Self {
        Self(self.0.round())
    }

    pub(crate) fn trunc(&self) -> Self {
        Self(self.0.trunc())
    }

    pub fn to_f64(&self) -> f64 {
        #[cfg(feature = "bigint")]
        {
            let numerator = self.0.numer();
            let magnitude = big_ratio_to_f64(numerator.magnitude(), self.0.denom().magnitude());
            if numerator.sign() == num_bigint::Sign::Minus {
                -magnitude
            } else {
                magnitude
            }
        }
        #[cfg(not(feature = "bigint"))]
        {
            use num_traits::ToPrimitive;
            self.0
                .to_f64()
                .expect("a normalized i64 fraction has a finite quotient")
        }
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

#[cfg(all(feature = "fraction", feature = "bigint"))]
fn big_ratio_to_f64(numerator: &num_bigint::BigUint, denominator: &num_bigint::BigUint) -> f64 {
    use core::cmp::Ordering;
    use num_integer::Integer;
    use num_traits::ToPrimitive;

    const FRACTION_BITS: i32 = f64::MANTISSA_DIGITS as i32 - 1;
    const MIN_NORMAL_EXPONENT: i32 = f64::MIN_EXP - 1;
    const MIN_SUBNORMAL_EXPONENT: i32 = MIN_NORMAL_EXPONENT - FRACTION_BITS;
    const MAX_EXPONENT: i32 = f64::MAX_EXP - 1;

    if numerator.bits().max(denominator.bits()) <= f64::MANTISSA_DIGITS as u64 {
        // Both operands are exactly representable, so native division rounds once.
        return numerator.to_f64().unwrap() / denominator.to_f64().unwrap();
    }

    // The bit-length difference gives either floor(log2(n/d)) or one more.
    // Exclude obvious range extremes before allocating shifted integers.
    let bit_difference = numerator.bits() as i32 - denominator.bits() as i32;
    if bit_difference > MAX_EXPONENT + 1 {
        return f64::INFINITY;
    }
    if bit_difference < MIN_SUBNORMAL_EXPONENT - 1 {
        return 0.0;
    }
    let below_power = if bit_difference >= 0 {
        numerator < &(denominator << bit_difference as usize)
    } else {
        &(numerator << (-bit_difference) as usize) < denominator
    };
    let exponent = bit_difference - i32::from(below_power);
    if exponent > MAX_EXPONENT {
        return f64::INFINITY;
    }

    // Express the exact ratio in units of the target float's least significant
    // bit. Subnormals all use the same unit, 2^-1074.
    let unit_exponent = (exponent - FRACTION_BITS).max(MIN_SUBNORMAL_EXPONENT);
    let scaled_numerator;
    let scaled_denominator;
    let (numerator, denominator) = if unit_exponent < 0 {
        scaled_numerator = numerator << (-unit_exponent) as usize;
        (&scaled_numerator, denominator)
    } else {
        scaled_denominator = denominator << unit_exponent as usize;
        (numerator, &scaled_denominator)
    };
    let (quotient, remainder) = numerator.div_rem(denominator);
    let mut significand = quotient.to_u64().expect("quotient fits in 53 bits");
    // IEEE 754 rounds ties to the even significand.
    let midpoint = (&remainder << 1usize).cmp(denominator);
    if midpoint == Ordering::Greater || (midpoint == Ordering::Equal && significand % 2 != 0) {
        significand += 1;
    }

    let power_bits = if unit_exponent < MIN_NORMAL_EXPONENT {
        1 << (unit_exponent - MIN_SUBNORMAL_EXPONENT)
    } else {
        ((unit_exponent + MAX_EXPONENT) as u64) << FRACTION_BITS
    };
    // The rounded significand and the power of two are each exact.
    significand as f64 * f64::from_bits(power_bits)
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
        let ac = self.re * other.re;
        let bd = self.im * other.im;
        let ad = self.re * other.im;
        let bc = self.im * other.re;
        let result = Self::new(ac - bd, ad + bc);

        let product_lost_range =
            |product: f64, lhs, rhs| lhs != 0.0 && rhs != 0.0 && !product.is_normal();
        if self.is_finite()
            && other.is_finite()
            && (!result.is_finite()
                || product_lost_range(ac, self.re, other.re)
                || product_lost_range(bd, self.im, other.im)
                || product_lost_range(ad, self.re, other.im)
                || product_lost_range(bc, self.im, other.re))
        {
            // Squaring a root or reciprocal can overflow in a product even
            // when cancellation leaves a representable complex result.
            let a = ScaledFloat::from_float(self.re);
            let b = ScaledFloat::from_float(self.im);
            let c = ScaledFloat::from_float(other.re);
            let d = ScaledFloat::from_float(other.im);
            return Self::new(
                ScaledFloat::sum_products(a, c, b, d.neg()).to_float(),
                ScaledFloat::sum_products(a, d, b, c).to_float(),
            );
        }
        result
    }
    pub fn div(&self, other: &Self) -> Result<Self> {
        if other.re == 0.0 && other.im == 0.0 {
            return Err(Error::DivisionByZero);
        }
        if self.is_finite() && other.is_finite() {
            let a = ScaledFloat::from_float(self.re);
            let b = ScaledFloat::from_float(self.im);
            let c = ScaledFloat::from_float(other.re);
            let d = ScaledFloat::from_float(other.im);
            let denom = ScaledFloat::sum_products(c, c, d, d);
            return Ok(Self {
                re: ScaledFloat::sum_products(a, c, b, d).div(denom),
                im: ScaledFloat::sum_products(b, c, a, d.neg()).div(denom),
            });
        }
        // Retain IEEE propagation for explicitly nonfinite components.
        let denom = other.re * other.re + other.im * other.im;
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
    fn is_finite(&self) -> bool {
        self.re.is_finite() && self.im.is_finite()
    }
    pub fn abs(&self) -> f64 {
        if self.re.is_nan() || self.im.is_nan() {
            f64::NAN
        } else {
            self.re.hypot(self.im)
        }
    }
    pub(crate) fn ln_abs(&self) -> f64 {
        let radius = self.abs();
        if self.is_finite() && (radius.is_infinite() || radius.is_subnormal()) {
            let scale = self.re.abs().max(self.im.abs());
            scale.ln() + (self.re / scale).hypot(self.im / scale).ln()
        } else {
            radius.ln()
        }
    }
    pub(crate) fn sqrt(&self) -> Self {
        if !self.is_finite() {
            let radius = self.abs();
            return Self::new(
                ((radius + self.re) / 2.0).sqrt(),
                ((radius - self.re) / 2.0).sqrt().copysign(self.im),
            );
        }
        let scale = self.re.abs().max(self.im.abs());
        if scale == 0.0 {
            return Self::new(0.0, self.im);
        }
        // Form the larger root component from a scaled norm. Recover the
        // smaller one from 2*re*im = input.im, avoiding cancellation.
        let scaled_re = self.re / scale;
        let radius = scaled_re.hypot(self.im / scale);
        let major = scale.sqrt() * ((radius + scaled_re.abs()) / 2.0).sqrt();
        let minor = self.im.abs() / (2.0 * major);
        if self.re < 0.0 {
            Self::new(minor, major.copysign(self.im))
        } else {
            Self::new(major, minor.copysign(self.im))
        }
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

// Keep product exponents separate until after multiplication or division.
// Scaling an entire complex operand could discard a small component that
// still contributes to a representable result.
#[cfg(feature = "complex")]
#[derive(Clone, Copy)]
struct ScaledFloat {
    significand: f64,
    exponent: i32,
}

#[cfg(feature = "complex")]
impl ScaledFloat {
    fn from_float(value: f64) -> Self {
        let (significand, exponent) = libm::frexp(value);
        Self {
            significand,
            exponent,
        }
    }

    fn neg(self) -> Self {
        Self {
            significand: -self.significand,
            ..self
        }
    }

    fn sum_products(a: Self, b: Self, c: Self, d: Self) -> Self {
        let first_exponent = a.exponent + b.exponent;
        let second_exponent = c.exponent + d.exponent;
        let first_zero = a.significand == 0.0 || b.significand == 0.0;
        let second_zero = c.significand == 0.0 || d.significand == 0.0;
        if first_zero && second_zero {
            // Preserve the sign of a pair of zero products for branch cuts.
            return Self {
                significand: a.significand * b.significand + c.significand * d.significand,
                exponent: 0,
            };
        }
        let exponent = match (first_zero, second_zero) {
            (true, _) => second_exponent,
            (_, true) => first_exponent,
            _ => first_exponent.max(second_exponent),
        };
        let a = libm::scalbn(a.significand, (first_exponent - exponent).min(0));
        let c = libm::scalbn(c.significand, (second_exponent - exponent).min(0));
        let cd = c * d.significand;
        // Compensate for the rounded product when the two terms cancel.
        let cd_error = c.mul_add(d.significand, -cd);
        let significand = a.mul_add(b.significand, cd) + cd_error;
        Self {
            significand,
            exponent,
        }
    }

    fn to_float(self) -> f64 {
        libm::scalbn(self.significand, self.exponent)
    }

    fn div(self, denominator: Self) -> f64 {
        libm::scalbn(
            self.significand / denominator.significand,
            self.exponent - denominator.exponent,
        )
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
        crate::units::format_terms(&[
            ("m", i16::from(self.length)),
            ("kg", i16::from(self.mass)),
            ("s", i16::from(self.time)),
            ("K", i16::from(self.temperature)),
            ("B", i16::from(self.data)),
        ])
    }
}

#[cfg(feature = "unit")]
impl UnitValue {
    pub fn display_value(&self) -> f64 {
        self.display_value_override
            .unwrap_or_else(|| (self.base_value - self.display_offset) / self.display_factor)
    }

    pub fn validate_display(&self) -> Result<()> {
        if !self.base_value.is_finite()
            || !self.display_factor.is_finite()
            || self.display_factor == 0.0
        {
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
