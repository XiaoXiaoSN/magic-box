import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const PriorityPasswordBox = 10;
const DEFAULT_LENGTH = 16;
const MIN_LENGTH = 4;
const MAX_LENGTH = 256;
const CANDIDATE_COUNT = 3;

const CHARSET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHARSET_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const CHARSET_NUMBERS = '0123456789';
const CHARSET_SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

interface CharClasses {
  upper: boolean;
  lower: boolean;
  numbers: boolean;
  symbols: boolean;
}

/** Picks `count` unbiased random bytes from the charset using rejection sampling. */
function generatePassword(length: number, classes: CharClasses): string {
  const charset =
    (classes.upper ? CHARSET_UPPER : '') +
    (classes.lower ? CHARSET_LOWER : '') +
    (classes.numbers ? CHARSET_NUMBERS : '') +
    (classes.symbols ? CHARSET_SYMBOLS : '');

  if (charset.length === 0) {
    return '';
  }

  // rejection-sampling upper bound: largest multiple of charset.length <= 256
  const ceiling = Math.floor(256 / charset.length) * charset.length;
  const chars: string[] = [];

  while (chars.length < length) {
    const buf = new Uint8Array(length - chars.length + 16);
    crypto.getRandomValues(buf);
    for (const byte of buf) {
      if (chars.length >= length) break;
      if (byte < ceiling) {
        chars.push(charset[byte % charset.length]);
      }
    }
  }

  // guarantee at least one character from each enabled class by replacing
  // random positions — shuffle first so the mandatory chars are spread evenly
  const shuffleBuf = new Uint32Array(chars.length);
  crypto.getRandomValues(shuffleBuf);
  chars.sort(
    (_, __) => shuffleBuf[chars.indexOf(_)] - shuffleBuf[chars.indexOf(__)],
  );

  const mandatory: string[] = [];
  const classCharsets: string[] = [];
  if (classes.upper) classCharsets.push(CHARSET_UPPER);
  if (classes.lower) classCharsets.push(CHARSET_LOWER);
  if (classes.numbers) classCharsets.push(CHARSET_NUMBERS);
  if (classes.symbols) classCharsets.push(CHARSET_SYMBOLS);

  // pick one guaranteed char per enabled class
  const pickBuf = new Uint8Array(classCharsets.length * 8);
  crypto.getRandomValues(pickBuf);
  for (let i = 0; i < classCharsets.length; i++) {
    const cs = classCharsets[i];
    const ceiling2 = Math.floor(256 / cs.length) * cs.length;
    let picked: string | null = null;
    for (let j = i * 8; j < (i + 1) * 8; j++) {
      const byte = pickBuf[j];
      if (byte < ceiling2) {
        picked = cs[byte % cs.length];
        break;
      }
    }
    // fallback: just take first char of class (extremely rare rejection-sampling miss)
    mandatory.push(picked ?? cs[0]);
  }

  // replace the first N positions with guaranteed chars
  for (let i = 0; i < mandatory.length; i++) {
    chars[i] = mandatory[i];
  }

  // final shuffle so mandatory chars don't cluster at the start
  const finalBuf = new Uint32Array(chars.length);
  crypto.getRandomValues(finalBuf);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = finalBuf[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

function parseLength(options: BoxOptions): number {
  // check ::password=N / ::pwd=N / ::pass=N first, then fall back to ::len=N
  const triggerVal = extractOptionKeys(options, 'password', 'pwd', 'pass');
  if (typeof triggerVal === 'string' && triggerVal !== '') {
    const parsed = Number.parseInt(triggerVal, 10);
    if (!Number.isNaN(parsed)) {
      return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, parsed));
    }
  }

  const lenVal = extractOptionKeys(options, 'len');
  if (typeof lenVal === 'string' && lenVal !== '') {
    const parsed = Number.parseInt(lenVal, 10);
    if (!Number.isNaN(parsed)) {
      return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, parsed));
    }
  }

  return DEFAULT_LENGTH;
}

export const PasswordBoxSource = {
  name: 'Password Generator',
  description: 'Generates a secure random password.',
  defaultInput: '::password',
  tag: '🔑',
  kind: 'Generate',
  priority: PriorityPasswordBox,

  async generateBoxes(_input: string, options: BoxOptions): Promise<Box[]> {
    if (!hasOptionKeys(options, 'password', 'pwd', 'pass')) {
      return [];
    }

    if (
      typeof crypto === 'undefined' ||
      typeof crypto.getRandomValues !== 'function'
    ) {
      return [
        new BoxBuilder(
          'Password Generator',
          'Error: crypto.getRandomValues is unavailable. A secure context (HTTPS or localhost) is required.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const length = parseLength(options);

    const classes: CharClasses = {
      upper: !hasOptionKeys(options, 'noupper'),
      lower: !hasOptionKeys(options, 'nolower'),
      numbers: !hasOptionKeys(options, 'nonumbers'),
      symbols: !hasOptionKeys(options, 'nosymbols'),
    };

    if (
      !classes.upper &&
      !classes.lower &&
      !classes.numbers &&
      !classes.symbols
    ) {
      return [
        new BoxBuilder(
          'Password Generator',
          'Error: all character classes are excluded. Enable at least one class.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const boxes: Box[] = [];
    for (let i = 0; i < CANDIDATE_COUNT; i++) {
      const password = generatePassword(length, classes);
      boxes.push(
        new BoxBuilder('Password Generator', password)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default PasswordBoxSource;
