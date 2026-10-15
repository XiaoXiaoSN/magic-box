import { decodeUtf8Strict, formatBinaryFallback } from '@functions/base64';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// converts text to a compact lowercase hex string (no separators)
function encodeTextToHex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface DecodeResult {
  ok: true;
  text: string;
}

interface DecodeError {
  ok: false;
  message: string;
}

// parses a hex string with optional byte separators and repeated prefixes
function decodeHexToText(hex: string): DecodeResult | DecodeError {
  const cleaned = trim(hex);
  let byteTokens: string[] | null = null;

  if (/^(?:\\x[0-9a-f]{2})(?:\s*\\x[0-9a-f]{2})*$/i.test(cleaned)) {
    byteTokens =
      cleaned.match(/\\x([0-9a-f]{2})/gi)?.map((token) => token.slice(2)) ??
      null;
  } else if (
    /^(?:0x)?[0-9a-f]{2}(?:(?:\s+|:)(?:0x)?[0-9a-f]{2})*$/i.test(cleaned)
  ) {
    byteTokens = cleaned.match(/(?:0x)?[0-9a-f]{2}/gi) ?? null;
  } else if (/^(?:0x)?[0-9a-f]+$/i.test(cleaned)) {
    const compact = cleaned.replace(/^0x/i, '');
    if (compact.length % 2 !== 0) {
      return {
        ok: false,
        message: 'Invalid hex input: odd number of characters',
      };
    }
    byteTokens = compact.match(/[0-9a-f]{2}/gi);
  }

  if (byteTokens === null) {
    return {
      ok: false,
      message: `Invalid hex input: contains non-hex characters`,
    };
  }

  const bytes = new Uint8Array(byteTokens.length);
  for (let i = 0; i < byteTokens.length; i += 1) {
    bytes[i] = Number.parseInt(byteTokens[i].replace(/^0x/i, ''), 16);
  }

  return {
    ok: true,
    text: decodeUtf8Strict(bytes) ?? formatBinaryFallback(bytes),
  };
}

export const HexTextBoxSource = {
  defaultDisabled: true,
  name: 'Text to Hex',
  description:
    'Convert text to a hex string (UTF-8) or decode a hex string back to text.',
  defaultInput: 'Hi\n::hex',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'hex', 'tohex');
    const wantDecode = hasOptionKeys(options, 'hexdecode', 'fromhex');
    if (!wantEncode && !wantDecode) {
      return [];
    }
    if (!isString(input)) return [];
    if (input.length > MAX_INPUT) {
      return [
        errorBox(
          'Text to Hex',
          `Input is too large (${input.length} characters, limit ${MAX_INPUT}).`,
          { priority: this.priority },
        ),
      ];
    }
    if (trim(input).length === 0) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const hexOutput = encodeTextToHex(input);
      boxes.push(
        new BoxBuilder('Text to Hex', hexOutput)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const result = decodeHexToText(input);
      if (result.ok) {
        boxes.push(
          new BoxBuilder('Hex to Text', result.text)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } else {
        boxes.push(
          new BoxBuilder('Hex to Text', result.message)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      }
    }

    return boxes;
  },
};

export default HexTextBoxSource;
