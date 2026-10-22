import { isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
const hexTokenPattern = /^(?:0x)?[0-9a-f]{1,2}$/i;
const decimalTokenPattern = /^\d+$/;

interface Match {
  decodedText: string;
}

function hasDisplayableChar(str: string): boolean {
  return /(?:(?!\s)\P{C})/u.test(str);
}

export const ReadableBytesBoxSource = {
  name: 'Readable Bytes',
  description: 'Turn a comma-separated byte array into a readable string.',
  defaultInput:
    '83, 116, 114, 105, 110, 103, 32, 116, 111, 32, 66, 121, 116, 101, 115',
  tag: '⟶',
  kind: 'Decode',

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    let content = trim(input);
    if (!content) {
      return undefined;
    }

    const bracketed = /^\[.*\]$/s.test(content);
    const goStyle = /^\[\]byte\{.*\}$/s.test(content);
    const explicitIntent = bracketed || goStyle || content.includes(',');

    if (bracketed) {
      content = content.slice(1, -1);
    } else if (goStyle) {
      content = content.slice(7, -1);
    }

    content = content.replace(/,/g, ' ');

    const parts = content.split(/\s+/).filter((p) => Boolean(p));
    if (parts.length === 0) return undefined;

    const isHex = parts.some(
      (part) => /^0x/i.test(part) || /[a-f]/i.test(part),
    );
    const hasExplicitIntent =
      explicitIntent || parts.some((part) => /^0x/i.test(part));

    const bytes: number[] = [];
    for (const part of parts) {
      let value: number;
      if (isHex) {
        if (!hexTokenPattern.test(part)) return undefined;
        const digits = /^0x/i.test(part) ? part.slice(2) : part;
        value = Number.parseInt(digits, 16);
      } else {
        if (!decimalTokenPattern.test(part)) return undefined;
        value = Number(part);
        if (value > 255) return undefined;
      }
      bytes.push(value);
    }
    if (!hasExplicitIntent && bytes.length < 2) return undefined;

    try {
      const decodedText = utf8Decoder.decode(new Uint8Array(bytes));

      if (!hasDisplayableChar(decodedText)) {
        return undefined;
      }

      return { decodedText };
    } catch {
      return undefined;
    }
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { decodedText } = match;
    return [new BoxBuilder('ByteArray to String', decodedText).build()];
  },
};

export default ReadableBytesBoxSource;
