import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// valid multipliers coprime with 26
const COPRIME_26 = new Set([1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]);

// returns aInv such that (a * aInv) mod 26 === 1, or null if none exists
function modInverse(a: number): number | null {
  const normalized = ((a % 26) + 26) % 26;
  for (let i = 1; i < 26; i++) {
    if ((normalized * i) % 26 === 1) return i;
  }
  return null;
}

function affineEncrypt(text: string, a: number, b: number): string {
  return text
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        // uppercase
        return String.fromCharCode(((a * (code - 65) + b) % 26) + 65);
      }
      if (code >= 97 && code <= 122) {
        // lowercase
        return String.fromCharCode(((a * (code - 97) + b) % 26) + 97);
      }
      return ch;
    })
    .join('');
}

function affineDecrypt(text: string, a: number, b: number): string {
  const aInv = modInverse(a);
  if (aInv === null) return text;
  return text
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(
          ((((aInv * (code - 65 - b)) % 26) + 26) % 26) + 65,
        );
      }
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(
          ((((aInv * (code - 97 - b)) % 26) + 26) % 26) + 97,
        );
      }
      return ch;
    })
    .join('');
}

// parses "a,b" from an option value; returns {a, b} or an error string
function parseAB(
  raw: string | boolean,
): { a: number; b: number } | { error: string } {
  if (typeof raw !== 'string') {
    return { error: 'Option value must be in the format a,b (e.g. 5,8).' };
  }
  const match = raw.match(/^(\d+),(\d+)$/);
  if (!match) {
    return { error: `Invalid format "${raw}". Expected a,b (e.g. 5,8).` };
  }
  return { a: Number.parseInt(match[1], 10), b: Number.parseInt(match[2], 10) };
}

function errorBox(message: string, priority: number): Box {
  return new BoxBuilder('Affine Cipher', message)
    .setTemplate(DefaultBoxTemplate)
    .setShowExpandButton(false)
    .setPriority(priority)
    .build();
}

export const AffineCipherBoxSource = {
  defaultDisabled: true,
  name: 'Affine Cipher',
  description:
    'Affine cipher E(x)=(a*x+b) mod 26. ::affine=a,b to encrypt; ::affinedecode=a,b to decrypt. a must be coprime with 26.',
  defaultInput: 'AFFINE ::affine=5,8',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const encKey = extractOptionKeys(options, 'affine', 'affineencode');
    const decKey = extractOptionKeys(options, 'affinedecode');
    if (encKey === null && decKey === null) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const boxes: Box[] = [];

    if (encKey !== null) {
      const parsed = parseAB(encKey);
      if ('error' in parsed) {
        boxes.push(errorBox(parsed.error, this.priority));
      } else if (!COPRIME_26.has(parsed.a % 26)) {
        boxes.push(
          errorBox(
            `a=${parsed.a} is not coprime with 26. a must be one of: ${[...COPRIME_26].sort((x, y) => x - y).join(', ')}.`,
            this.priority,
          ),
        );
      } else {
        const result = affineEncrypt(input, parsed.a, parsed.b);
        boxes.push(
          new BoxBuilder('Affine Cipher (Encrypt)', result)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      }
    }

    if (decKey !== null) {
      const parsed = parseAB(decKey);
      if ('error' in parsed) {
        boxes.push(errorBox(parsed.error, this.priority));
      } else if (!COPRIME_26.has(parsed.a % 26)) {
        boxes.push(
          errorBox(
            `a=${parsed.a} is not coprime with 26. a must be one of: ${[...COPRIME_26].sort((x, y) => x - y).join(', ')}.`,
            this.priority,
          ),
        );
      } else {
        const result = affineDecrypt(input, parsed.a, parsed.b);
        boxes.push(
          new BoxBuilder('Affine Cipher (Decrypt)', result)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      }
    }

    return boxes;
  },
};

export default AffineCipherBoxSource;
