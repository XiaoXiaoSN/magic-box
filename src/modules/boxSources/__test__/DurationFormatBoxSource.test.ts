import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { DurationFormatBoxSource } from '../DurationFormatBoxSource';

describe('DurationFormatBoxSource', () => {
  describe('no option key → empty array', () => {
    it('returns [] when options is null', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('3661', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options has no duration/humantime key', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('3661', {
        foo: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('seconds → human conversion', () => {
    it('3661 → Human "1h 1m 1s", Clock "01:01:01"', async () => {
      // verify: 1*3600 + 1*60 + 1 = 3661
      expect(1 * 3600 + 1 * 60 + 1).toBe(3661);

      const boxes = await DurationFormatBoxSource.generateBoxes('3661', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1h 1m 1s');
      expect(opts.Clock).toBe('01:01:01');
      expect(opts.Seconds).toBe('3661');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.priority).toBe(10);
    });

    it('90 → Human "1m 30s", Clock "00:01:30"', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('90', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1m 30s');
      expect(opts.Clock).toBe('00:01:30');
    });

    it('0 → Human "0s"', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('0', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('0s');
      expect(opts.Clock).toBe('00:00:00');
    });

    it('604800 (1 week) → Human contains "1w", Clock uses D:HH:MM:SS', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('604800', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toContain('1w');
      // 7 days → clock should use D:HH:MM:SS form
      expect(opts.Clock).toBe('7:00:00:00');
    });

    it('86461 (1d 1m 1s) → Human "1d 1m 1s"', async () => {
      // verify: 86400 + 60 + 1 = 86461
      expect(86400 + 60 + 1).toBe(86461);

      const boxes = await DurationFormatBoxSource.generateBoxes('86461', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1d 1m 1s');
      expect(opts.Clock).toBe('1:00:01:01');
    });

    it('also triggers on ::humantime option', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('3661', {
        humantime: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Human).toBe('1h 1m 1s');
    });
  });

  describe('human string → seconds conversion', () => {
    it('"1h30m" → Total Seconds "5400"', async () => {
      // verify: 1*3600 + 30*60 = 5400
      expect(1 * 3600 + 30 * 60).toBe(5400);

      const boxes = await DurationFormatBoxSource.generateBoxes('1h30m', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('5400');
    });

    it('"2d 4h" → Total Seconds "187200"', async () => {
      // verify: 2*86400 + 4*3600 = 172800 + 14400 = 187200
      expect(2 * 86400 + 4 * 3600).toBe(187200);

      const boxes = await DurationFormatBoxSource.generateBoxes('2d 4h', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('187200');
    });

    it('"90m" → Total Seconds "5400"', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('90m', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('5400');
    });

    it('"1h 1m 1s" → Total Seconds "3661"', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('1h 1m 1s', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('3661');
    });

    it('"1w" → Total Seconds "604800"', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('1w', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('604800');
    });
  });

  describe('invalid / unrecognized input', () => {
    it('"hello" → returns a box with a hint (not empty)', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('hello', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // should contain a hint key explaining the supported formats
      expect(opts.Hint).toBeTruthy();
      expect(opts.Input).toBe('hello');
    });

    it('input over 100 chars → []', async () => {
      const long = 'a'.repeat(101);
      const boxes = await DurationFormatBoxSource.generateBoxes(long, {
        duration: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('box metadata', () => {
    it('box name is "Duration" and uses KeyValueBoxTemplate', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('3661', {
        duration: true,
      });
      expect(boxes[0].props.name).toBe('Duration');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('plaintextOutput is non-empty k:v text', async () => {
      const boxes = await DurationFormatBoxSource.generateBoxes('3661', {
        duration: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('Human: 1h 1m 1s');
      expect(boxes[0].props.plaintextOutput).toContain('Clock: 01:01:01');
    });
  });
});
