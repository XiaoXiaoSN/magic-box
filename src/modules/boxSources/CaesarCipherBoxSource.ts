import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// bound synchronous work; input is seeded from a ?input= url param with no cap
const MAX_INPUT = 100_000;

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

// ROT47 rotates ASCII characters 33-126 by 47 positions
function rot47Shift(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 33 && code <= 126) {
      out += String.fromCharCode(((code - 33 + 47) % 94) + 33);
    } else {
      out += text[i];
    }
  }
  return out;
}

export const CaesarCipherBoxSource = {
  defaultDisabled: true,
  name: 'Caesar Cipher',
  description:
    'Rotate letters by N positions (ROT13 by default, ROT47, or custom shift). Supports ::rot13, ::rot47, ::caesar=N.',
  defaultInput: 'Hello, World! ::rot13',
  tag: 'Aa',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'rot13', 'caesar', 'rot47')) return [];
    if (!isString(input) || input.length === 0) return [];
    if (input.length > MAX_INPUT) return [];

    if (hasOptionKeys(options, 'rot47')) {
      const output = rot47Shift(input);
      const val = extractOptionKeys(options, 'rot47');
      const mode = val === 'encode' || val === 'decode' ? val : null;
      const boxes: Box[] = [];

      if (mode !== 'decode') {
        boxes.push(
          new BoxBuilder('ROT47 Encode', output)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      }
      if (mode !== 'encode') {
        boxes.push(
          new BoxBuilder('ROT47 Decode', output)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      }
      return boxes;
    }

    // rot13 or custom caesar shift
    let shift: number;
    let isRot13 = false;
    let specificMode: 'encode' | 'decode' | null = null;

    if (hasOptionKeys(options, 'rot13')) {
      isRot13 = true;
      shift = 13;
      const val = extractOptionKeys(options, 'rot13');
      if (val === 'encode' || val === 'decode') {
        specificMode = val;
      }
    } else {
      const raw = extractOptionKeys(options, 'caesar');
      const parsed =
        raw === true || raw === null
          ? Number.NaN
          : Number.parseInt(String(raw), 10);
      shift = Number.isNaN(parsed) ? 13 : parsed;
    }

    const getEffectiveShift = (s: number) => ((s % 26) + 26) % 26;
    const boxes: Box[] = [];

    if (specificMode !== 'decode') {
      const title = isRot13
        ? 'Caesar Cipher (ROT13 Encode)'
        : `Caesar Cipher (shift ${shift}) Encode`;
      const output = caesarShift(input, getEffectiveShift(shift));
      boxes.push(
        new BoxBuilder(title, output)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (specificMode !== 'encode') {
      const title = isRot13
        ? 'Caesar Cipher (ROT13 Decode)'
        : `Caesar Cipher (shift ${-shift}) Decode`;
      const output = caesarShift(input, getEffectiveShift(-shift));
      boxes.push(
        new BoxBuilder(title, output)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default CaesarCipherBoxSource;
