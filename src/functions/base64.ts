/**
 * @jest-environment jest-environment-jsdom
 */

export interface DecodingResult {
  decoded: Uint8Array;
  readableText: string | null;
}

const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

export function decodeBase64(base64String: string): DecodingResult {
  if (!base64Regex.test(base64String)) {
    throw new Error('Invalid base64 string');
  }

  // Convert base64 to binary string
  const binaryString = atob(base64String);

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Try to convert the bytes to a readable string
  let readableText = null;
  try {
    // Explicitly specify UTF-8 encoding for proper handling of international characters
    readableText = new TextDecoder('utf-8').decode(bytes);

    // If the decoded text only contains non-printable characters, set it to null
    if (!/[\p{L}\p{N}\p{P}\p{Z}]/u.test(readableText)) {
      readableText = null;
    }
  } catch {
    // If decoding fails, leave readableText as null
    readableText = null;
  }

  return {
    decoded: bytes,
    readableText,
  };
}

export const base64 = { decodeBase64 };
