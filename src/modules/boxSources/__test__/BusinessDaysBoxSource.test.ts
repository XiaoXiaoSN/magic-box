import { describe, expect, it } from 'vitest';

import { BusinessDaysBoxSource } from '../BusinessDaysBoxSource';

describe('BusinessDaysBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no matching option key is provided', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes(
        '2025-01-01 to 2025-01-31',
        null,
      );
      expect(boxes).toEqual([]);
    });

    it('returns [] when an unrelated option key is provided', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes(
        '2025-01-01 to 2025-01-31',
        { qrcode: true },
      );
      expect(boxes).toEqual([]);
    });

    describe('Jan 2025 (23 business days, 31 calendar days, 8 weekend days)', () => {
      // Jan 2025: weekends are 4,5,11,12,18,19,25,26 = 8 days; 31-8=23 business days
      it('triggers with ::busdays', async () => {
        const boxes = await BusinessDaysBoxSource.generateBoxes(
          '2025-01-01 to 2025-01-31',
          { busdays: true },
        );
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Business Days']).toBe('23');
        expect(opts['Calendar Days']).toBe('31');
        expect(opts['Weekend Days']).toBe('8');
        expect(opts.Start).toBe('2025-01-01');
        expect(opts.End).toBe('2025-01-31');
      });

      it('triggers with ::businessdays', async () => {
        const boxes = await BusinessDaysBoxSource.generateBoxes(
          '2025-01-01 to 2025-01-31',
          { businessdays: true },
        );
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Business Days']).toBe('23');
      });

      it('triggers with ::workdays', async () => {
        const boxes = await BusinessDaysBoxSource.generateBoxes(
          '2025-01-01 to 2025-01-31',
          { workdays: true },
        );
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Business Days']).toBe('23');
      });

      it('accepts comma-separated dates', async () => {
        const boxes = await BusinessDaysBoxSource.generateBoxes(
          '2025-01-01,2025-01-31',
          { busdays: true },
        );
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Business Days']).toBe('23');
      });
    });

    it('single weekday (2025-01-01 Wednesday) → Business Days 1, Calendar Days 1', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes(
        '2025-01-01 to 2025-01-01',
        { busdays: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Business Days']).toBe('1');
      expect(opts['Calendar Days']).toBe('1');
      expect(opts['Weekend Days']).toBe('0');
    });

    it('single weekend day (2025-01-04 Saturday) → Business Days 0', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes(
        '2025-01-04 to 2025-01-04',
        { busdays: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Business Days']).toBe('0');
      expect(opts['Calendar Days']).toBe('1');
      expect(opts['Weekend Days']).toBe('1');
    });

    it('full Mon-Sun week (2025-01-06 to 2025-01-12) → Business Days 5, Weekend Days 2', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes(
        '2025-01-06 to 2025-01-12',
        { busdays: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Business Days']).toBe('5');
      expect(opts['Weekend Days']).toBe('2');
      expect(opts['Calendar Days']).toBe('7');
    });

    it('swapped order (2025-01-31 to 2025-01-01) yields same result as forward', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes(
        '2025-01-31 to 2025-01-01',
        { busdays: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Business Days']).toBe('23');
      expect(opts['Calendar Days']).toBe('31');
      expect(opts.Start).toBe('2025-01-01');
      expect(opts.End).toBe('2025-01-31');
      expect(opts.Note).toContain('swapped');
    });

    it('invalid text input → returns an error box', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes('hello', {
        busdays: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('invalid date (2025-13-01 — month 13) → returns an error box', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes(
        '2025-13-01 to 2025-01-31',
        { busdays: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('invalid date (2025-02-30 — Feb 30 does not exist) → returns an error box', async () => {
      const boxes = await BusinessDaysBoxSource.generateBoxes(
        '2025-02-30 to 2025-03-01',
        { busdays: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('input exceeding length cap (>60 chars) → returns []', async () => {
      const longInput =
        '2025-01-01 to 2025-01-31 and some extra text to exceed 60 chars';
      const boxes = await BusinessDaysBoxSource.generateBoxes(longInput, {
        busdays: true,
      });
      expect(boxes).toEqual([]);
    });
  });
});
