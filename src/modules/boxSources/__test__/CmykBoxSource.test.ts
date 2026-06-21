import { describe, expect, it } from 'vitest';

import { CmykBoxSource } from '../CmykBoxSource';

describe('CmykBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no cmyk/hsv option is present', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff6347', null);
      expect(boxes).toEqual([]);
    });

    it('returns [] when unrelated option is present', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff6347', {
        color: true,
      });
      expect(boxes).toEqual([]);
    });

    it('tomato #ff6347 with ::cmyk → correct CMYK and RGB', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff6347', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // r=255, g=99, b=71; k=0; c=0; m=(255-99)/255≈61%; y=(255-71)/255≈72%
      expect(opts.CMYK).toBe('cmyk(0%, 61%, 72%, 0%)');
      expect(opts.RGB).toBe('rgb(255, 99, 71)');
    });

    it('tomato #ff6347 with ::hsv → correct HSV', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff6347', { hsv: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // hue ≈ 9°, saturation ≈ 72%, value = 100%
      expect(opts.HSV).toBe('hsv(9, 72%, 100%)');
    });

    it('black #000000 → cmyk(0%, 0%, 0%, 100%)', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#000000', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.CMYK).toBe('cmyk(0%, 0%, 0%, 100%)');
    });

    it('white #ffffff → cmyk(0%, 0%, 0%, 0%)', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ffffff', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.CMYK).toBe('cmyk(0%, 0%, 0%, 0%)');
    });

    it('rgb(255, 0, 0) → CMYK cmyk(0%, 100%, 100%, 0%) and HSV hsv(0, 100%, 100%)', async () => {
      const boxes = await CmykBoxSource.generateBoxes('rgb(255, 0, 0)', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.CMYK).toBe('cmyk(0%, 100%, 100%, 0%)');
      expect(opts.HSV).toBe('hsv(0, 100%, 100%)');
    });

    it('short hex #f00 expands to red → cmyk(0%, 100%, 100%, 0%)', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#f00', { cmyk: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.CMYK).toBe('cmyk(0%, 100%, 100%, 0%)');
      expect(opts.RGB).toBe('rgb(255, 0, 0)');
    });

    it('invalid input returns a box mentioning color required', async () => {
      const boxes = await CmykBoxSource.generateBoxes('xyz', { cmyk: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // error box should mention that a color is required
      expect(opts.error).toMatch(/color/i);
      expect(opts.error).toMatch(/required/i);
    });
  });
});
