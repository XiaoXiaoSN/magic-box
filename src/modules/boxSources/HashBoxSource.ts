import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const PriorityHashBox = 20;
const MAX_INPUT = 100_000;

// algorithms supported via Web Crypto
type SupportedAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

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
  { name: 'SHA-384', keys: ['sha384'], label: 'SHA-384' },
  { name: 'SHA-512', keys: ['sha512'], label: 'SHA-512' },
];

// all option keys that activate this box source
const ALL_TRIGGER_KEYS = ['hash', 'md5', 'sha1', 'sha256', 'sha384', 'sha512'];

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

const MD5_SHIFT = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
] as const;
const MD5_CONSTANTS = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x1_0000_0000),
);

function rotateLeft(value: number, amount: number): number {
  return (value << amount) | (value >>> (32 - amount));
}

/** computes MD5 for compatibility with legacy checksum inputs. */
function computeMd5(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x1_0000_0000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const words = new Uint32Array(16);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, true);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let wordIndex: number;
      if (index < 16) {
        f = (b & c) | (~b & d);
        wordIndex = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        wordIndex = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        wordIndex = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        wordIndex = (7 * index) % 16;
      }

      const sum = (a + f + MD5_CONSTANTS[index] + words[wordIndex]) | 0;
      const next = (b + rotateLeft(sum, MD5_SHIFT[index])) | 0;
      a = d;
      d = c;
      c = b;
      b = next;
    }

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  const digest = new ArrayBuffer(16);
  const digestView = new DataView(digest);
  digestView.setUint32(0, a0 >>> 0, true);
  digestView.setUint32(4, b0 >>> 0, true);
  digestView.setUint32(8, c0 >>> 0, true);
  digestView.setUint32(12, d0 >>> 0, true);
  return bufToHex(digest);
}

export const HashBoxSource = {
  name: 'Hash',
  description:
    'Compute SHA hashes via Web Crypto and MD5 as a legacy checksum.',
  defaultInput: 'hello world\n::sha256',
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

    if (input.length > MAX_INPUT) return [];

    const wantsAll = hasOptionKeys(options, 'hash');
    const selectedAlgorithms: AlgorithmEntry[] = wantsAll
      ? ALGORITHMS
      : ALGORITHMS.filter((alg) => hasOptionKeys(options, ...alg.keys));
    const wantsMd5 = wantsAll || hasOptionKeys(options, 'md5');

    // guard for non-secure contexts where crypto.subtle is unavailable
    if (
      selectedAlgorithms.length > 0 &&
      (typeof crypto === 'undefined' || !crypto.subtle)
    ) {
      return [
        new BoxBuilder(
          'Hash',
          'Hashing requires a secure context (HTTPS). crypto.subtle is not available.',
        )
          .setView('default')
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const boxes: Box[] = await Promise.all(
      selectedAlgorithms.map(async (alg) => {
        const hex = await computeHash(alg.name, input);
        return new BoxBuilder(`${alg.label}`, hex)
          .setView('default')
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build();
      }),
    );

    if (wantsMd5) {
      boxes.push(
        new BoxBuilder('MD5', computeMd5(input))
          .setView('default')
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default HashBoxSource;
