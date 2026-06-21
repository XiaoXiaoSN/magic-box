import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// extract the key string from the option value; returns null if no letters are present
function parseKey(raw: string | boolean): string | null {
  if (raw === true) return null;
  const letters = String(raw)
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
  return letters.length > 0 ? letters : null;
}

// apply the vigenère cipher to a single character given a key offset
function shiftChar(
  charCode: number,
  base: number,
  keyOffset: number,
  encode: boolean,
): number {
  const pos = charCode - base;
  const shifted = encode ? (pos + keyOffset) % 26 : (pos - keyOffset + 26) % 26;
  return base + shifted;
}

// run the vigenère cipher over the full input text, advancing the key only on alpha chars
function vigenere(text: string, key: string, encode: boolean): string {
  let keyIndex = 0;
  const result: string[] = [];

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    const isUpper = code >= 65 && code <= 90;
    const isLower = code >= 97 && code <= 122;

    if (isUpper || isLower) {
      const base = isUpper ? 65 : 97;
      const keyOffset = key.charCodeAt(keyIndex % key.length) - 97;
      result.push(
        String.fromCharCode(shiftChar(code, base, keyOffset, encode)),
      );
      keyIndex++;
    } else {
      result.push(ch);
    }
  }

  return result.join('');
}

// build a box for an invalid key (no alphabetic characters found)
function buildNoLettersBox(priority: number): Box {
  return new BoxBuilder(
    'Vigenère',
    'Key must contain at least one letter. Use ::vigenere=KEY with a word as the key.',
  )
    .setTemplate(DefaultBoxTemplate)
    .setShowExpandButton(false)
    .setPriority(priority)
    .build();
}

export const VigenereBoxSource = {
  name: 'Vigenère',
  description:
    'Encode or decode text with the Vigenère cipher. Key from ::vigenere=KEY / ::vigeneredecode=KEY.',
  defaultInput: 'Attack at dawn ::vigenere=lemon',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const encRaw = extractOptionKeys(options, 'vigenere', 'vigenereencode');
    const decRaw = extractOptionKeys(options, 'vigeneredecode');

    if (encRaw === null && decRaw === null) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const boxes: Box[] = [];

    if (encRaw !== null) {
      const key = parseKey(encRaw);
      if (key === null) {
        boxes.push(buildNoLettersBox(this.priority));
      } else {
        const encoded = vigenere(input, key, true);
        boxes.push(
          new BoxBuilder('Vigenère (Encode)', encoded)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      }
    }

    if (decRaw !== null) {
      const key = parseKey(decRaw);
      if (key === null) {
        boxes.push(buildNoLettersBox(this.priority));
      } else {
        const decoded = vigenere(input, key, false);
        boxes.push(
          new BoxBuilder('Vigenère (Decode)', decoded)
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

export default VigenereBoxSource;
