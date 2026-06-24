import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

const USAGE_ENCRYPT =
  'Usage: ::autokey=KEY — key must contain at least one letter.';
const USAGE_DECRYPT =
  'Usage: ::autokeydecode=KEY — key must contain at least one letter.';

// extracts only the letter characters from a string, uppercased
function extractLetters(s: string): string {
  return s
    .toUpperCase()
    .split('')
    .filter((c) => c >= 'A' && c <= 'Z')
    .join('');
}

// autokey encrypt: keystream = key letters + plaintext letters
function autokeyEncrypt(plaintext: string, keyLetters: string): string {
  // build the full keystream from key letters followed by plaintext letters
  const plaintextLetters = extractLetters(plaintext);
  const keystream = keyLetters + plaintextLetters;

  let ki = 0; // index into keystream
  const result: string[] = [];

  for (const ch of plaintext) {
    const upper = ch.toUpperCase();
    if (upper >= 'A' && upper <= 'Z') {
      const p = upper.charCodeAt(0) - 65;
      const k = keystream.charCodeAt(ki) - 65;
      const c = (p + k) % 26;
      const encChar = String.fromCharCode(65 + c);
      result.push(ch === ch.toUpperCase() ? encChar : encChar.toLowerCase());
      ki++;
    } else {
      result.push(ch);
    }
  }

  return result.join('');
}

// autokey decrypt: keystream starts as key letters; each recovered plaintext
// letter is appended to extend the keystream
function autokeyDecrypt(ciphertext: string, keyLetters: string): string {
  // keystream grows dynamically — start with key letters
  const keystream: number[] = keyLetters
    .split('')
    .map((c) => c.charCodeAt(0) - 65);

  let ki = 0;
  const result: string[] = [];

  for (const ch of ciphertext) {
    const upper = ch.toUpperCase();
    if (upper >= 'A' && upper <= 'Z') {
      const c = upper.charCodeAt(0) - 65;
      const k = keystream[ki];
      const p = (((c - k) % 26) + 26) % 26;
      const decChar = String.fromCharCode(65 + p);
      result.push(ch === ch.toUpperCase() ? decChar : decChar.toLowerCase());
      // extend keystream with the recovered plaintext letter
      keystream.push(p);
      ki++;
    } else {
      result.push(ch);
    }
  }

  return result.join('');
}

function buildUsageBox(name: string, usage: string, priority: number): Box {
  return new BoxBuilder(name, usage)
    .setTemplate(DefaultBoxTemplate)
    .setShowExpandButton(false)
    .setPriority(priority)
    .build();
}

export const AutokeyBoxSource = {
  defaultDisabled: true,
  name: 'Autokey Cipher',
  description:
    'Vigenere autokey cipher (the message extends the key). ::autokey=KEY to encrypt, ::autokeydecode=KEY to decrypt.',
  defaultInput: 'ATTACKATDAWN ::autokey=QUEENLY',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const encKey = extractOptionKeys(options, 'autokey', 'autokeyencode');
    const decKey = extractOptionKeys(options, 'autokeydecode');

    if (encKey === null && decKey === null) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const boxes: Box[] = [];

    if (encKey !== null) {
      // bare ::autokey without a value is boolean true — show usage
      if (typeof encKey !== 'string') {
        boxes.push(
          buildUsageBox(
            'Autokey Cipher (Encrypt)',
            USAGE_ENCRYPT,
            this.priority,
          ),
        );
      } else {
        const keyLetters = extractLetters(encKey);
        if (keyLetters.length === 0) {
          boxes.push(
            buildUsageBox(
              'Autokey Cipher (Encrypt)',
              USAGE_ENCRYPT,
              this.priority,
            ),
          );
        } else {
          const ciphertext = autokeyEncrypt(input, keyLetters);
          boxes.push(
            new BoxBuilder('Autokey Cipher (Encrypt)', ciphertext)
              .setTemplate(DefaultBoxTemplate)
              .setShowExpandButton(false)
              .setPriority(this.priority)
              .build(),
          );
        }
      }
    }

    if (decKey !== null) {
      if (typeof decKey !== 'string') {
        boxes.push(
          buildUsageBox(
            'Autokey Cipher (Decrypt)',
            USAGE_DECRYPT,
            this.priority,
          ),
        );
      } else {
        const keyLetters = extractLetters(decKey);
        if (keyLetters.length === 0) {
          boxes.push(
            buildUsageBox(
              'Autokey Cipher (Decrypt)',
              USAGE_DECRYPT,
              this.priority,
            ),
          );
        } else {
          const plaintext = autokeyDecrypt(input, keyLetters);
          boxes.push(
            new BoxBuilder('Autokey Cipher (Decrypt)', plaintext)
              .setTemplate(DefaultBoxTemplate)
              .setShowExpandButton(false)
              .setPriority(this.priority)
              .build(),
          );
        }
      }
    }

    return boxes;
  },
};

export default AutokeyBoxSource;
