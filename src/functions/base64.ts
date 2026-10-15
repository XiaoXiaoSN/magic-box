export interface DecodingResult {
  decoded: Uint8Array;
  readableText: string | null;
}

export interface Base64DecodeOptions {
  allowMissingPadding?: boolean;
  allowUrlSafe?: boolean;
  allowWhitespace?: boolean;
}

const utf8Decoder = new TextDecoder('utf-8', {
  fatal: true,
  ignoreBOM: true,
});

/** Decode UTF-8 without replacement characters or disallowed controls. */
export function decodeUtf8Strict(bytes: Uint8Array): string | null {
  let text: string;
  try {
    text = utf8Decoder.decode(bytes);
  } catch {
    return null;
  }

  for (let index = 0; index < text.length; ) {
    const codePoint = text.codePointAt(index);
    if (codePoint === undefined) return null;
    if (
      (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) &&
      codePoint !== 0x09 &&
      codePoint !== 0x0a &&
      codePoint !== 0x0d
    ) {
      return null;
    }
    index += codePoint > 0xffff ? 2 : 1;
  }

  return text;
}

/** Keep undecodable bytes visible without allowing replacement glyphs. */
export function formatBinaryFallback(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return `<binary ${bytes.length} bytes> (hex: ${hex})`;
}

export function normalizeBase64(
  base64String: string,
  options: Base64DecodeOptions = {},
): string {
  if (typeof base64String !== 'string') {
    throw new Error('Invalid base64 string');
  }

  const {
    allowMissingPadding = true,
    allowUrlSafe = true,
    allowWhitespace = true,
  } = options;
  const compact = allowWhitespace
    ? base64String.replace(/\s/g, '')
    : base64String;
  if (compact === '') {
    throw new Error('Invalid base64 string');
  }

  const paddingStart = compact.indexOf('=');
  const body = paddingStart === -1 ? compact : compact.slice(0, paddingStart);
  const padding = paddingStart === -1 ? '' : compact.slice(paddingStart);
  if (!allowUrlSafe && /[-_]/.test(body)) {
    throw new Error('Invalid base64 string');
  }

  const normalizedBody = body.replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*$/.test(normalizedBody) || !/^={0,2}$/.test(padding)) {
    throw new Error('Invalid base64 string');
  }

  const remainder = normalizedBody.length % 4;
  if (remainder === 1) {
    throw new Error('Invalid base64 string');
  }

  const expectedPadding = (4 - remainder) % 4;
  if (padding.length > 0 && padding.length !== expectedPadding) {
    throw new Error('Invalid base64 string');
  }
  if (padding.length === 0 && !allowMissingPadding && expectedPadding !== 0) {
    throw new Error('Invalid base64 string');
  }

  return normalizedBody + (padding || '='.repeat(expectedPadding));
}

export function decodeBase64(
  base64String: string,
  options: Base64DecodeOptions = {},
): DecodingResult {
  const normalized = normalizeBase64(base64String, options);

  // Convert base64 to binary string
  let binaryString: string;
  try {
    binaryString = atob(normalized);
  } catch {
    throw new Error('Invalid base64 string');
  }

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const readableText = decodeUtf8Strict(bytes);

  return {
    decoded: bytes,
    readableText,
  };
}

export const base64 = { decodeBase64 };
