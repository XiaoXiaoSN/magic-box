import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { DataSizeConvertBoxSource } from '../DataSizeConvertBoxSource';

describe('DataSizeConvertBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no option keys are present', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes(
        '1.5 GB',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are present', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1.5 GB', {
        something: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — 1.5 GB (SI)', () => {
    it('produces one box with KeyValueBoxTemplate and correct priority', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1.5 GB', {
        datasize: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.name).toBe('Data Size');
    });

    it('converts 1.5 GB → Bytes = 1500000000', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1.5 GB', {
        datasize: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Bytes: '1500000000' });
    });

    it('converts 1.5 GB → GB = 1.5', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1.5 GB', {
        datasize: true,
      });
      expect(boxes[0].props.options).toMatchObject({ GB: '1.5' });
    });

    it('converts 1.5 GB → GiB ≈ 1.39698 (1.5e9 / 1024^3)', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1.5 GB', {
        datasize: true,
      });
      const gib = Number.parseFloat(
        (boxes[0].props.options as Record<string, string>).GiB,
      );
      // 1.5e9 / 1024^3 = 1.396984...
      expect(gib).toBeCloseTo(1.396984, 4);
    });
  });

  describe('generateBoxes — 1024 MiB (IEC round trip)', () => {
    it('converts 1024 MiB → GiB = 1', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1024 MiB', {
        datasize: true,
      });
      expect(boxes[0].props.options).toMatchObject({ GiB: '1' });
    });

    it('converts 1024 MiB → Bytes = 1073741824', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1024 MiB', {
        datasize: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Bytes: '1073741824' });
    });
  });

  describe('generateBoxes — 1 GiB', () => {
    it('converts 1 GiB → Bytes = 1073741824', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1 GiB', {
        datasize: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Bytes: '1073741824' });
    });

    it('converts 1 GiB → MiB = 1024', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1 GiB', {
        datasize: true,
      });
      expect(boxes[0].props.options).toMatchObject({ MiB: '1024' });
    });
  });

  describe('generateBoxes — target unit via ::datasize=<unit>', () => {
    it('adds Result key when ::datasize=mib and value is 1 GB', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1 GB', {
        datasize: 'mib',
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Result).toBeDefined();
      // 1e9 / 1024^2 = 953.6743...
      expect(opts.Result).toContain('MIB');
      const numPart = Number.parseFloat(opts.Result);
      expect(numPart).toBeCloseTo(953.674, 2);
    });
  });

  describe('generateBoxes — bytesize option alias', () => {
    it('triggers on ::bytesize as well', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1 KB', {
        bytesize: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Bytes: '1000' });
    });
  });

  describe('generateBoxes — bare number (no unit → bytes)', () => {
    it('treats bare 2048 as 2048 bytes → KiB = 2, KB = 2.048', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('2048', {
        datasize: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Bytes).toBe('2048');
      expect(opts.KiB).toBe('2');
      expect(opts.KB).toBe('2.048');
    });
  });

  describe('generateBoxes — invalid unit', () => {
    it('returns a box with Error key for unknown unit "floppies"', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('5 floppies', {
        datasize: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
      expect(opts.Error).toContain('floppies');
      // should list some known units in the message
      expect(opts.Error).toContain('kb');
    });
  });

  describe('generateBoxes — case insensitivity', () => {
    it('parses "1.5 gb" (lowercase) correctly', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('1.5 gb', {
        datasize: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Bytes: '1500000000' });
    });

    it('parses "512 MIB" (uppercase) correctly', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes('512 MIB', {
        datasize: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // 512 * 1024^2 = 536870912
      expect(opts.Bytes).toBe('536870912');
    });
  });

  describe('generateBoxes — whitespace tolerance', () => {
    it('handles extra whitespace around "  1.5   GB  "', async () => {
      const boxes = await DataSizeConvertBoxSource.generateBoxes(
        '  1.5   GB  ',
        {
          datasize: true,
        },
      );
      expect(boxes[0].props.options).toMatchObject({ Bytes: '1500000000' });
    });
  });
});
