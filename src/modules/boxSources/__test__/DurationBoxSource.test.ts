import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { DurationBoxSource } from '../DurationBoxSource';

describe('DurationBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::duration option is absent', async () => {
      const boxes = await DurationBoxSource.generateBoxes('3661', null);
      expect(boxes).toEqual([]);
    });

    it('returns [] for non-numeric input', async () => {
      const boxes = await DurationBoxSource.generateBoxes('abc', {
        duration: true,
      });
      expect(boxes).toEqual([]);
    });

    it('returns [] for negative input', async () => {
      const boxes = await DurationBoxSource.generateBoxes('-5', {
        duration: true,
      });
      expect(boxes).toEqual([]);
    });

    it('returns 0s for total of 0 seconds', async () => {
      const boxes = await DurationBoxSource.generateBoxes('0', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Human: '0s' });
    });

    it('humanizes 3661 seconds as 1h 1m 1s', async () => {
      const boxes = await DurationBoxSource.generateBoxes('3661', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1h 1m 1s');
      expect(opts.Days).toBe('0');
      expect(opts.Hours).toBe('1');
      expect(opts.Minutes).toBe('1');
      expect(opts.Seconds).toBe('1');
    });

    it('humanizes 90 seconds as 1m 30s', async () => {
      const boxes = await DurationBoxSource.generateBoxes('90', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);
      expect((boxes[0].props.options as Record<string, string>).Human).toBe(
        '1m 30s',
      );
    });

    it('humanizes 93784 seconds as 1d 2h 3m 4s', async () => {
      const boxes = await DurationBoxSource.generateBoxes('93784', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1d 2h 3m 4s');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await DurationBoxSource.generateBoxes('3661', {
        duration: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });
});
