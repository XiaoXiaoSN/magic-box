import { setRuntimePrefs } from '@functions/runtimePrefs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CronExpressionBoxSource } from '../CronExpressionBoxSource';

describe('CronExpressionBoxSource', () => {
  afterEach(() => {
    setRuntimePrefs({
      timezoneMode: 'fixed',
      timezoneOffset: 8,
      locale: 'en',
    });
    vi.useRealTimers();
  });

  describe('checkMatch', () => {
    it('should return undefined for empty input', async () => {
      expect(await CronExpressionBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for invalid cron expression', async () => {
      expect(await CronExpressionBoxSource.checkMatch('123')).toBeUndefined();
      expect(
        await CronExpressionBoxSource.checkMatch('invalid cron'),
      ).toBeUndefined();
    });

    it('should return a match for valid cron expression', async () => {
      const result = await CronExpressionBoxSource.checkMatch('* * * * *');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('Every minute');
    });

    it('should accept case-insensitive month and weekday names', async () => {
      const weekday =
        await CronExpressionBoxSource.checkMatch('0 9 * * mon-fri');
      const month = await CronExpressionBoxSource.checkMatch('0 0 1 jan *');

      expect(weekday?.answer).toBe('At 09:00, Monday through Friday');
      expect(month?.answer).toBe(
        'At 00:00, on day 1 of the month, only in January',
      );
    });

    it.each([
      ['@yearly', 'At 00:00, on day 1 of the month, only in January'],
      ['@annually', 'At 00:00, on day 1 of the month, only in January'],
      ['@monthly', 'At 00:00, on day 1 of the month'],
      ['@weekly', 'At 00:00, only on Sunday'],
      ['@daily', 'At 00:00'],
      ['@midnight', 'At 00:00'],
      ['@hourly', 'Every hour'],
    ])('should expand %s before describing it', async (input, answer) => {
      const result = await CronExpressionBoxSource.checkMatch(input);
      expect(result?.answer).toBe(answer);
    });

    it('should keep five, six, and seven field descriptions', async () => {
      const five = await CronExpressionBoxSource.checkMatch('0 9 * * 1-5');
      const six = await CronExpressionBoxSource.checkMatch('0 * * * * *');
      const seven =
        await CronExpressionBoxSource.checkMatch('0 0 9 1 * ? 2026');

      expect(five?.answer).toBe('At 09:00, Monday through Friday');
      expect(six?.answer).toBe('Every minute');
      expect(seven?.answer).toBe(
        'At 09:00, on day 1 of the month, only in 2026',
      );
    });

    it('should reject unknown names before loading cronstrue', async () => {
      expect(
        await CronExpressionBoxSource.checkMatch('0 9 * * MON-FUNDAY'),
      ).toBeUndefined();
      expect(
        await CronExpressionBoxSource.checkMatch('0 0 1 JANUARY *'),
      ).toBeUndefined();
    });

    it('should handle language options', async () => {
      let result = await CronExpressionBoxSource.checkMatch('* * * * *', {
        lang: 'zh',
      });
      expect(result).toBeDefined();
      expect(result?.answer).toBe('每分鐘');

      result = await CronExpressionBoxSource.checkMatch('* * * * * *', {
        lang: 'ru',
      });
      expect(result).toBeDefined();
      expect(result?.answer).toBe('Каждую секунду');
    });
  });

  describe('generateBoxes', () => {
    it('should return an empty array for invalid cron expression', async () => {
      const boxes = await CronExpressionBoxSource.generateBoxes('invalid cron');
      expect(boxes).toHaveLength(0);
    });

    it('should return a box for valid cron expression', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      setRuntimePrefs({ timezoneMode: 'fixed', timezoneOffset: 0 });
      const boxes = await CronExpressionBoxSource.generateBoxes('* * * * *');
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Cron Expression');
      expect(boxes[0].props.plaintextOutput).toBe('Every minute');
      expect(boxes[0].boxTemplate).toBeUndefined();
      expect(boxes[1].props.name).toBe('Next executions');
      expect(boxes[1].props.options).toEqual({
        '1': '2024-01-01T00:01:00.000+00:00',
        '2': '2024-01-01T00:02:00.000+00:00',
        '3': '2024-01-01T00:03:00.000+00:00',
        '4': '2024-01-01T00:04:00.000+00:00',
        '5': '2024-01-01T00:05:00.000+00:00',
      });
    });

    it('should preserve the description while labelling advanced next times unavailable', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const boxes = await CronExpressionBoxSource.generateBoxes('0 0 L * *');

      expect(boxes[0].props.plaintextOutput).toContain('last day');
      expect(boxes[1].props.plaintextOutput).toMatch(
        /next execution times unavailable/i,
      );
    });
  });
});
