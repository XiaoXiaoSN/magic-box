import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { ColorMixBoxSource } from '../ColorMixBoxSource';

describe('ColorMixBoxSource', () => {
  describe('no matching option → empty array', () => {
    it('returns [] when no colormix/mixcolor/blend option is present', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes(
        '#ff0000 #0000ff',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object has no relevant key', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
        unrelated: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('valid hex colors — 50% blend', () => {
    it('red + blue at 50% → #800080 (purple)', async () => {
      // r=round(255*0.5)=128=0x80, g=0, b=round(255*0.5)=128=0x80
      const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
        colormix: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.name).toBe('Color Mix');
      expect(boxes[0].props.priority).toBe(10);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#800080');
      expect(opts['Color 1']).toBe('#ff0000');
      expect(opts['Color 2']).toBe('#0000ff');
      expect(opts.Ratio).toBe('50% / 50%');
    });

    it('black + white at 50% → #808080 (mid-gray)', async () => {
      // r=g=b=round(255*0.5)=128=0x80
      const boxes = await ColorMixBoxSource.generateBoxes('#000000 #ffffff', {
        colormix: '50',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#808080');
    });
  });

  describe('ratio edge cases', () => {
    it('colormix=0 → 100% first color (#ff0000)', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
        colormix: '0',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#ff0000');
      expect(opts.Ratio).toBe('100% / 0%');
    });

    it('colormix=100 → 100% second color (#0000ff)', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
        colormix: '100',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#0000ff');
      expect(opts.Ratio).toBe('0% / 100%');
    });

    it('colormix=25 on white+black → #bfbfbf', async () => {
      // r=g=b=round(255*0.75)=191=0xbf
      const boxes = await ColorMixBoxSource.generateBoxes('#ffffff #000000', {
        colormix: '25',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#bfbfbf');
    });
  });

  describe('option key aliases', () => {
    it('mixcolor key triggers the box', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
        mixcolor: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#800080');
    });

    it('blend key triggers the box', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
        blend: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#800080');
    });
  });

  describe('rgb() input format', () => {
    it('rgb(255,0,0) rgb(0,0,255) at 50% → #800080', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes(
        'rgb(255,0,0) rgb(0,0,255)',
        { colormix: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#800080');
    });
  });

  describe('short hex (#RGB) input', () => {
    it('#f00 #00f at 50% → #800080', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('#f00 #00f', {
        colormix: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Mixed).toBe('#800080');
    });
  });

  describe('invalid / insufficient colors → explanatory box', () => {
    it('single valid color → error box explaining format', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('#ff0000', {
        colormix: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('"hello" (no valid color) → error box', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('hello', {
        colormix: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });
  });

  describe('plaintext output', () => {
    it('plaintextOutput contains Mixed key', async () => {
      const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
        colormix: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('Mixed');
      expect(boxes[0].props.plaintextOutput).toContain('#800080');
    });
  });
});
