import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityDateCalculate = 10;

interface Match {
  result: string;
  fromDate: string;
  toDate: string;
  days: number;
  operation: string;
}

// regex pattern for date calculation
const MONTH =
  '(?:0?[1-9]|1[0-2]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DAY = '(?:0?[1-9]|[12][0-9]|3[01])';
const TZ = '(?:Z|[+-]\\d{2}(?::?\\d{2})?)';
const DATE = [
  'today',
  'now',
  `\\d{4}-${MONTH}-${DAY}`, // 2025-04-25
  `\\d{4}/${MONTH}/${DAY}`, // 2025/04/25
  `${MONTH}-${DAY}-\\d{4}`, // 04/25/2025
  `\\d{4}-${MONTH}-${DAY}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?${TZ}?`, // 2025-04-25T12:00:00.123456Z or +08:00
  `\\d{4}-${MONTH}-${DAY} \\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?${TZ}?`, // 2025-04-25 12:00:00.123456
  '\\d{13}', // timestamp like 1682419200000
].join('|');
const OPERATOR = '[+-]';
const NUMBER = '\\d+';
const UNIT =
  '(?:d|day|days|h|hour|hours|m|min|minute|minutes|s|sec|second|seconds|ms|millisecond|milliseconds)';

const ADD_PATTERN = new RegExp(
  `^(${DATE})\\s*(${OPERATOR})\\s*(${NUMBER})\\s*(${UNIT})$`,
  'i',
);
const DIFF_PATTERN = new RegExp(`^(${DATE})\\s+(?:to|-)\\s+(${DATE})$`, 'i');

