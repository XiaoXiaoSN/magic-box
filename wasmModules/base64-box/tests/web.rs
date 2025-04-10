#![cfg(target_arch = "wasm32")]

use base64_box::{decode, decode_to_string, encode};
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_encode() {
    let plain = "Hello, world!".to_string();
    let b64 = "SGVsbG8sIHdvcmxkIQ==".to_string();
    assert_eq!(encode(plain), b64);
}

#[wasm_bindgen_test]
fn test_decode_to_string() {
    let b64 = "SGVsbG8sIHdvcmxkIQ==".to_string();
    let plain = "Hello, world!".to_string();
    assert_eq!(decode_to_string(b64).unwrap(), plain);

    // Test error case
    let maybe_b64 = "Not a Base64 String".to_string();
    assert!(decode_to_string(maybe_b64).is_err());
}

#[wasm_bindgen_test]
fn test_decode() {
    let b64 = "QUJD".to_string();
    let plain = vec![65, 66, 67];
    assert_eq!(decode(b64).unwrap(), plain);
}

// Test with Chinese characters to ensure UTF-8 handling works correctly
#[wasm_bindgen_test]
fn test_chinese_characters() {
    let plain = "你好，世界！".to_string();
    let b64 = encode(plain.clone());
    assert_eq!(decode_to_string(b64).unwrap(), plain);
}
