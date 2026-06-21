import { describe, expect, it } from 'vitest';

import { CronNextBoxSource } from '../CronNextBoxSource';

describe('CronNextBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::cronnext option is absent', async () => {
      const boxes = await CronNextBoxSource.generateBoxes('*/15 * * * *', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options is an empty object without cronnext', async () => {
      const boxes = await CronNextBoxSource.generateBoxes('*/15 * * * *', {});
      expect(boxes).toHaveLength(0);
    });

    it('computes next 3 runs of */15 * * * * from 2024-01-01T00:00:00Z', async () => {
      const boxes = await CronNextBoxSource.generateBoxes('*/15 * * * *', {
        cronnext: true,
        from: '2024-01-01T00:00:00Z',
        count: '3',
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines).toEqual([
        '2024-01-01T00:15:00.000Z',
        '2024-01-01T00:30:00.000Z',
        '2024-01-01T00:45:00.000Z',
      ]);
    });

    it('computes daily midnight runs (0 0 * * *) from 2024-01-01T12:00:00Z count 2', async () => {
      const boxes = await CronNextBoxSource.generateBoxes('0 0 * * *', {
        cronnext: true,
        from: '2024-01-01T12:00:00Z',
        count: '2',
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines).toEqual([
        '2024-01-02T00:00:00.000Z',
        '2024-01-03T00:00:00.000Z',
      ]);
    });

    it('computes 9am Mondays (0 9 * * 1) from 2024-01-01T00:00:00Z — 2024-01-01 is Monday', async () => {
      // 2024-01-01 is indeed a Monday (day=1)
      const boxes = await CronNextBoxSource.generateBoxes('0 9 * * 1', {
        cronnext: true,
        from: '2024-01-01T00:00:00Z',
        count: '1',
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines).toEqual(['2024-01-01T09:00:00.000Z']);
    });

    it('returns an invalid-expression box for non-cron input', async () => {
      const boxes = await CronNextBoxSource.generateBoxes('not a cron', {
        cronnext: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain('invalid');
    });

    it('defaults count to 5 when ::count is absent', async () => {
      const boxes = await CronNextBoxSource.generateBoxes('* * * * *', {
        cronnext: true,
        from: '2024-01-01T00:00:00Z',
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines).toHaveLength(5);
    });

    it('clamps count to 20 when ::count exceeds maximum', async () => {
      const boxes = await CronNextBoxSource.generateBoxes('* * * * *', {
        cronnext: true,
        from: '2024-01-01T00:00:00Z',
        count: '100',
      });
      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines).toHaveLength(20);
    });

    it('accepts 7 as Sunday alias in dow field', async () => {
      // 2024-01-07 is a Sunday
      const boxes = await CronNextBoxSource.generateBoxes('0 12 * * 7', {
        cronnext: true,
        from: '2024-01-06T00:00:00Z',
        count: '1',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('2024-01-07T12:00:00.000Z');
    });

    it('handles a dow range that wraps through 7 (5-7 = Fri/Sat/Sun)', async () => {
      // 2024-01-05 is a Friday; 5-7 covers Fri(5), Sat(6), Sun(0)
      const boxes = await CronNextBoxSource.generateBoxes('0 0 * * 5-7', {
        cronnext: true,
        from: '2024-01-04T12:00:00Z',
        count: '3',
      });
      expect(boxes[0].props.plaintextOutput).toBe(
        [
          '2024-01-05T00:00:00.000Z', // Friday
          '2024-01-06T00:00:00.000Z', // Saturday
          '2024-01-07T00:00:00.000Z', // Sunday
        ].join('\n'),
      );
    });

    it('bails cleanly on an impossible expression (Feb 30)', async () => {
      const boxes = await CronNextBoxSource.generateBoxes('0 0 30 2 *', {
        cronnext: true,
        from: '2024-01-01T00:00:00Z',
      });
      // no matches within the search window — surfaces a box, does not hang
      expect(boxes).toHaveLength(1);
    });
  });
});
