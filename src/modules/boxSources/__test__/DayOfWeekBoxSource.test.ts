import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { DayOfWeekBoxSource } from '../DayOfWeekBoxSource';

describe('DayOfWeekBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no options provided', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-12-25');
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option provided', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-12-25', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with valid option', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('', {
        dayofweek: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — ::dayofweek trigger', () => {
    it('2025-12-25 is Thursday', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-12-25', {
        dayofweek: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Day of Week');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.options).toMatchObject({
        Weekday: 'Thursday',
        'Leap Year': 'false',
      });
    });

    it('2000-01-01 is Saturday', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2000-01-01', {
        dayofweek: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Weekday: 'Saturday' });
    });

    it('2024-02-29 is Thursday, leap year, day 60', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2024-02-29', {
        dayofweek: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Weekday).toBe('Thursday');
      expect(opts['Leap Year']).toBe('true');
      expect(opts['Day of Year']).toBe('60');
    });
  });

  describe('generateBoxes — ::weekday trigger', () => {
    it('accepts ::weekday option', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-12-25', {
        weekday: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Weekday: 'Thursday' });
    });
  });

  describe('day of year', () => {
    it('2025-01-01 → Day of Year 1', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-01-01', {
        dayofweek: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'Day of Year': '1' });
    });

    it('2025-12-31 → Day of Year 365 (non-leap)', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-12-31', {
        dayofweek: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'Day of Year': '365' });
    });

    it('2024-12-31 → Day of Year 366 (leap)', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2024-12-31', {
        dayofweek: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'Day of Year': '366' });
    });
  });

  describe('ISO week number', () => {
    it('2021-01-01 → ISO Week 2020-W53', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2021-01-01', {
        dayofweek: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'ISO Week': '2020-W53' });
    });

    it('2025-12-29 → ISO Week 2026-W01 (rolls into next year)', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-12-29', {
        dayofweek: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'ISO Week': '2026-W01' });
    });

    it('2020-12-28 → ISO Week 2020-W53', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2020-12-28', {
        dayofweek: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'ISO Week': '2020-W53' });
    });
  });

  describe('invalid input', () => {
    it('non-date string returns error box', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('hello', {
        dayofweek: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Invalid Date']).toBeDefined();
      expect(opts['Invalid Date'].length).toBeGreaterThan(0);
    });

    it('invalid month 2025-13-01 returns error box', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-13-01', {
        dayofweek: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Invalid Date']).toMatch(/month/i);
    });

    it('invalid day 2025-02-30 returns error box', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-02-30', {
        dayofweek: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Invalid Date']).toMatch(/day/i);
    });

    it('2023-02-29 (non-leap) returns error box', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2023-02-29', {
        dayofweek: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Invalid Date']).toBeDefined();
    });
  });

  describe('output structure', () => {
    it('box has all required keys in options', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-12-25', {
        dayofweek: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(Object.keys(opts)).toEqual(
        expect.arrayContaining([
          'Date',
          'Weekday',
          'Day of Year',
          'ISO Week',
          'Leap Year',
        ]),
      );
    });

    it('plaintextOutput contains key: value pairs', async () => {
      const boxes = await DayOfWeekBoxSource.generateBoxes('2025-12-25', {
        dayofweek: true,
      });
      const plaintext = boxes[0].props.plaintextOutput;
      expect(plaintext).toContain('Weekday: Thursday');
      expect(plaintext).toContain('Date: 2025-12-25');
    });
  });
});
