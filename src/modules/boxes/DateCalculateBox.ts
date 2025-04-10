import { DefaultBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';

const PriorityDateCalculate = 10;

interface Match {
  result: string;
  fromDate: string;
  toDate: string;
  days: number;
  operation: string;
}

export const DateCalculateBoxSource = {
  // Deal with the pattern of `now + 20d` or `2024-10-31 + 30d`
  checkAddSubtractPattern(input: string): Match | undefined {
    const addPattern = /^(now|(\d{4}-\d{2}-\d{2}))\s*([+-])\s*(\d+)([dD])$/i;
    const addMatch = input.match(addPattern);

    if (!addMatch) {
      return undefined;
    }

    const fromDate = addMatch[1].toLowerCase() === 'now'
      ? new Date()
      : new Date(addMatch[2]);

    if (Number.isNaN(fromDate.getTime())) {
      return undefined;
    }

    const operation = addMatch[3];
    const days = parseInt(addMatch[4], 10);
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
    const diffPattern = /^(now|(\d{4}-\d{2}-\d{2}))\s+to\s+(now|(\d{4}-\d{2}-\d{2}))$/i;
    const diffMatch = input.match(diffPattern);

    if (!diffMatch) {
      return undefined;
    }

    const fromDate = diffMatch[1].toLowerCase() === 'now'
      ? new Date()
      : new Date(diffMatch[2] || diffMatch[1]);

    const toDate = diffMatch[3].toLowerCase() === 'now'
      ? new Date()
      : new Date(diffMatch[4] || diffMatch[3]);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return undefined;
    }

    const timeDiff = toDate.getTime() - fromDate.getTime();
    const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));

    return {
      result: `${daysDiff} days`,
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
        .setPriority(PriorityDateCalculate)
        .setComponent(DefaultBox)
        .setOptions({
          fromDate,
          toDate,
          days: days.toString(),
          operation,
        })
        .build(),
    ];
  },
};

export default DateCalculateBoxSource;
