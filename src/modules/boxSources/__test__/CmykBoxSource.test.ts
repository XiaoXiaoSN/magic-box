import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { CmykBoxSource } from '../CmykBoxSource';

describe('CmykBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when ::cmyk option is absent', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff0000', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object lacks cmyk key', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff0000', {
        color: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('hex → CMYK', () => {
    it('converts pure red #ff0000 to cmyk(0%,100%,100%,0%)', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff0000', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.CMYK).toBe('cmyk(0%, 100%, 100%, 0%)');
      expect(kv.Hex).toMatch(/^#FF0000$/i);
      expect(kv.RGB).toBe('rgb(255, 0, 0)');
    });

    it('converts tomato #ff6347 — C=0%, K=0%, M≈61-62%, Y≈71-72%', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff6347', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      // extract numeric values from cmyk(c%, m%, y%, k%)
      const match = kv.CMYK.match(
        /cmyk\((\d+)%,\s*(\d+)%,\s*(\d+)%,\s*(\d+)%\)/,
      );
      expect(match).not.toBeNull();
      const [c, m, y, k] = (match ?? []).slice(1).map(Number);
      expect(c).toBe(0);
      expect(k).toBe(0);
      // rgb(255,99,71): m=(1-99/255)/(1-0)≈0.612→61%, y=(1-71/255)≈0.722→72%
      expect(m).toBeGreaterThanOrEqual(61);
      expect(m).toBeLessThanOrEqual(62);
      expect(y).toBeGreaterThanOrEqual(71);
      expect(y).toBeLessThanOrEqual(72);
    });

    it('converts black #000000 to cmyk(0%,0%,0%,100%)', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#000000', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.CMYK).toBe('cmyk(0%, 0%, 0%, 100%)');
    });

    it('converts white #ffffff to cmyk(0%,0%,0%,0%)', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ffffff', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.CMYK).toBe('cmyk(0%, 0%, 0%, 0%)');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff0000', {
        cmyk: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority from source priority', async () => {
      const boxes = await CmykBoxSource.generateBoxes('#ff0000', {
        cmyk: true,
      });
      expect(boxes[0].props.priority).toBe(CmykBoxSource.priority);
    });

    it('handles shorthand #RGB notation', async () => {
      // #f00 expands to #ff0000
      const boxes = await CmykBoxSource.generateBoxes('#f00', { cmyk: true });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.CMYK).toBe('cmyk(0%, 100%, 100%, 0%)');
    });
  });

  describe('rgb() → CMYK', () => {
    it('converts rgb(255,0,0) to cmyk(0%,100%,100%,0%)', async () => {
      const boxes = await CmykBoxSource.generateBoxes('rgb(255,0,0)', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.CMYK).toBe('cmyk(0%, 100%, 100%, 0%)');
      expect(kv.Hex).toMatch(/^#FF0000$/i);
    });
  });

  describe('cmyk() → hex/RGB', () => {
    it('converts cmyk(0,100,100,0) to #FF0000', async () => {
      const boxes = await CmykBoxSource.generateBoxes('cmyk(0,100,100,0)', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Hex).toBe('#FF0000');
      expect(kv.RGB).toBe('rgb(255, 0, 0)');
    });

    it('converts cmyk(0,100,100,0) with % suffixes to #FF0000', async () => {
      const boxes = await CmykBoxSource.generateBoxes('cmyk(0%,100%,100%,0%)', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Hex).toBe('#FF0000');
    });

    it('converts cmyk(0,0,0,100) to #000000', async () => {
      const boxes = await CmykBoxSource.generateBoxes('cmyk(0,0,0,100)', {
        cmyk: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Hex).toBe('#000000');
    });
  });

  describe('invalid input', () => {
    it('returns a hint box for unrecognized input "hello"', async () => {
      const boxes = await CmykBoxSource.generateBoxes('hello', { cmyk: true });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      // hint box mentions expected formats
      const hint = Object.values(kv).join(' ');
      expect(hint.toLowerCase()).toMatch(/rgb|hex|cmyk/i);
    });

    it('returns [] for empty input', async () => {
      const boxes = await CmykBoxSource.generateBoxes('', { cmyk: true });
      expect(boxes).toHaveLength(0);
    });
  });
});
