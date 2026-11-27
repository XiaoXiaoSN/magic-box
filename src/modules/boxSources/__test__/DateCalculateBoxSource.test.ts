import { setRuntimePrefs } from '@functions/runtimePrefs';
import { expect, it, vi } from 'vitest';
import {
  DateCalculateBoxSource,
  exportedForTesting,
} from '../DateCalculateBoxSource';

describe('DateCalculateBoxSource', () => {
  beforeEach(() => {
    setRuntimePrefs({ timezoneOffset: 8, timezoneMode: 'fixed', locale: 'en' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    setRuntimePrefs({ timezoneOffset: 8, timezoneMode: 'fixed', locale: 'en' });
  });

  describe('parseDate', () => {
    it.each([
      ['2024-01-01', '2024-01-01T00:00:00.000Z'],
      ['2024/01/01', '2024-01-01T00:00:00.000Z'],
      ['2024-01-01T00:00:00Z', '2024-01-01T00:00:00.000Z'],
      ['2024-01-01T00:00:00.00Z', '2024-01-01T00:00:00.000Z'],
      ['2024-01-01 00:00:00', '2023-12-31T16:00:00.000Z'],
      ['2024-01-01T00:00:00.123456Z', '2024-01-01T00:00:00.123Z'],
      ['2024-01-01T00:00:00.123456+08:00', '2023-12-31T16:00:00.123Z'],
      ['2024-01-01 00:00:00.123456', '2023-12-31T16:00:00.123Z'],
      ['now', '2024-01-01T00:00:00.000Z'],
      ['today', '2024-01-01T00:00:00.000Z'],
    ])('should parse %s to the expected instant', (dateString: string, expectedInstant: string) => {
      const DATE_PATTERN = new RegExp(exportedForTesting.DATE, 'i');
      const match = dateString.match(DATE_PATTERN);
      expect(match).toBeTruthy();
      const parsedDate = exportedForTesting.parseDate(dateString);
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.toISOString()).toBe(expectedInstant);
    });

    it('should parse `tomorrow`', () => {
      const parsedDate = exportedForTesting.parseDate('tomorrow');
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.toISOString()).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should parse `yesterday`', () => {
      const parsedDate = exportedForTesting.parseDate('yesterday');
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.toISOString()).toBe('2023-12-31T00:00:00.000Z');
    });
  });

  describe('yearless leap day', () => {
    const leapDayInputs = [
      'Feb 29',
      '02/29',
      'Feb 29 12:30:00',
      '02/29T12:30:00',
    ];

    it.each([2025, 2026])('rejects February 29 in %i', async (year) => {
      vi.setSystemTime(new Date(`${year}-01-01T00:00:00Z`));
      for (const input of leapDayInputs) {
        expect(
          DateCalculateBoxSource.checkMatch(`${input} + 0d`),
        ).toBeUndefined();
        expect(
          DateCalculateBoxSource.checkMatch(`${input} to today`),
        ).toBeUndefined();
        const [box] = await DateCalculateBoxSource.generateBoxes(input, {
          relative: true,
        });
        expect(box?.props.plaintextOutput).toBe(`Invalid date: "${input}"`);
      }
    });

    it.each(leapDayInputs)('accepts %s in 2024', (input) => {
      expect(
        DateCalculateBoxSource.checkMatch(`${input} + 0d`)?.fromDate,
      ).toMatch(/^2024-02-29/);
    });

    it.each([
      '02/29\t12:30:00',
      'Feb 29\t12:30:00',
    ])('keeps the time for %s', async (input) => {
      const [relative] = await DateCalculateBoxSource.generateBoxes(input, {
        relative: true,
      });
      expect(relative?.props.options?.ISO).toBe('2024-02-29T04:30:00.000Z');
      expect(DateCalculateBoxSource.checkMatch(`${input} + 0d`)?.fromDate).toBe(
        '2024-02-29T12:30:00.000+08:00',
      );
    });

    it.each(['02/29', 'Feb 29'])('rejects two times after %s', async (date) => {
      const input = `${date} 04:00:00 12:30:00`;
      const [box] = await DateCalculateBoxSource.generateBoxes(input, {
        relative: true,
      });
      expect(box?.props.plaintextOutput).toBe(`Invalid date: "${input}"`);
    });

    it('resolves the year using the active timezone for an omitted year only', async () => {
      vi.setSystemTime(new Date('2025-01-01T02:00:00Z'));
      expect(await DateCalculateBoxSource.generateBoxes('Feb 29 + 0d')).toEqual(
        [],
      );
      const [yearless] = await DateCalculateBoxSource.generateBoxes(
        'Feb 29 + 0d',
        { tz: '-8' },
      );
      expect(yearless?.props.plaintextOutput).toBe('2024-02-29');
      expect(
        DateCalculateBoxSource.checkMatch('2000-02-29 + 0d')?.fromDate,
      ).toBe('2000-02-29');
    });
  });

  describe('checkAddSubtractPattern', () => {
    it('should return undefined for non-matching input', () => {
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern(''),
      ).toBeUndefined();
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('invalid'),
      ).toBeUndefined();
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('2024/01-01 + 20d'),
      ).toBeUndefined();
    });

    it('should handle "now + days" format', () => {
      const result =
        DateCalculateBoxSource.checkAddSubtractPattern('now + 20d');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-01-01T08:00:00.000+08:00');
      expect(result?.toDate).toBe('2024-01-21T08:00:00.000+08:00');
      expect(result?.days).toBe(20);
      expect(result?.operation).toBe('+');
    });

    it('should handle "now - days" format', () => {
      const result =
        DateCalculateBoxSource.checkAddSubtractPattern('now - 10d');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-01-01T08:00:00.000+08:00');
      expect(result?.toDate).toBe('2023-12-22T08:00:00.000+08:00');
      expect(result?.days).toBe(10);
      expect(result?.operation).toBe('-');
    });

    it('should handle "specific date + days" format', () => {
      const result =
        DateCalculateBoxSource.checkAddSubtractPattern('2024-10-31 + 30d');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-10-31');
      expect(result?.toDate).toBe('2024-11-30');
      expect(result?.days).toBe(30);
      expect(result?.operation).toBe('+');
    });

    it('should handle "specific date - days" format', () => {
      const result =
        DateCalculateBoxSource.checkAddSubtractPattern('2024-10-31 - 30d');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-10-31');
      expect(result?.toDate).toBe('2024-10-01');
      expect(result?.days).toBe(30);
      expect(result?.operation).toBe('-');
    });

    it('should handle multiple units (h, m, s, ms)', () => {
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('now + 1h')?.result,
      ).toBe('2024-01-01T09:00:00.000+08:00');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('now + 30m')?.result,
      ).toBe('2024-01-01T08:30:00.000+08:00');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('now + 45s')?.result,
      ).toBe('2024-01-01T08:00:45.000+08:00');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('now + 500ms')?.result,
      ).toBe('2024-01-01T08:00:00.500+08:00');
    });

    it('should handle addition with timezone offset', () => {
      // 2024-01-01T00:00:00+08:00 is 2023-12-31T16:00:00.000Z
      const result = DateCalculateBoxSource.checkAddSubtractPattern(
        '2024-01-01T00:00:00+08:00 + 1h',
      );
      expect(result?.result).toBe('2023-12-31T17:00:00.000Z');
    });

    it('uses the configured timezone for supplied datetimes without offsets', () => {
      setRuntimePrefs({ timezoneOffset: 5.75, timezoneMode: 'fixed' });
      const result = DateCalculateBoxSource.checkAddSubtractPattern(
        '2024-10-27 12:30:00 + 1h',
      );
      expect(result?.fromDate).toBe('2024-10-27T12:30:00.000+05:45');
      expect(result?.toDate).toBe('2024-10-27T13:30:00.000+05:45');
    });

    it('resolves system offsets at the supplied wall time across DST', () => {
      const transition = new Date('2025-03-09T10:00:00Z').getTime();
      vi.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(
        function (this: Date) {
          return this.getTime() < transition ? 480 : 420;
        },
      );
      setRuntimePrefs({ timezoneMode: 'system' });
      const result = DateCalculateBoxSource.checkAddSubtractPattern(
        '2025-03-09 03:30:00 + 1h',
      );
      expect(result?.fromDate).toBe('2025-03-09T03:30:00.000-07:00');
      expect(result?.toDate).toBe('2025-03-09T04:30:00.000-07:00');
    });

    it('rejects invalid calendar dates and mixed date separators', () => {
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('2024-02-30 + 1d'),
      ).toBeUndefined();
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('2024/02-29 + 1d'),
      ).toBeUndefined();
    });

    it('adds weeks and clamps month and year additions to month end', () => {
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('2024-01-01 + 2 weeks')
          ?.result,
      ).toBe('2024-01-15');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('2024-01-31 + 1 month')
          ?.result,
      ).toBe('2024-02-29');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('2024-02-29 + 1 year')
          ?.result,
      ).toBe('2025-02-28');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('2026-Jun-25 + 1d')
          ?.result,
      ).toBe('2026-06-26');
    });

    it('matches supported date, timestamp, and relative-day alternatives', () => {
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('04/25/2025 + 1d')
          ?.result,
      ).toBe('2025-04-26');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('1682419200 + 1d')
          ?.result,
      ).toBe('2023-04-26T10:40:00.000Z');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('tomorrow + 1d')?.result,
      ).toBe('2024-01-03');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('now + 2w')?.result,
      ).toBe('2024-01-15T08:00:00.000+08:00');
    });

    it('rejects timestamp and datetime hybrid inputs', () => {
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern(
          '1735794245T12:00:00 + 1h',
        ),
      ).toBeUndefined();
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern(
          '1735794245000 12:00:00 + 1h',
        ),
      ).toBeUndefined();
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern('20240101T12:00:00 + 1h')
          ?.result,
      ).toBe('2024-01-01T13:00:00.000+08:00');
    });

    it('preserves four-digit years in date-only results and reparsing', () => {
      const first =
        DateCalculateBoxSource.checkAddSubtractPattern('0001-01-01 + 1d');
      expect(first?.result).toBe('0001-01-02');
      expect(
        DateCalculateBoxSource.checkAddSubtractPattern(`${first?.result} + 1d`)
          ?.result,
      ).toBe('0001-01-03');
    });

    it('keeps date-only calculations on calendar days across DST boundaries', () => {
      vi.stubEnv('TZ', 'America/Los_Angeles');
      const result = DateCalculateBoxSource.checkDateDiffPattern(
        '2025-03-08 to 2025-03-10',
      );
      expect(result?.result).toBe('2 days');
      expect(result?.days).toBe(2);
    });
  });

  describe('checkDateDiffPattern', () => {
    it('should return undefined for non-matching input', () => {
      expect(DateCalculateBoxSource.checkDateDiffPattern('')).toBeUndefined();
      expect(
        DateCalculateBoxSource.checkDateDiffPattern('invalid'),
      ).toBeUndefined();
      expect(
        DateCalculateBoxSource.checkDateDiffPattern('2024/01-01 to 2025/01/01'),
      ).toBeUndefined();
    });

    it('should handle "now to specific date" format', () => {
      const result =
        DateCalculateBoxSource.checkDateDiffPattern('now to 2024-12-31');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-01-01T08:00:00.000+08:00');
      expect(result?.toDate).toBe('2024-12-31');
      expect(result?.days).toBe(365);
      expect(result?.operation).toBe('diff');
    });

    it('should handle "specific date to specific date" format', () => {
      const result = DateCalculateBoxSource.checkDateDiffPattern(
        '2024-01-01 to 2024-12-31',
      );
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-01-01');
      expect(result?.toDate).toBe('2024-12-31');
      expect(result?.days).toBe(365);
      expect(result?.operation).toBe('diff');
    });

    it('treats date-only punctuation variants as the same calendar date', () => {
      expect(
        DateCalculateBoxSource.checkDateDiffPattern('2025-04-25 to 2025/04/25')
          ?.result,
      ).toBe('0 seconds');
      expect(
        DateCalculateBoxSource.checkDateDiffPattern('2025-4-25 to 2025-04-25')
          ?.result,
      ).toBe('0 seconds');
    });

    it('should handle "specific date to now" format', () => {
      const result =
        DateCalculateBoxSource.checkDateDiffPattern('2023-01-01 to now');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2023-01-01');
      expect(result?.toDate).toBe('2024-01-01T08:00:00.000+08:00');
      expect(result?.days).toBe(365);
      expect(result?.operation).toBe('diff');
    });

    it('should be case insensitive for "to" keyword', () => {
      const result =
        DateCalculateBoxSource.checkDateDiffPattern('now TO 2024-12-31');
      expect(result).toBeDefined();
      expect(result?.operation).toBe('diff');
    });

    it('should handle "-" separator for difference', () => {
      const result = DateCalculateBoxSource.checkDateDiffPattern(
        '2024-01-02 - 2024-01-01',
      );
      expect(result?.result).toBe('-1 day');
    });

    it('should handle precise differences with microseconds', () => {
      const d1 = '2024-01-01T00:00:00.100000Z';
      const d2 = '2024-01-01T00:00:00.100500Z';
      const result = DateCalculateBoxSource.checkDateDiffPattern(
        `${d1} to ${d2}`,
      );
      expect(result?.result).toBe('500us');
    });

    it.each([
      [
        'microseconds within a millisecond',
        '1704067200000001',
        '1704067200000002',
        '2024-01-01T00:00:00.000001Z',
        '2024-01-01T00:00:00.000002Z',
      ],
      [
        'microseconds across a millisecond',
        '1704067200000999',
        '1704067200001000',
        '2024-01-01T00:00:00.000999Z',
        '2024-01-01T00:00:00.001000Z',
      ],
      [
        'microseconds before the Unix epoch',
        '-1704067200000001',
        '-1704067200000000',
        '1916-01-01T23:59:59.999999Z',
        '1916-01-02T00:00:00Z',
      ],
      [
        'nanoseconds a whole microsecond apart',
        '1704067200000001500',
        '1704067200000002500',
        '2024-01-01T00:00:00.000001500Z',
        '2024-01-01T00:00:00.000002500Z',
      ],
      [
        'nanoseconds before the Unix epoch',
        '-1704067200000000500',
        '-1704067199999999500',
        '1916-01-01T23:59:59.999999500Z',
        '1916-01-02T00:00:00.000000500Z',
      ],
    ])('matches RFC3339 for %s in both directions', (_, start, end, startIso, endIso) => {
      const forwardIso = DateCalculateBoxSource.checkMatch(
        `${startIso} to ${endIso}`,
      );
      const reverseIso = DateCalculateBoxSource.checkMatch(
        `${endIso} to ${startIso}`,
      );
      expect(forwardIso?.result).toBe('1us');
      expect(reverseIso?.result).toBe('-1us');
      expect(DateCalculateBoxSource.checkMatch(`${start} to ${end}`)).toEqual(
        forwardIso,
      );
      expect(DateCalculateBoxSource.checkMatch(`${end} to ${start}`)).toEqual(
        reverseIso,
      );
    });

    it('preserves milliseconds across a span larger than a safe integer', () => {
      const start = '-8639999999999999000000';
      const end = '8640000000000000000000';
      expect(
        DateCalculateBoxSource.checkMatch(`${start} to ${end}`)?.result,
      ).toBe('199999999d 23h 59m 59s 999ms');
      expect(
        DateCalculateBoxSource.checkMatch(`${end} to ${start}`)?.result,
      ).toBe('-199999999d 23h 59m 59s 999ms');
    });

    it('should handle differences across different timezones', () => {
      // Both are 2024-01-01T00:00:00Z
      const result = DateCalculateBoxSource.checkDateDiffPattern(
        '2024-01-01T08:00:00+08:00 to 2024-01-01T00:00:00Z',
      );
      expect(result?.result).toBe('0 seconds');
    });
  });

  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(DateCalculateBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for invalid date format', () => {
      expect(DateCalculateBoxSource.checkMatch('now + 20')).toBeUndefined();
    });

    it('should handle add/subtract pattern', () => {
      const result = DateCalculateBoxSource.checkMatch('now + 20d');
      expect(result).toBeDefined();
      expect(result?.operation).toBe('+');
    });

    it('should handle date diff pattern', () => {
      const result = DateCalculateBoxSource.checkMatch('now to 2024-12-31');
      expect(result).toBeDefined();
      expect(result?.operation).toBe('diff');
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid input', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('invalid input');
      expect(boxes).toHaveLength(0);
    });

    it('should generate correct box for addition format', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('now + 20d');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Date Calculate');
      expect(boxes[0].props.plaintextOutput).toBe(
        '2024-01-21T08:00:00.000+08:00',
      );
      expect(boxes[0].boxTemplate).toBeUndefined();
    });

    it('should generate correct box for subtraction format', async () => {
      const boxes =
        await DateCalculateBoxSource.generateBoxes('2024-10-31 - 30d');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Date Calculate');
      expect(boxes[0].props.plaintextOutput).toBe('2024-10-01');
    });

    it('should support different types of day patterns', async () => {
      let boxes = await DateCalculateBoxSource.generateBoxes('now + 20D');
      expect(boxes[0].props.options).toEqual({
        fromDate: '2024-01-01T08:00:00.000+08:00',
        toDate: '2024-01-21T08:00:00.000+08:00',
        days: '20',
        operation: '+',
      });

      boxes = await DateCalculateBoxSource.generateBoxes('now + 20days');
      expect(boxes[0]?.props?.options).toEqual({
        fromDate: '2024-01-01T08:00:00.000+08:00',
        toDate: '2024-01-21T08:00:00.000+08:00',
        days: '20',
        operation: '+',
      });

      boxes = await DateCalculateBoxSource.generateBoxes('now + 20day');
      expect(boxes[0].props.options).toEqual({
        fromDate: '2024-01-01T08:00:00.000+08:00',
        toDate: '2024-01-21T08:00:00.000+08:00',
        days: '20',
        operation: '+',
      });

      boxes = await DateCalculateBoxSource.generateBoxes('now + 20DaYS');
      expect(boxes[0].props.options).toEqual({
        fromDate: '2024-01-01T08:00:00.000+08:00',
        toDate: '2024-01-21T08:00:00.000+08:00',
        days: '20',
        operation: '+',
      });
    });

    it('should generate correct box for difference format', async () => {
      const boxes =
        await DateCalculateBoxSource.generateBoxes('now to 2024-12-31');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Date Calculate');
      expect(boxes[0].props.plaintextOutput).toBe('365 days');
    });

    it('renders a submillisecond duration from numeric timestamps', async () => {
      const [box] = await DateCalculateBoxSource.generateBoxes(
        '1704067200000001 to 1704067200000002',
      );
      expect(box?.props.name).toBe('Date Calculate');
      expect(box?.props.plaintextOutput).toBe('1us');
    });

    it('should set correct options in box props', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('now + 20d');
      expect(boxes[0].props.options).toEqual({
        fromDate: '2024-01-01T08:00:00.000+08:00',
        toDate: '2024-01-21T08:00:00.000+08:00',
        days: '20',
        operation: '+',
      });
    });
  });

  describe('timezone', () => {
    const output = async (
      input: string,
      options: Record<string, string | boolean> | null = null,
    ) =>
      (await DateCalculateBoxSource.generateBoxes(input, options))[0]?.props
        .plaintextOutput;

    it('renders `now` in the settings timezone', async () => {
      expect(await output('now + 16h')).toBe('2024-01-02T00:00:00.000+08:00');
    });

    it.each([
      ['0', '2024-01-01T16:00:00.000+00:00'],
      ['-8', '2024-01-01T08:00:00.000-08:00'],
      ['+05:30', '2024-01-01T21:30:00.000+05:30'],
      ['UTC+9', '2024-01-02T01:00:00.000+09:00'],
      ['taipei', '2024-01-02T00:00:00.000+08:00'],
      ['New York', '2024-01-01T11:00:00.000-05:00'],
      ['Europe/London', '2024-01-01T16:00:00.000+00:00'],
    ])('`::tz=%s` overrides the settings timezone', async (tz, expected) => {
      expect(await output('now + 16h', { tz })).toBe(expected);
    });

    it('accepts `::timezone` as an alias', async () => {
      expect(await output('now + 16h', { timezone: 'utc' })).toBe(
        '2024-01-01T16:00:00.000+00:00',
      );
    });

    it('interprets zone-less wall-clock input in the override', async () => {
      expect(await output('2024-01-01 00:00:00 + 1h', { tz: '0' })).toBe(
        '2024-01-01T01:00:00.000+00:00',
      );
    });

    it('keeps an explicit input offset', async () => {
      expect(await output('2024-01-01T00:00:00Z + 1h', { tz: 'taipei' })).toBe(
        '2024-01-01T01:00:00.000Z',
      );
    });

    it('resolves `today` in the override', async () => {
      expect(await output('today + 1d')).toBe('2024-01-02');
      expect(await output('today + 1d', { tz: '-8' })).toBe('2024-01-01');
    });

    it('follows DST for named zones', async () => {
      // 2025-03-09T06:00Z is 01:00 EST, one hour before the spring-forward gap.
      vi.setSystemTime(new Date('2025-03-09T06:00:00Z'));
      expect(await output('now + 2h', { tz: 'new_york' })).toBe(
        '2025-03-09T04:00:00.000-04:00',
      );
      expect(await output('now + 1d', { tz: 'new_york' })).toBe(
        '2025-03-10T01:00:00.000-04:00',
      );
    });

    it('ignores a bare `::tz` that is still being typed', async () => {
      expect(await output('now + 16h', { tz: true })).toBe(
        '2024-01-02T00:00:00.000+08:00',
      );
    });

    it('reports an unknown timezone only for date input', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('now + 1h', {
        tz: 'mars',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
      expect(boxes[0].props.plaintextOutput).toBe('Unknown timezone "mars"');
      expect(
        await DateCalculateBoxSource.generateBoxes('hello', { tz: 'mars' }),
      ).toEqual([]);
    });
  });

  describe('Relative Time (Time Ago / Time Later)', () => {
    it('formats a past date as relative time ago', async () => {
      const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const boxes = await DateCalculateBoxSource.generateBoxes(past, {
        relative: true,
      });
      expect(boxes.length).toBe(1);
      expect(boxes[0].props.name).toBe('Relative Time');
      expect(boxes[0].props.plaintextOutput).toBe('3 days ago');
    });

    it('formats a future date as relative time later', async () => {
      const future = new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const boxes = await DateCalculateBoxSource.generateBoxes(future, {
        relative: true,
      });
      expect(boxes.length).toBe(1);
      expect(boxes[0].props.name).toBe('Relative Time');
      expect(boxes[0].props.plaintextOutput).toBe('in 5 days');
    });

    it('handles unix timestamp in seconds', async () => {
      const pastSec = Math.floor((Date.now() - 60000) / 1000).toString();
      const boxes = await DateCalculateBoxSource.generateBoxes(pastSec, {
        relative: true,
      });
      expect(boxes.length).toBe(1);
      expect(boxes[0].props.name).toBe('Relative Time');
      expect(boxes[0].props.plaintextOutput).toBe('1 minute ago');
    });

    it('formats relative text using the selected locale', async () => {
      setRuntimePrefs({ locale: 'zh-TW' });
      const boxes = await DateCalculateBoxSource.generateBoxes(
        '2024-01-04T00:00:00Z',
        { relative: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('3 天後');
    });

    it('maps the app Taiwan locale to the Intl locale', async () => {
      setRuntimePrefs({ locale: 'tw' });
      const boxes = await DateCalculateBoxSource.generateBoxes(
        '2024-01-04T00:00:00Z',
        { relative: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('3 天後');
    });
  });
});
