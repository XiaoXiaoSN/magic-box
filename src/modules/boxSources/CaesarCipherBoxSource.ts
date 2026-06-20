import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// rotates a single ASCII letter by shift positions, preserving case; non-letters pass through unchanged
function rotateChar(ch: string, shift: number): string {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + shift) % 26) + 65);
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(((code - 97 + shift) % 26) + 97);
  }
  return ch;
}

// applies a caesar shift to every character of the input string;
// accumulates char-by-char to avoid a full intermediate array allocation
function caesarShift(text: string, shift: number): string {
  let out = '';
  for (const ch of text) {
    out += rotateChar(ch, shift);
  }
  return out;
}

export const CaesarCipherBoxSource = {
  name: 'Caesar Cipher',
  description:
    'Rotate letters by N positions (ROT13 by default). Use ::caesar=N for a custom shift.',
  defaultInput: 'Hello, World! ::rot13',
  tag: 'Aa',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'rot13', 'caesar')) return [];
    if (!isString(input) || input.length === 0) return [];

    // rot13 always wins; otherwise parse the caesar= value
    let shift: number;
    if (hasOptionKeys(options, 'rot13')) {
      shift = 13;
    } else {
      const raw = extractOptionKeys(options, 'caesar');
      const parsed =
        raw === true || raw === null
          ? Number.NaN
          : Number.parseInt(String(raw), 10);
      shift = Number.isNaN(parsed) ? 13 : parsed;
    }

    // normalize into 0..25 (handles negative and large values)
    const n = ((shift % 26) + 26) % 26;

    const output = caesarShift(input, n);

    return [
      new BoxBuilder(`Caesar Cipher (shift ${n})`, output)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CaesarCipherBoxSource;
