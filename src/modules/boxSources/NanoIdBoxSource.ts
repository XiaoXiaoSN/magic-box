import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const DEFAULT_SIZE = 21;
const MAX_SIZE = 256;

// url-safe alphabet — 64 chars so 256 % 64 === 0, eliminating modulo bias
const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

function resolveSize(raw: string | boolean | null): number {
  // a bare ::nanoid flag (boolean) or missing value uses the default size
  if (typeof raw !== 'string') return DEFAULT_SIZE;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n <= 0) return DEFAULT_SIZE;
  return Math.min(n, MAX_SIZE);
}

export const NanoIdBoxSource = {
  name: 'NanoID',
  description:
    'Generate a URL-safe NanoID. Use ::nanoid=N for a custom length (default 21).',
  defaultInput: 'nanoid ::nanoid',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    _input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'nanoid')) return [];

    const raw = extractOptionKeys(options, 'nanoid');
    const size = resolveSize(raw);

    if (
      typeof crypto === 'undefined' ||
      typeof crypto.getRandomValues !== 'function'
    ) {
      return [
        new BoxBuilder(
          'NanoID',
          'crypto.getRandomValues is unavailable in this environment',
        )
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');

    return [
      new BoxBuilder('NanoID', id)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NanoIdBoxSource;
