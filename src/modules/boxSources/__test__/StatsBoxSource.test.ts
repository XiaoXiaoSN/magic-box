import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { StatsBoxSource } from '../StatsBoxSource';

describe('StatsBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option key is provided', async () => {
      const boxes = await StatsBoxSource.generateBoxes(
        '2, 4, 4, 4, 5, 5, 7, 9',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option key is provided', async () => {
      const boxes = await StatsBoxSource.generateBoxes('1, 2, 3', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('computes classic Wikipedia example: 2 4 4 4 5 5 7 9', async () => {
      // population stddev = 2, variance = 4, mean = 5, median = 4.5, mode = 4
      const boxes = await StatsBoxSource.generateBoxes(
        '2, 4, 4, 4, 5, 5, 7, 9',
        {
          stats: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Statistics');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Count).toBe('8');
      expect(opts.Sum).toBe('40');
      expect(opts.Mean).toBe('5');
      expect(opts.Median).toBe('4.5');
      expect(opts.Mode).toBe('4');
      expect(opts.Min).toBe('2');
      expect(opts.Max).toBe('9');
      expect(opts.Range).toBe('7');
      expect(opts.Variance).toBe('4');
      expect(opts['Std Dev (pop)']).toBe('2');
    });

    it('accepts ::statistics alias', async () => {
      const boxes = await StatsBoxSource.generateBoxes('1, 2, 3', {
        statistics: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('handles single-value input', async () => {
      const boxes = await StatsBoxSource.generateBoxes('5', { stats: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Count).toBe('1');
      expect(opts.Mean).toBe('5');
      expect(opts['Std Dev (pop)']).toBe('0');
      expect(opts['Std Dev (sample)']).toBe('n/a');
      expect(opts.Variance).toBe('0');
    });

    it('computes correct median for even-length list: 1 2 3 4', async () => {
      const boxes = await StatsBoxSource.generateBoxes('1, 2, 3, 4', {
        stats: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Median).toBe('2.5');
    });

    it('reports all modes for multimodal input: 1 1 2 2', async () => {
      const boxes = await StatsBoxSource.generateBoxes('1, 1, 2, 2', {
        stats: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // mode string should contain both 1 and 2
      expect(opts.Mode).toContain('1');
      expect(opts.Mode).toContain('2');
    });

    it('returns "none" when all values are unique: 1 2 3', async () => {
      const boxes = await StatsBoxSource.generateBoxes('1, 2, 3', {
        stats: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mode).toBe('none');
    });

    it('handles decimal inputs: 1.5 2.5 → mean 2', async () => {
      const boxes = await StatsBoxSource.generateBoxes('1.5, 2.5', {
        stats: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mean).toBe('2');
    });

    it('returns error box for non-numeric input: a, b', async () => {
      const boxes = await StatsBoxSource.generateBoxes('a, b', { stats: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Note).toMatch(/numbers/i);
    });

    it('handles space-separated input without commas', async () => {
      const boxes = await StatsBoxSource.generateBoxes('3 6 9', {
        stats: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Count).toBe('3');
      expect(opts.Mean).toBe('6');
    });

    it('plaintextOutput is non-empty and contains key: value lines', async () => {
      const boxes = await StatsBoxSource.generateBoxes(
        '2, 4, 4, 4, 5, 5, 7, 9',
        {
          stats: true,
        },
      );
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Mean: 5');
      expect(text).toContain('Std Dev (pop): 2');
    });
  });
});
