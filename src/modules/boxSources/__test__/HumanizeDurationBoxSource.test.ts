import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { HumanizeDurationBoxSource } from '../HumanizeDurationBoxSource';

describe('HumanizeDurationBoxSource', () => {
  describe('gate conditions', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes(
        '90061',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options has neither humanize nor duration key', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('90061', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for non-numeric input', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('abc', {
        humanize: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('', {
        humanize: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for input exceeding 50 characters', async () => {
      const long = '1'.repeat(51);
      const boxes = await HumanizeDurationBoxSource.generateBoxes(long, {
        humanize: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for negative-looking input (sign not in pattern)', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('-1', {
        humanize: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('seconds mode (default)', () => {
    it('90061s → Compact "1d 1h 1m 1s"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('90061', {
        humanize: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Compact).toBe('1d 1h 1m 1s');
    });

    it('90061s → Total Seconds "90061"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('90061', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('90061');
    });

    it('60s → Compact "1m"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('60', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Compact).toBe('1m');
    });

    it('3661s → Compact "1h 1m 1s"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('3661', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Compact).toBe('1h 1m 1s');
    });

    it('0s → Compact "0s"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('0', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Compact).toBe('0s');
    });

    it('3600s → Compact "1h"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('3600', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Compact).toBe('1h');
    });
  });

  describe('milliseconds mode (::humanize=ms)', () => {
    it('90000ms → 90s → Compact "1m 30s"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('90000', {
        humanize: 'ms',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Compact).toBe('1m 30s');
    });

    it('90000ms → Total Seconds "90"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('90000', {
        humanize: 'ms',
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Seconds']).toBe('90');
    });
  });

  describe('::duration option key also triggers', () => {
    it('60s with ::duration → Compact "1m"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('60', {
        duration: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Compact).toBe('1m');
    });
  });

  describe('Long form pluralization', () => {
    it('3661s → Long "1 hour, 1 minute, 1 second"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('3661', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Long).toBe('1 hour, 1 minute, 1 second');
    });

    it('7200s → Long "2 hours"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('7200', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Long).toBe('2 hours');
    });

    it('90061s → Long "1 day, 1 hour, 1 minute, 1 second"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('90061', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Long).toBe('1 day, 1 hour, 1 minute, 1 second');
    });

    it('0s → Long "0 seconds"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('0', {
        humanize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Long).toBe('0 seconds');
    });
  });

  describe('box properties', () => {
    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('60', {
        humanize: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets name to "Humanize Duration"', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('60', {
        humanize: true,
      });
      expect(boxes[0].props.name).toBe('Humanize Duration');
    });

    it('sets priority from source priority', async () => {
      const boxes = await HumanizeDurationBoxSource.generateBoxes('60', {
        humanize: true,
      });
      expect(boxes[0].props.priority).toBe(HumanizeDurationBoxSource.priority);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HumanizeDurationBoxSource.name).toBe('Humanize Duration');
      expect(HumanizeDurationBoxSource.kind).toBe('Convert');
      expect(typeof HumanizeDurationBoxSource.priority).toBe('number');
    });
  });
});
