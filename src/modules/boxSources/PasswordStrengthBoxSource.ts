import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 10_000;

// character-class pool sizes per NIST SP 800-63B appendix A
const POOL_LOWERCASE = 26;
const POOL_UPPERCASE = 26;
const POOL_DIGITS = 10;
// printable ASCII symbols: 33-126 excluding a-z, A-Z, 0-9 (95 - 26 - 26 - 10 = 33)
const POOL_SYMBOLS = 33;
const POOL_SPACE = 1;
// rough estimate for any non-ASCII unicode character
const POOL_NON_ASCII = 100;

// guesses per second for a modern offline attack (bcrypt-equivalent rates are lower;
// this models fast hashing like MD5/NTLM to give a conservative estimate)
const GUESSES_PER_SECOND = 1e10;

interface CharacterClasses {
  hasLower: boolean;
  hasUpper: boolean;
  hasDigits: boolean;
  hasSymbols: boolean;
  hasSpace: boolean;
  hasNonAscii: boolean;
}

function detectClasses(password: string): CharacterClasses {
  let hasLower = false;
  let hasUpper = false;
  let hasDigits = false;
  let hasSymbols = false;
  let hasSpace = false;
  let hasNonAscii = false;

  for (const ch of password) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 126 || code < 32) {
      hasNonAscii = true;
    } else if (ch === ' ') {
      hasSpace = true;
    } else if (ch >= 'a' && ch <= 'z') {
      hasLower = true;
    } else if (ch >= 'A' && ch <= 'Z') {
      hasUpper = true;
    } else if (ch >= '0' && ch <= '9') {
      hasDigits = true;
    } else {
      // printable ASCII 33-126 non-alnum
      hasSymbols = true;
    }
  }

  return { hasLower, hasUpper, hasDigits, hasSymbols, hasSpace, hasNonAscii };
}

function poolSize(classes: CharacterClasses): number {
  let pool = 0;
  if (classes.hasLower) pool += POOL_LOWERCASE;
  if (classes.hasUpper) pool += POOL_UPPERCASE;
  if (classes.hasDigits) pool += POOL_DIGITS;
  if (classes.hasSymbols) pool += POOL_SYMBOLS;
  if (classes.hasSpace) pool += POOL_SPACE;
  if (classes.hasNonAscii) pool += POOL_NON_ASCII;
  return pool;
}

function characterSetLabel(classes: CharacterClasses): string {
  const parts: string[] = [];
  if (classes.hasLower) parts.push('lowercase');
  if (classes.hasUpper) parts.push('uppercase');
  if (classes.hasDigits) parts.push('digits');
  if (classes.hasSymbols) parts.push('symbols');
  if (classes.hasSpace) parts.push('space');
  if (classes.hasNonAscii) parts.push('non-ASCII');
  return parts.length > 0 ? parts.join(', ') : 'none';
}

function entropyBits(length: number, pool: number): number {
  if (pool <= 0 || length <= 0) return 0;
  return length * Math.log2(pool);
}

function rating(bits: number): string {
  if (bits < 28) return 'Very Weak';
  if (bits < 36) return 'Weak';
  if (bits < 60) return 'Reasonable';
  if (bits < 128) return 'Strong';
  return 'Very Strong';
}

// formats a finite crack-time duration in human-readable form
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 365.25 * 86_400) return `${Math.round(seconds / 86_400)} days`;
  const years = seconds / (365.25 * 86_400);
  if (years < 1_000) return `${Math.round(years)} years`;
  if (years < 1_000_000) return `${Math.round(years / 1_000)}k years`;
  return 'centuries+';
}

function estimateCrackTime(length: number, pool: number): string {
  if (pool <= 0 || length <= 0) return '< 1 second';
  // average guesses = pool^length / 2
  const guesses = pool ** length / 2;
  if (!Number.isFinite(guesses) || guesses > Number.MAX_SAFE_INTEGER * 1e10) {
    return 'effectively uncrackable';
  }
  const seconds = guesses / GUESSES_PER_SECOND;
  if (!Number.isFinite(seconds) || seconds > 1e15) {
    return '> centuries';
  }
  return formatTime(seconds);
}

export const PasswordStrengthBoxSource = {
  name: 'Password Strength',
  description:
    'Estimate password entropy and strength (character-set size × length).',
  // a famously-public example password, so the default doesn't nudge users
  // toward typing a real one (which would land in the page URL)
  defaultInput: 'correcthorsebatterystaple ::strength',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'strength', 'pwstrength')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const classes = detectClasses(input);
    const pool = poolSize(classes);
    const bits = entropyBits(input.length, pool);

    const outputOptions: Record<string, string> = {
      Length: input.length.toString(),
      'Character Set': characterSetLabel(classes),
      'Pool Size': pool.toString(),
      Entropy: `${bits.toFixed(1)} bits`,
      Rating: rating(bits),
      'Est. Crack Time': estimateCrackTime(input.length, pool),
      Note: 'your password is in the page URL — do not share this link',
    };

    // plaintext summary for headless/TUI consumers — no password echoed
    const content = Object.entries(outputOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Password Strength', content)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(outputOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PasswordStrengthBoxSource;
