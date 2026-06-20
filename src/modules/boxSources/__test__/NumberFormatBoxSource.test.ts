import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { NumberFormatBoxSource } from '../NumberFormatBoxSource';

describe('NumberFormatBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no trigger option is provided', async () => {
      const boxes = await NumberFormatBoxSource.generateBoxes('1234567.89');
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for non-numeric input', async () => {
      const boxes = await NumberFormatBoxSource.generateBoxes('abc', {
        numformat: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('formats 1234567.89 with ::numformat', async () => {
      const boxes = await NumberFormatBoxSource.generateBoxes('1234567.89', {
        numformat: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Number Format');
      expect(boxes[0].props.options).toMatchObject({
        Grouped: '1,234,567.89',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('formats 1000000 into compact 1M and grouped 1,000,000', async () => {
      const boxes = await NumberFormatBoxSource.generateBoxes('1000000', {
        numfmt: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Grouped: '1,000,000',
        Compact: '1M',
      });
    });

    it('formats negative number -5000', async () => {
      const boxes = await NumberFormatBoxSource.generateBoxes('-5000', {
        numformat: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Grouped: '-5,000',
      });
    });

    it('sets correct priority', async () => {
      const boxes = await NumberFormatBoxSource.generateBoxes('1234567', {
        numformat: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('includes Scientific and Plain keys', async () => {
      const boxes = await NumberFormatBoxSource.generateBoxes('1234567', {
        numformat: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Scientific).toBe('1.234567e+6');
      expect(opts.Plain).toBe('1234567');
    });
  });
});
