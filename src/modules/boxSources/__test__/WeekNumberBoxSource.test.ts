import { describe, expect, it } from 'vitest';
import { WeekNumberBoxSource } from '../WeekNumberBoxSource';

describe('WeekNumberBoxSource', () => {
  it('returns [] when no matching option is present', async () => {
    const boxes = await WeekNumberBoxSource.generateBoxes('2024-01-01', null);
    expect(boxes).toEqual([]);
  });

  it('returns [] for unrelated options', async () => {
    const boxes = await WeekNumberBoxSource.generateBoxes('2024-01-01', {
      base64: true,
    });
    expect(boxes).toEqual([]);
  });

  it('triggers on ::weeknum option', async () => {
    const boxes = await WeekNumberBoxSource.generateBoxes('2024-01-01', {
      weeknum: true,
    });
    expect(boxes).toHaveLength(1);
  });

  it('triggers on ::isoweek option', async () => {
    const boxes = await WeekNumberBoxSource.generateBoxes('2024-01-01', {
      isoweek: true,
    });
    expect(boxes).toHaveLength(1);
  });

  describe('2024-01-01 (Monday, ISO week 1 of 2024)', () => {
    it('returns correct ISO week data', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('2024-01-01', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Date).toBe('2024-01-01');
      expect(opts['ISO Week']).toBe('2024-W01');
      expect(opts.Week).toBe('1');
      expect(opts['ISO Year']).toBe('2024');
      expect(opts.Weekday).toBe('Monday');
      expect(opts['Day of Year']).toBe('1');
    });
  });

  describe('2021-01-01 (Friday) → ISO 2020-W53 (boundary: year starts mid-week)', () => {
    it('belongs to ISO week 53 of 2020', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('2021-01-01', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Week).toBe('53');
      expect(opts['ISO Year']).toBe('2020');
      expect(opts['ISO Week']).toBe('2020-W53');
      expect(opts.Weekday).toBe('Friday');
    });
  });

  describe('2020-12-31 → also ISO 2020-W53', () => {
    it('belongs to ISO week 53 of 2020', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('2020-12-31', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Week).toBe('53');
      expect(opts['ISO Year']).toBe('2020');
      expect(opts['ISO Week']).toBe('2020-W53');
    });
  });

  describe('2016-01-01 (Friday) → ISO 2015-W53', () => {
    it('belongs to ISO week 53 of 2015', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('2016-01-01', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Week).toBe('53');
      expect(opts['ISO Year']).toBe('2015');
      expect(opts['ISO Week']).toBe('2015-W53');
    });
  });

  describe('2024-12-31 (Tuesday) → ISO 2025-W01 (boundary: week straddles new year)', () => {
    it('belongs to ISO week 1 of 2025', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('2024-12-31', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Week).toBe('1');
      expect(opts['ISO Year']).toBe('2025');
      expect(opts['ISO Week']).toBe('2025-W01');
      expect(opts.Weekday).toBe('Tuesday');
    });
  });

  describe('invalid date input', () => {
    it('returns a box explaining the date is invalid', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('notadate', {
        weeknum: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/invalid date/i);
    });
  });

  describe('flexible date formats', () => {
    it('accepts MM/DD format', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('01/01', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Date).toMatch(/-\d{2}-\d{2}$/);
      expect(opts['ISO Week']).toBeDefined();
    });

    it('accepts YYYY/MM/DD format', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('2024/01/01', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Date).toBe('2024-01-01');
      expect(opts['ISO Week']).toBe('2024-W01');
    });

    it('accepts Month Name day format', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('June 25, 2026', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Date).toBe('2026-06-25');
    });

    it('accepts UNIX timestamp', async () => {
      // 1735794245 is Jan 2, 2025 (Thursday, ISO week 1 of 2025)
      const boxes = await WeekNumberBoxSource.generateBoxes('1735794245', {
        weeknum: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Date).toBe('2025-01-02');
      expect(opts.Weekday).toBe('Thursday');
      expect(opts['ISO Week']).toBe('2025-W01');
    });

    it('accepts datetime string YYYY-MM-DDTHH:mm:ssZ', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes(
        '2026-06-25T13:05:40+08:00',
        {
          weeknum: true,
        },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Date).toBe('2026-06-25');
    });
  });

  describe('empty input → today', () => {
    it('returns a box without error', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('', {
        weeknum: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeUndefined();
      expect(opts['ISO Week']).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  describe('"today" keyword', () => {
    it('returns a box without error', async () => {
      const boxes = await WeekNumberBoxSource.generateBoxes('today', {
        weeknum: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeUndefined();
    });
  });
});
