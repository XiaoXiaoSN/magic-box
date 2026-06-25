import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { DurationBoxSource } from '../DurationBoxSource';

describe('DurationBoxSource', () => {
  describe('gate conditions', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await DurationBoxSource.generateBoxes('3661', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options has no duration-related key', async () => {
      const boxes = await DurationBoxSource.generateBoxes('3661', {
        foo: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await DurationBoxSource.generateBoxes('', {
        duration: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for input exceeding 100 characters', async () => {
      const long = '1'.repeat(101);
      const boxes = await DurationBoxSource.generateBoxes(long, {
        duration: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('seconds → human conversion (numeric input)', () => {
    it('3661 → Human "1h 1m 1s", Clock "01:01:01", Seconds "3661"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('3661', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1h 1m 1s');
      expect(opts.Compact).toBe('1h 1m 1s');
      expect(opts.Clock).toBe('01:01:01');
      expect(opts.Seconds).toBe('3661');
      expect(opts['Total Seconds']).toBe('3661');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.priority).toBe(10);
    });

    it('90 → Human "1m 30s", Clock "00:01:30"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('90', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1m 30s');
      expect(opts.Clock).toBe('00:01:30');
    });

    it('0 → Human "0s", Clock "00:00:00"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('0', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('0s');
      expect(opts.Clock).toBe('00:00:00');
    });

    it('604800 (1 week) → Human contains "1w", Clock uses D:HH:MM:SS', async () => {
      const boxes = await DurationBoxSource.generateBoxes('604800', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toContain('1w');
      expect(opts.Clock).toBe('7:00:00:00');
    });

    it('86461 (1d 1m 1s) → Human "1d 1m 1s"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('86461', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1d 1m 1s');
      expect(opts.Clock).toBe('1:00:01:01');
    });

    it('also triggers on ::humantime, ::humanize options', async () => {
      const boxes = await DurationBoxSource.generateBoxes('3661', {
        humantime: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1h 1m 1s');

      const boxes2 = await DurationBoxSource.generateBoxes('3661', {
        humanize: true,
      });
      expect(boxes2).toHaveLength(1);
      const opts2 = boxes2[0].props.options as Record<string, string>;
      expect(opts2.Compact).toBe('1h 1m 1s');
      expect(opts2.Long).toBe('1 hour, 1 minute, 1 second');
    });
  });

  describe('milliseconds mode (::humanize=ms or ::duration=ms)', () => {
    it('90000ms → 90s → Compact "1m 30s"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('90000', {
        humanize: 'ms',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Compact).toBe('1m 30s');
      expect(opts['Total Seconds']).toBe('90');
    });

    it('90000ms with ::duration=ms → Total Seconds "90"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('90000', {
        duration: 'ms',
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('90');
    });
  });

  describe('human string → seconds conversion', () => {
    it('"1h30m" → Total Seconds "5400"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('1h30m', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('5400');
    });

    it('"2d 4h" → Total Seconds "187200"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('2d 4h', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('187200');
    });

    it('"1h 1m 1s" → Total Seconds "3661"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('1h 1m 1s', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('3661');
    });

    it('"1w" → Total Seconds "604800"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('1w', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('604800');
    });

    it('handles various unit spellings (10s 8789sec 22sec 1m48s 1h3s)', async () => {
      const testCases = [
        { input: '10s', expectedSec: '10' },
        { input: '8789sec', expectedSec: '8789' },
        { input: '22sec', expectedSec: '22' },
        { input: '1m48s', expectedSec: '108' }, // 60 + 48
        { input: '1h3s', expectedSec: '3603' },  // 3600 + 3
      ];

      for (const tc of testCases) {
        const boxes = await DurationBoxSource.generateBoxes(tc.input, {
          duration: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts['Total Seconds']).toBe(tc.expectedSec);
      }
    });

    it('parses duration with milliseconds (500ms)', async () => {
      const boxes = await DurationBoxSource.generateBoxes('500ms', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('0.5');
      expect(opts['Total Milliseconds']).toBe('500');
      expect(opts.Compact).toBe('500ms');
    });

    it('triggers on ::parseduration, ::duration2s', async () => {
      const boxes = await DurationBoxSource.generateBoxes('1h30m20s', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('5420');

      const boxes2 = await DurationBoxSource.generateBoxes('1h30m20s', {
        duration2s: true,
      });
      expect(boxes2).toHaveLength(1);
      const opts2 = boxes2[0].props.options as Record<string, string>;
      expect(opts2['Total Seconds']).toBe('5420');
    });
  });

  describe('invalid / unrecognized input', () => {
    it('"hello" with ::duration → returns a box with a hint', async () => {
      const boxes = await DurationBoxSource.generateBoxes('hello', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Hint).toBeTruthy();
      expect(opts.Input).toBe('hello');
    });

    it('"abc" with ::parseduration → returns []', async () => {
      const boxes = await DurationBoxSource.generateBoxes('abc', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('"1x" with ::parseduration → returns []', async () => {
      const boxes = await DurationBoxSource.generateBoxes('1x', {
        parseduration: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('Long form pluralization', () => {
    it('3661s → Long "1 hour, 1 minute, 1 second"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('3661', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Long).toBe('1 hour, 1 minute, 1 second');
    });

    it('7200s → Long "2 hours"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('7200', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Long).toBe('2 hours');
    });

    it('0s → Long "0 seconds"', async () => {
      const boxes = await DurationBoxSource.generateBoxes('0', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Long).toBe('0 seconds');
    });
  });

  describe('metadata and properties', () => {
    it('has expected name and kind', () => {
      expect(DurationBoxSource.name).toBe('Duration');
      expect(DurationBoxSource.kind).toBe('Convert');
      expect(DurationBoxSource.priority).toBe(10);
    });
  });
});
