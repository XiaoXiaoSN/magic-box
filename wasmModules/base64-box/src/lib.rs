use base64::{engine::general_purpose, Engine as _};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn encode(input: String) -> String {
    general_purpose::STANDARD.encode(input)
}

#[wasm_bindgen]
pub fn decode(input: String) -> Result<Vec<u8>, String> {
    let decoded = general_purpose::STANDARD
        .decode(input)
        .map_err(|err| err.to_string())?;

    Ok(decoded)
}

#[wasm_bindgen]
pub fn decode_to_string(input: String) -> Result<String, String> {
    let decoded = decode(input)?;
    let maybe_string = String::from_utf8(decoded).map_err(|err| err.to_string())?;

    Ok(maybe_string)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode() {
        let plain = "Hello, world!".to_string();
        let b64 = "SGVsbG8sIHdvcmxkIQ==".to_string();
        assert_eq!(encode(plain), b64);
    }

    #[test]
    fn test_decode_to_string() {
        let b64 = "SGVsbG8sIHdvcmxkIQ==".to_string();
        let plain = "Hello, world!".to_string();
        assert_eq!(decode_to_string(b64).unwrap(), plain);

        let maybe_b64 = "Not a Base64 String".to_string();
        let result = Result::<String, String>::Err("Invalid byte 32, offset 3.".to_string());
        assert_eq!(decode_to_string(maybe_b64), result);

        let maybe_b64 = "Base64encode".to_string();
        let result = Result::<String, String>::Err(
            "invalid utf-8 sequence of 1 bytes from index 1".to_string(),
        );
        assert_eq!(decode_to_string(maybe_b64), result);
    }

    #[test]
    fn test_decode() {
        let b64 = "QUJD".to_string();
        let plain = vec![65, 66, 67];
        assert_eq!(decode(b64).unwrap(), plain);
    }
}
