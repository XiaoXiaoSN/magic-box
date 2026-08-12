import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 10_000;

// RFC 3492 bootstring constants
const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;
const DELIMITER = '-';

// adapts bias after each encoded delta per RFC 3492 §6.1
function adaptBias(
  delta: number,
  numPoints: number,
  firstTime: boolean,
): number {
  let d = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  d += Math.floor(d / numPoints);
  let k = 0;
  while (d > ((BASE - TMIN) * TMAX) >> 1) {
    d = Math.floor(d / (BASE - TMIN));
    k += BASE;
  }
  return Math.floor(k + ((BASE - TMIN + 1) * d) / (d + SKEW));
}

// maps a digit value to its ASCII character per RFC 3492 §5
function digitToBasic(digit: number): number {
  return digit < 26 ? digit + 97 : digit + 22; // a-z then 0-9
}

// maps a basic code point to its digit value; -1 if not valid
function basicToDigit(cp: number): number {
  if (cp >= 48 && cp <= 57) return cp - 22; // 0-9 → 26-35
  if (cp >= 65 && cp <= 90) return cp - 65; // A-Z → 0-25
  if (cp >= 97 && cp <= 122) return cp - 97; // a-z → 0-25
  return -1;
}

// encodes a single Punycode label (no xn-- prefix) per RFC 3492 §6.3
function punycodeEncode(input: number[]): string {
  const n = input.length;
  let bias = INITIAL_BIAS;
  let delta = 0;
  let currentN = INITIAL_N;
  let h = 0;
  let b = 0;
  const output: number[] = [];

  for (const cp of input) {
    if (cp < INITIAL_N) {
      output.push(cp);
      h++;
      b++;
    }
  }

  if (b > 0) output.push(DELIMITER.charCodeAt(0));

  while (h < n) {
    // find the next larger non-basic code point
    let m = Number.MAX_SAFE_INTEGER;
    for (const cp of input) {
      if (cp >= currentN && cp < m) m = cp;
    }

    delta += (m - currentN) * (h + 1);
    currentN = m;

    for (const cp of input) {
      if (cp < currentN) delta++;
      if (cp === currentN) {
        // encode delta as generalized variable-length integer
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t =
            k <= bias + TMIN ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          output.push(digitToBasic(t + ((q - t) % (BASE - t))));
          q = Math.floor((q - t) / (BASE - t));
        }
        output.push(digitToBasic(q));
        bias = adaptBias(delta, h + 1, h === b);
        delta = 0;
        h++;
      }
    }

    delta++;
    currentN++;
  }

  return String.fromCharCode(...output);
}

// decodes a Punycode-encoded label (without xn-- prefix) per RFC 3492 §6.2
function punycodeDecode(input: string): string {
  const output: number[] = [];
  let bias = INITIAL_BIAS;
  let i = 0;
  let currentN = INITIAL_N;

  const delimIdx = input.lastIndexOf(DELIMITER);
  const basic = delimIdx < 0 ? '' : input.slice(0, delimIdx);
  const extended = delimIdx < 0 ? input : input.slice(delimIdx + 1);

  for (let j = 0; j < basic.length; j++) {
    output.push(basic.charCodeAt(j));
  }

  let idx = 0;
  while (idx < extended.length) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (idx >= extended.length) throw new RangeError('invalid punycode');
      const digit = basicToDigit(extended.charCodeAt(idx++));
      if (digit < 0) throw new RangeError('invalid punycode');
      i += digit * w;
      const t = k <= bias + TMIN ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const len = output.length + 1;
    bias = adaptBias(i - oldi, len, oldi === 0);
    currentN += Math.floor(i / len);
    i %= len;
    output.splice(i, 0, currentN);
    i++;
  }

  return String.fromCodePoint(...output);
}

// returns true if every character in the string is ASCII (< 128)
function isAsciiOnly(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) >= 128) return false;
  }
  return true;
}

// converts a domain to ASCII Punycode form (IDNA ToASCII per label)
function toAscii(domain: string): string {
  return domain
    .toLowerCase()
    .split('.')
    .map((label) => {
      if (isAsciiOnly(label)) return label;
      const codePoints = [...label].map((ch) => ch.codePointAt(0) as number);
      return `xn--${punycodeEncode(codePoints)}`;
    })
    .join('.');
}

// converts an ASCII Punycode domain back to its Unicode form
function toUnicode(domain: string): string {
  return domain
    .split('.')
    .map((label) => {
      if (label.toLowerCase().startsWith('xn--')) {
        return punycodeDecode(label.slice(4));
      }
      return label;
    })
    .join('.');
}

export const PunycodeBoxSource = {
  defaultDisabled: true,
  name: 'Punycode',
  description:
    'Convert an internationalized domain name to/from its Punycode (xn--) ASCII form.',
  defaultInput: 'münchen.de ::punycode',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantToAscii = hasOptionKeys(
      options,
      'punycode',
      'punycodeencode',
      'idn',
    );
    const wantToUnicode = hasOptionKeys(options, 'punycodedecode', 'idndecode');
    if (!wantToAscii && !wantToUnicode) return [];
    if (input.length > MAX_INPUT) return [];

    const domain = trim(input);
    const boxes: Box[] = [];

    if (wantToAscii) {
      let result: string;
      try {
        result = toAscii(domain);
      } catch {
        result = 'Invalid domain: unable to encode to Punycode.';
      }
      boxes.push(
        new BoxBuilder('Punycode (ToASCII)', result)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantToUnicode) {
      let result: string;
      try {
        result = toUnicode(domain);
      } catch {
        result = 'Invalid domain: unable to decode from Punycode.';
      }
      boxes.push(
        new BoxBuilder('Punycode (ToUnicode)', result)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default PunycodeBoxSource;
