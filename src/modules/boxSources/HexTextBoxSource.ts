import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

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

// parses a hex string (optional leading 0x, optional whitespace) into text
function decodeHexToText(hex: string): DecodeResult | DecodeError {
  const cleaned = hex.replace(/\s+/g, '').replace(/^0x/i, '').toLowerCase();

  if (!/^[0-9a-f]*$/.test(cleaned)) {
    return {
      ok: false,
      message: `Invalid hex input: contains non-hex characters`,
    };
  }
  if (cleaned.length % 2 !== 0) {
    return {
      ok: false,
      message: `Invalid hex input: odd number of characters`,
    };
  }

  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleaned.slice(i, i + 2), 16);
  }

  try {
    return {
      ok: true,
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    };
  } catch {
    return {
      ok: false,
      message: 'Invalid hex input: bytes are not valid UTF-8',
    };
  }
}

export const HexTextBoxSource = {
  defaultDisabled: true,
  name: 'Text to Hex',
  description:
    'Convert text to a hex string (UTF-8) or decode a hex string back to text.',
  defaultInput: 'Hi ::hex',
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
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    ) {
      return [];
    }

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
