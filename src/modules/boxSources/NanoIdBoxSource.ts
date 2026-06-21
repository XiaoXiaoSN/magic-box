import {
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
} from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const DEFAULT_LENGTH = 21;
const MIN_LENGTH = 1;
const MAX_LENGTH = 512;

// default nanoid alphabet (URL-safe, 64 chars)
const ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

// bitmask for the 64-char alphabet: each byte & 63 maps to exactly one char with no bias
const MASK = 63;

/** Generates a URL-safe NanoID of the given length using unbiased sampling against ALPHABET. */
function generateNanoId(length: number): string {
  const bytes = new Uint8Array(length) as Uint8Array<ArrayBuffer>;
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] & MASK];
  }
  return id;
}

function parseLength(options: BoxOptions): number {
  const val = extractOptionKeys(options, 'nanoid');
  if (typeof val === 'string' && val !== '') {
    const parsed = Number.parseInt(val, 10);
    if (!Number.isNaN(parsed)) {
      return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, parsed));
    }
  }
  return DEFAULT_LENGTH;
}

export const NanoIdBoxSource = {
  name: 'NanoID',
  description:
    'Generate a URL-safe NanoID. Default length 21; ::nanoid=<length> for a custom size.',
  defaultInput: ' ::nanoid',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    _input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'nanoid')) return [];

    if (
      typeof crypto === 'undefined' ||
      typeof crypto.getRandomValues !== 'function'
    ) {
      return [
        new BoxBuilder(
          'NanoID',
          'Error: crypto.getRandomValues is unavailable. A secure context (HTTPS or localhost) is required.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const length = parseLength(options);
    const id = generateNanoId(length);

    const content = `NanoID: ${id}\nLength: ${length}\nAlphabet Size: 64`;

    const kvOptions: Record<string, string> = {
      NanoID: id,
      Length: String(length),
      'Alphabet Size': '64',
    };

    return [
      new BoxBuilder('NanoID', content)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NanoIdBoxSource;
