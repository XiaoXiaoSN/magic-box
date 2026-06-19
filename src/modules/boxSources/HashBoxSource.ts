import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const PriorityHashBox = 20;

// algorithms supported via Web Crypto
type SupportedAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';

interface AlgorithmEntry {
  name: SupportedAlgorithm;
  // option keys that select only this algorithm
  keys: string[];
  // display label used as box name
  label: string;
}

const ALGORITHMS: AlgorithmEntry[] = [
  { name: 'SHA-1', keys: ['sha1'], label: 'SHA-1' },
  { name: 'SHA-256', keys: ['sha256'], label: 'SHA-256' },
  { name: 'SHA-512', keys: ['sha512'], label: 'SHA-512' },
];

// all option keys that activate this box source
const ALL_TRIGGER_KEYS = ['hash', 'sha1', 'sha256', 'sha512'];

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHash(
  algorithm: SupportedAlgorithm,
  input: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(algorithm, encoded);
  return bufToHex(digest);
}

export const HashBoxSource = {
  name: 'Hash',
  description:
    'Compute cryptographic hashes (SHA-1, SHA-256, SHA-512) of the input text via Web Crypto.',
  defaultInput: 'hello world ::sha256',
  tag: '#',
  kind: 'Hash',
  priority: PriorityHashBox,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, ...ALL_TRIGGER_KEYS)) {
      return [];
    }

    // guard for non-secure contexts where crypto.subtle is unavailable
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return [
        new BoxBuilder(
          'Hash',
          'Hashing requires a secure context (HTTPS). crypto.subtle is not available.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const selectedAlgorithms: AlgorithmEntry[] = hasOptionKeys(options, 'hash')
      ? ALGORITHMS // ::hash alone means "all"
      : ALGORITHMS.filter((alg) => hasOptionKeys(options, ...alg.keys));

    const boxes = await Promise.all(
      selectedAlgorithms.map(async (alg) => {
        const hex = await computeHash(alg.name, input);
        return new BoxBuilder(`${alg.label}`, hex)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build();
      }),
    );

    return boxes;
  },
};

export default HashBoxSource;