const parseDate = (s: string): Date => {
  const dateString = s.toLowerCase();
  if (
    dateString.toLowerCase() === 'now' ||
    dateString.toLowerCase() === 'today'
  ) {
    return new Date();
  }
  if (dateString === 'tomorrow') {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (dateString === 'yesterday') {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  }
  return new Date(s);
};

export const DateCalculateBoxSource = {
  name: 'Date Calculate',
  description:
    'Add or subtract days from a date, or compute the duration between two dates.',
  defaultInput: 'now + 7d',
  tag: '⏱',
  kind: 'Time',
  priority: PriorityDateCalculate,

  // Deal with the pattern of `now + 20d` or `2024-10-31 + 30d`
  checkAddSubtractPattern(input: string): Match | undefined {
    const addMatch = ADD_PATTERN.exec(input);
    if (!addMatch) {
      return undefined;
    }

    const fromDate = parseDate(addMatch[1]);
    if (Number.isNaN(fromDate.getTime())) {
      return undefined;
    }

    const operation = addMatch[2];
    const amount = parseInt(addMatch[3], 10);
    const unit = addMatch[4].toLowerCase();
    const resultDate = new Date(fromDate);

    const multipliers: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      hour: 60 * 60 * 1000,
      hours: 60 * 60 * 1000,
      m: 60 * 1000,
      min: 60 * 1000,
      minute: 60 * 1000,
      minutes: 60 * 1000,
      s: 1000,
      sec: 1000,
      second: 1000,
      seconds: 1000,
      ms: 1,
      millisecond: 1,
      milliseconds: 1,
    };
    const multiplier = multipliers[unit] || 0;

    if (operation === '+') {
      resultDate.setTime(fromDate.getTime() + amount * multiplier);
    } else if (operation === '-') {
      resultDate.setTime(fromDate.getTime() - amount * multiplier);
    }

    const fromISO = fromDate.toISOString();
    const resultISO = resultDate.toISOString();

    return {
      result: resultISO.endsWith('T00:00:00.000Z')
        ? resultISO.split('T')[0]
        : resultISO,
      fromDate: fromISO.endsWith('T00:00:00.000Z')
        ? fromISO.split('T')[0]
        : fromISO,
      toDate: resultISO.endsWith('T00:00:00.000Z')
        ? resultISO.split('T')[0]
        : resultISO,
      days: amount * (multiplier / (24 * 60 * 60 * 1000)),
      operation,
    };
  },

  // Deal with the pattern of `now to 2025-10-31` or `2024-10-31 to now`
  checkDateDiffPattern(input: string): Match | undefined {
    const diffMatch = DIFF_PATTERN.exec(input);
    if (!diffMatch) {
      return undefined;
    }

    const fromStr = diffMatch[1];
    const toStr = diffMatch[2];
    const fromDate = parseDate(fromStr);
    if (Number.isNaN(fromDate.getTime())) {
      return undefined;
    }
    const toDate = parseDate(toStr);
    if (Number.isNaN(toDate.getTime())) {
      return undefined;
    }

    const timeDiffMs = toDate.getTime() - fromDate.getTime();

    // Support microseconds if both inputs have them
    const getExtraUs = (s: string) => {
      const m = /\.(\d+)/.exec(s);
      if (!m) return 0;
      const fraction = m[1];
      if (fraction.length <= 3) return 0;
      return parseInt(fraction.slice(3, 6).padEnd(3, '0'), 10);
    };

    const fromExtraUs = getExtraUs(fromStr);
    const toExtraUs = getExtraUs(toStr);
    const totalDiffUs =
      BigInt(timeDiffMs) * 1000n + BigInt(toExtraUs - fromExtraUs);

    const formatDiff = (diffUs: bigint): string => {
      const isNegative = diffUs < 0n;
      let absUs = diffUs < 0n ? -diffUs : diffUs;

      if (absUs === 0n) return '0 seconds';

      const days = absUs / (24n * 60n * 60n * 1000n * 1000n);
      absUs %= 24n * 60n * 60n * 1000n * 1000n;
      const hours = absUs / (60n * 60n * 1000n * 1000n);
      absUs %= 60n * 60n * 1000n * 1000n;
      const minutes = absUs / (60n * 1000n * 1000n);
      absUs %= 60n * 1000n * 1000n;
      const seconds = absUs / (1000n * 1000n);
      absUs %= 1000n * 1000n;
      const ms = absUs / 1000n;
      const us = absUs % 1000n;

      const parts: string[] = [];
      if (days > 0n) parts.push(`${days}d`);
      if (hours > 0n) parts.push(`${hours}h`);
      if (minutes > 0n) parts.push(`${minutes}m`);
      if (seconds > 0n) parts.push(`${seconds}s`);
      if (ms > 0n) parts.push(`${ms}ms`);
      if (us > 0n) parts.push(`${us}us`);

      if (parts.length === 0) return '0 seconds';

      // Special case: if it's only days and no other units, use the old format "X days"
      if (parts.length === 1 && days > 0n) {
        return `${isNegative ? '-' : ''}${days} ${days > 1n ? 'days' : 'day'}`;
      }

      return (isNegative ? '-' : '') + parts.join(' ');
    };

    const result = formatDiff(totalDiffUs);
    const daysDiff = Math.round(timeDiffMs / (1000 * 3600 * 24));

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    return {
      result,
      fromDate: fromISO.endsWith('T00:00:00.000Z')
        ? fromISO.split('T')[0]
        : fromISO,
      toDate: toISO.endsWith('T00:00:00.000Z') ? toISO.split('T')[0] : toISO,
      days: daysDiff,
      operation: 'diff',
    };
  },

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }

    const regularInput = trim(input);
    if (regularInput === '') {
      return undefined;
    }

    // Try to match the pattern of adding or subtracting days
    const addSubtractMatch = this.checkAddSubtractPattern(regularInput);
    if (addSubtractMatch) {
      return addSubtractMatch;
    }

    // Try to match the pattern of date difference
    const dateDiffMatch = this.checkDateDiffPattern(regularInput);
    if (dateDiffMatch) {
      return dateDiffMatch;
    }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { result, fromDate, toDate, days, operation } = match;

    return [
      new BoxBuilder('Date Calculate', result)
        .setTemplate(DefaultBoxTemplate)
        .setOptions({
          fromDate,
          toDate,
          days: days.toString(),
          operation,
        })
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DateCalculateBoxSource;
export const exportedForTesting = {
  DATE,
  parseDate,
};
