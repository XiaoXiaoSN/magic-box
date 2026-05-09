// shared SI unit table used by both the parser (for implicit `1 km`
// syntax) and the runtime (for `unit()` / `convert()` builtins).

#[cfg(feature = "unit")]
use crate::value::Dimension;

#[cfg(feature = "unit")]
pub fn lookup(label: &str) -> Option<(f64, Dimension)> {
    Some(match label {
        // length (base: meter)
        "m" => (1.0, Dimension::LENGTH),
        "km" => (1000.0, Dimension::LENGTH),
        "cm" => (0.01, Dimension::LENGTH),
        "mm" => (0.001, Dimension::LENGTH),
        "um" => (1e-6, Dimension::LENGTH),
        "nm" => (1e-9, Dimension::LENGTH),
        "mi" => (1609.344, Dimension::LENGTH),
        "yd" => (0.9144, Dimension::LENGTH),
        "ft" => (0.3048, Dimension::LENGTH),
        "in" => (0.0254, Dimension::LENGTH),
        // mass (base: kilogram)
        "kg" => (1.0, Dimension::MASS),
        "g" => (0.001, Dimension::MASS),
        "mg" => (1e-6, Dimension::MASS),
        "t" => (1000.0, Dimension::MASS),
        "lb" => (0.45359237, Dimension::MASS),
        "oz" => (0.028349523125, Dimension::MASS),
        // time (base: second)
        "s" => (1.0, Dimension::TIME),
        "ms" => (0.001, Dimension::TIME),
        "us" => (1e-6, Dimension::TIME),
        "ns" => (1e-9, Dimension::TIME),
        "min" => (60.0, Dimension::TIME),
        "h" => (3600.0, Dimension::TIME),
        "day" => (86400.0, Dimension::TIME),
        "week" => (604800.0, Dimension::TIME),
        _ => return None,
    })
}

#[cfg(feature = "unit")]
pub fn is_label(label: &str) -> bool {
    lookup(label).is_some()
}

#[cfg(not(feature = "unit"))]
pub fn is_label(_label: &str) -> bool {
    false
}
