import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

const BOX_NAME = 'Leap Year';
// require year >= 1 (no leading zeros, no year 0 — which JS would treat as a
// leap year and report a nonsensical negative "previous leap year")
const YEAR_RE = /^[1-9]\d{0,6}$/;

/** returns true when the given year satisfies the Gregorian leap year rule */
function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** human-readable explanation of the leap-year rule that applied */
function leapReason(year: number): string {
  if (year % 400 === 0) return `${year}: divisible by 400 → leap`;
  if (year % 100 === 0)
    return `${year}: divisible by 100 but not 400 → not leap`;
  if (year % 4 === 0) return `${year}: divisible by 4, not by 100 → leap`;
  return `${year}: not divisible by 4 → not leap`;
}

/** finds the nearest leap year strictly greater than the given year */
function nextLeap(year: number): number {
  let y = year + 1;
  while (!isLeapYear(y)) y++;
  return y;
}

/** finds the nearest leap year strictly less than the given year */
function prevLeap(year: number): number {
  let y = year - 1;
  while (!isLeapYear(y)) y--;
  return y;
}

/** renders a key-value record as plaintext for headless consumers */
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const INVALID_BOX_MSG =
  'Invalid input. Expected a numeric year (1–7 digits), e.g. 2024 ::leapyear';

export const LeapYearBoxSource = {
  name: 'Leap Year',
  description:
    'Check whether a year is a leap year (Gregorian), with the reason and nearby leap years.',
  defaultInput: '2024 ::leapyear',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'leapyear', 'isleap')) return [];

    // prefer a numeric option value (e.g. ::leapyear=2024), else fall back to input
    const optVal = extractOptionKeys(options, 'leapyear', 'isleap');
    const raw =
      typeof optVal === 'string' && YEAR_RE.test(optVal.trim())
        ? optVal.trim()
        : trim(input);

    if (!YEAR_RE.test(raw)) {
      return [
        new BoxBuilder(BOX_NAME, INVALID_BOX_MSG)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const year = Number.parseInt(raw, 10);
    const leap = isLeapYear(year);

    const kv: Record<string, string> = {
      Year: String(year),
      'Leap Year': String(leap),
      Reason: leapReason(year),
      'Days in Year': leap ? '366' : '365',
      'February Days': leap ? '29' : '28',
      'Next Leap Year': String(nextLeap(year)),
      // the first Gregorian leap year is 4 AD; nothing earlier to report
      'Previous Leap Year': year > 4 ? String(prevLeap(year)) : 'none',
    };

    return [
      new BoxBuilder(BOX_NAME, kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default LeapYearBoxSource;
