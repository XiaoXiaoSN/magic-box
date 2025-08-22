import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

const PriorityDateCalculate = 10;

interface Match {
  result: string;
  fromDate: string;
  toDate: string;
  days: number;
  operation: string;
}

// regex pattern for date calculation
const MONTH = '(?:0?[1-9]|1[0-2]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DAY = '(?:0?[1-9]|[12][0-9]|3[01])';
const DATE = [
  'today',
  'now',
  `\\d{4}-${MONTH}-${DAY}`, // 2025-04-25
  `\\d{4}/${MONTH}/${DAY}`, // 2025/04/25
  `${MONTH}-${DAY}-\\d{4}`, // 04/25/2025
  `\\d{4}-${MONTH}-${DAY}T\\d{2}:\\d{2}:\\d{2}Z?`, // 2025-04-25T12:00:00Z
  `\\d{4}-${MONTH}-${DAY}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z?`, // 2025-04-25T12:00:00Z
  `\\d{4}-${MONTH}-${DAY} \\d{2}:\\d{2}:\\d{2}`, // 2025-04-25 12:00:00
  '\\d{13}', // timestamp like 1682419200000
].join('|');
const OPERATOR = '[+-]';
const NUMBER = '\\d+';
const UNIT = 'd(ay(s)?)?';

const ADD_PATTERN = new RegExp(`^(${DATE})\\s*(${OPERATOR})\\s*(${NUMBER})${UNIT}$`, 'i');
const DIFF_PATTERN = new RegExp(`^(${DATE})\\s+to\\s+(${DATE})$`, 'i');

const parseDate = (s: string): Date => {
  const dateString = s.toLowerCase();
  if (dateString.toLowerCase() === 'now' || dateString.toLowerCase() === 'today') {
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
  description: 'Calculate the duration between two dates.',
  defaultInput: 'now + 7d',
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
    const days = parseInt(addMatch[3], 10);
    const resultDate = new Date(fromDate);

    if (operation === '+') {
      resultDate.setDate(fromDate.getDate() + days);
    } else if (operation === '-') {
      resultDate.setDate(fromDate.getDate() - days);
    }

    return {
      result: resultDate.toISOString().split('T')[0],
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: resultDate.toISOString().split('T')[0],
      days,
      operation,
    };
  },

  // Deal with the pattern of `now to 2025-10-31` or `2024-10-31 to now`
  checkDateDiffPattern(input: string): Match | undefined {
    const diffMatch = DIFF_PATTERN.exec(input);
    if (!diffMatch) {
      return undefined;
    }

    const fromDate = parseDate(diffMatch[1]);
    if (Number.isNaN(fromDate.getTime())) {
      return undefined;
    }
    const toDate = parseDate(diffMatch[2]);
    if (Number.isNaN(toDate.getTime())) {
      return undefined;
    }

    const timeDiff = toDate.getTime() - fromDate.getTime();
    const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));

    return {
      result: `${daysDiff} ${Math.abs(daysDiff) > 1 ? 'days' : 'day'}`,
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
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

    const {
      result, fromDate, toDate, days, operation,
    } = match;

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
