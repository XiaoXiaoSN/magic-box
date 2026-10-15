#![cfg(target_arch = "wasm32")]

use math_box::evaluate;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn evaluates_math_expression_in_browser() {
    assert_eq!(evaluate("100 + 39").unwrap(), "139");
}

#[wasm_bindgen_test]
fn evaluates_real_crate_api_in_browser() {
    assert_eq!(evaluate("1 km to m").unwrap(), "1000 m");
}

#[wasm_bindgen_test]
fn rejects_unit_scaling_that_loses_a_finite_nonzero_value() {
    for input in [
        "1e308 km",
        r#"unit(1e308, "km")"#,
        "5e-324 nm",
        r#"unit(5e-324, "nm")"#,
    ] {
        assert!(evaluate(input).unwrap_err().contains("numeric overflow"));
    }

    assert_eq!(evaluate("5e-324 m").unwrap(), "5e-324 m");
    assert_eq!(evaluate("0 nm").unwrap(), "0 nm");
    assert_eq!(evaluate("-273.15 degC to K").unwrap(), "0 K");
}
