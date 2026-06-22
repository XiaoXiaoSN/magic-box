import { describe, expect, it } from 'vitest';

import { DataRateBoxSource } from '../DataRateBoxSource';

describe('DataRateBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no option key is present', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('100 Mbps', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array with unrelated options', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('100 Mbps', {
        unrelated: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should convert 100 Mbps correctly (bitrate → byte rates)', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('100 Mbps', {
        datarate: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.bps).toBe('100000000');
      expect(opts.Mbps).toBe('100');
      // 100 Mbit/s / 8 = 12.5 MB/s
      expect(opts['MB/s']).toBe('12.5');
      expect(opts.Kbps).toBe('100000');
      expect(opts.Gbps).toBe('0.1');
    });

    it('should convert 1 Gbps correctly', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('1 Gbps', {
        datarate: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mbps).toBe('1000');
      expect(opts['MB/s']).toBe('125');
    });

    it('should convert 8 bps to 1 B/s', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('8 bps', {
        datarate: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['B/s']).toBe('1');
    });

    it('should convert 1 MB/s (megabyte/s) to 8 Mbps', async () => {
      // 1 MB/s = 8 Mbit/s = 8 Mbps
      const boxes = await DataRateBoxSource.generateBoxes('1 MB/s', {
        datarate: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mbps).toBe('8');
    });

    it('should accept ::bandwidth option key', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('100 Mbps', {
        bandwidth: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('should return an error box for purely alphabetic input', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('abc', {
        datarate: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toContain('bps');
    });

    it('should return an error box for unknown unit', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('5 foo', {
        datarate: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toContain('mbps');
    });

    it('should produce a box named "Data Rate"', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('100 Mbps', {
        datarate: true,
      });
      expect(boxes[0].props.name).toBe('Data Rate');
    });

    it('should include the Input key showing original value and unit', async () => {
      const boxes = await DataRateBoxSource.generateBoxes('100 Mbps', {
        datarate: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('100 Mbps');
    });

    it('should handle unit matching case-insensitively (mbps vs Mbps vs MBPS)', async () => {
      const [boxLower] = await DataRateBoxSource.generateBoxes('100 mbps', {
        datarate: true,
      });
      const [boxUpper] = await DataRateBoxSource.generateBoxes('100 MBPS', {
        datarate: true,
      });
      const optsLower = boxLower.props.options as Record<string, string>;
      const optsUpper = boxUpper.props.options as Record<string, string>;
      expect(optsLower.bps).toBe(optsUpper.bps);
    });

    it('should return empty array when input exceeds 64 characters', async () => {
      const longInput = `${'1'.repeat(60)} Mbps`;
      const boxes = await DataRateBoxSource.generateBoxes(longInput, {
        datarate: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });
});
