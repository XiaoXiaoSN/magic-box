import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// strips non-alpha chars from the key and uppercases, returning null when nothing remains
function normalizeKey(raw: string): string | null {
  const letters = raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.length > 0 ? letters : null;
}

// beaufort cipher: C[i] = (key[i] - plain[i]) mod 26.
// non-letter characters in the plaintext are passed through unchanged
// and do NOT advance the key index. output letters are uppercase.
function beaufort(text: string, key: string): string {
  let ki = 0;
  let result = '';
  for (const ch of text) {
    const code = ch.toUpperCase().charCodeAt(0);
    if (code >= 65 && code <= 90) {
      const p = code - 65;
      const k = key.charCodeAt(ki % key.length) - 65;
      result += String.fromCharCode(((k - p + 26) % 26) + 65);
      ki++;
    } else {
      result += ch;
    }
  }
  return result;
}

export const BeaufortBoxSource = {
  name: 'Beaufort Cipher',
  description:
    'Beaufort cipher (self-reciprocal): C[i] = (key[i] - plain[i]) mod 26. ::beaufort=key.',
  defaultInput: 'DEFEND ::beaufort=FORTIFICATION',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const rawKey = extractOptionKeys(options, 'beaufort');
    if (rawKey === null) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT) {
      return [];
    }

    // a bare `::beaufort` (no `=key`) yields the boolean `true`, not a key;
    // only a string option value can be a cipher key
    const key = typeof rawKey === 'string' ? normalizeKey(rawKey) : null;
    if (key === null) {
      // the option was missing a value or contained no alphabetic characters
      const box = new BoxBuilder(
        'Beaufort Cipher',
        'Provide an alphabetic key, e.g. ::beaufort=FORTIFICATION',
      )
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build();
      return [box];
    }

    const output = beaufort(input, key);
    const box = new BoxBuilder('Beaufort Cipher', output)
      .setShowExpandButton(false)
      .setPriority(this.priority)
      .build();
    return [box];
  },
};

export default BeaufortBoxSource;
