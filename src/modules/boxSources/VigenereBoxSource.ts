import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions, BoxOptionValues } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// extracts only alphabetic characters, uppercased, as the cipher key
function sanitizeKey(raw: BoxOptionValues): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
}

// applies the Vigenère cipher; direction +1 for encrypt, -1 for decrypt
function vigenere(text: string, key: string, direction: 1 | -1): string {
  let keyIndex = 0;
  return text
    .split('')
    .map((ch) => {
      const isUpper = ch >= 'A' && ch <= 'Z';
      const isLower = ch >= 'a' && ch <= 'z';
      if (!isUpper && !isLower) return ch; // non-letters pass through unchanged

      const base = isUpper ? 65 : 97;
      const charIdx = ch.charCodeAt(0) - base;
      const keyShift = key.charCodeAt(keyIndex % key.length) - 65;
      const shifted = ((charIdx + direction * keyShift + 26) % 26) + base;
      keyIndex++;
      return String.fromCharCode(shifted);
    })
    .join('');
}

export const VigenereBoxSource = {
  name: 'Vigenere',
  description:
    'Vigenere cipher. Encrypt with ::vigenere=key, decrypt with ::vigeneredecode=key.',
  defaultInput: 'attackatdawn ::vigenere=lemon',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const encKey = extractOptionKeys(options, 'vigenere', 'vigenereencode');
    const decKey = extractOptionKeys(options, 'vigeneredecode');

    if (encKey === null && decKey === null) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const boxes: Box[] = [];

    if (encKey !== null) {
      const key = sanitizeKey(encKey);
      if (key.length === 0) {
        // key contained no letters — return an informational box
        const box = new BoxBuilder(
          'Vigenere (Encrypt)',
          'Key must contain at least one alphabetic character.',
        )
          .setPriority(Priority)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .build();
        boxes.push(box);
      } else {
        const encrypted = vigenere(input, key, 1);
        const box = new BoxBuilder('Vigenere (Encrypt)', encrypted)
          .setPriority(Priority)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .build();
        boxes.push(box);
      }
    }

    if (decKey !== null) {
      const key = sanitizeKey(decKey);
      if (key.length === 0) {
        const box = new BoxBuilder(
          'Vigenere (Decrypt)',
          'Key must contain at least one alphabetic character.',
        )
          .setPriority(Priority)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .build();
        boxes.push(box);
      } else {
        const decrypted = vigenere(input, key, -1);
        const box = new BoxBuilder('Vigenere (Decrypt)', decrypted)
          .setPriority(Priority)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .build();
        boxes.push(box);
      }
    }

    return boxes;
  },
};

export default VigenereBoxSource;
