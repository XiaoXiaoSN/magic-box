import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { OnColorBoxSource } from '../OnColorBoxSource';

describe('OnColorBoxSource', () => {
  describe('guard conditions', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when an unrelated option is set', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        other: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('white background (#ffffff)', () => {
    it('produces one box', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('foreground is black (#000000) because black has higher contrast on white', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Foreground).toBe('#000000');
    });

    it('contrast is 21:1 (maximum possible)', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Contrast).toBe('21:1');
    });

    it('WCAG AA and AAA both pass', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['WCAG AA']).toBe('pass');
      expect(opts['WCAG AAA']).toBe('pass');
    });

    it('background is normalized to #ffffff', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Background).toBe('#ffffff');
    });
  });

  describe('black background (#000000)', () => {
    it('foreground is white (#ffffff)', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#000000', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Foreground).toBe('#ffffff');
    });

    it('contrast is 21:1', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#000000', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Contrast).toBe('21:1');
    });
  });

  describe('mid blue (#3498db)', () => {
    // luminance ~0.283; vs black ~6.66, vs white ~3.15 → black wins
    it('foreground is #000000 (black has higher contrast)', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#3498db', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Foreground).toBe('#000000');
    });

    it('contrast matches the higher ratio (black wins at ~6.66:1)', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#3498db', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Contrast).toBe('6.66:1');
    });

    it('WCAG AA passes (>= 4.5), WCAG AAA fails (< 7)', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#3498db', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['WCAG AA']).toBe('pass');
      expect(opts['WCAG AAA']).toBe('fail');
    });
  });

  describe('mid grey (#777777)', () => {
    // luminance ~0.184; vs black ~4.69, vs white ~4.48 → black wins narrowly
    it('produces a valid foreground (black or white)', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#777777', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(['#000000', '#ffffff']).toContain(opts.Foreground);
    });

    it('contrast equals the higher of the two ratios', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#777777', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // expected: black wins at ~4.69:1
      expect(opts.Contrast).toBe('4.69:1');
    });
  });

  describe('invalid color input', () => {
    it('xyz triggers an error box (not empty array)', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('xyz', {
        oncolor: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('error box mentions that a hex color is required', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('xyz', {
        oncolor: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text.toLowerCase()).toMatch(/hex color/);
    });

    it('bare color name without hash returns an error box', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('red', {
        oncolor: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('shorthand hex (#fff)', () => {
    it('expands #fff to #ffffff and picks black foreground', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#fff', {
        oncolor: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Background).toBe('#ffffff');
      expect(opts.Foreground).toBe('#000000');
      expect(opts.Contrast).toBe('21:1');
    });
  });

  describe('::textcolor alias', () => {
    it('triggers with ::textcolor option', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        textcolor: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Foreground).toBe('#000000');
    });
  });

  describe('box shape', () => {
    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box name is "Readable Text Color"', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      expect(boxes[0].props.name).toBe('Readable Text Color');
    });

    it('plaintext output contains k:v lines', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Background: #ffffff');
      expect(text).toContain('Foreground: #000000');
      expect(text).toContain('Contrast: 21:1');
    });

    it('priority matches source priority', async () => {
      const boxes = await OnColorBoxSource.generateBoxes('#ffffff', {
        oncolor: true,
      });
      expect(boxes[0].props.priority).toBe(OnColorBoxSource.priority);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(OnColorBoxSource.name).toBe('Readable Text Color');
      expect(OnColorBoxSource.tag).toBe('#');
      expect(OnColorBoxSource.kind).toBe('Analyze');
      expect(typeof OnColorBoxSource.priority).toBe('number');
    });
  });
});
