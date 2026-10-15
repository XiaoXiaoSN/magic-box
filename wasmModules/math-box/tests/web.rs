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
