import { describe, expect, it } from 'vitest';

import { ColorContrastBoxSource } from '../ColorContrastBoxSource';

describe('ColorContrastBoxSource.generateBoxes', () => {
  it('returns [] when ::contrast option is absent', async () => {
    const boxes = await ColorContrastBoxSource.generateBoxes(
      '#000000 #ffffff',
      null,
    );
    expect(boxes).toHaveLength(0);
  });

  it('returns [] when options object has no contrast key', async () => {
    const boxes = await ColorContrastBoxSource.generateBoxes(
      '#000000 #ffffff',
      { qr: true },
    );
    expect(boxes).toHaveLength(0);
  });

  describe('black vs white (#000000 #ffffff)', () => {
    it('produces exactly one box', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#000000 #ffffff',
        { contrast: true },
      );
      expect(boxes).toHaveLength(1);
    });

    it('ratio is 21:1 (exactly 21)', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#000000 #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Ratio).toBe('21:1');
    });

    it('AA Normal passes', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#000000 #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['AA Normal']).toBe('pass');
    });

    it('AAA Normal passes', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#000000 #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['AAA Normal']).toBe('pass');
    });

    it('all four WCAG levels pass', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#000000 #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['AA Normal']).toBe('pass');
      expect(opts['AA Large']).toBe('pass');
      expect(opts['AAA Normal']).toBe('pass');
      expect(opts['AAA Large']).toBe('pass');
    });
  });

  describe('#777777 vs #ffffff (ratio ~4.48)', () => {
    it('ratio is 4.48', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#777777 #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Ratio).toBe('4.48');
    });

    it('AA Normal fails (4.48 < 4.5)', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#777777 #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['AA Normal']).toBe('fail');
    });

    it('AA Large passes (4.48 >= 3)', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#777777 #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['AA Large']).toBe('pass');
    });

    it('AAA levels fail', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#777777 #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['AAA Normal']).toBe('fail');
      expect(opts['AAA Large']).toBe('fail');
    });
  });

  describe('#ffffff vs #ffffff (ratio 1)', () => {
    it('ratio is 1:1', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#ffffff #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Ratio).toBe('1:1');
    });

    it('all WCAG levels fail', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#ffffff #ffffff',
        { contrast: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['AA Normal']).toBe('fail');
      expect(opts['AA Large']).toBe('fail');
      expect(opts['AAA Normal']).toBe('fail');
      expect(opts['AAA Large']).toBe('fail');
    });
  });

  describe('newline-separated short hex (#000\\n#fff)', () => {
    it('parses short hex and produces correct ratio', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes('#000\n#fff', {
        contrast: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Ratio).toBe('21:1');
    });
  });

  describe('error cases', () => {
    it('one color only returns an explanatory box mentioning two colors', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes('#000000', {
        contrast: true,
      });
      expect(boxes).toHaveLength(1);
      // the box should mention two colors in either the output or options
      const box = boxes[0];
      const mentionsTwoColors =
        box.props.plaintextOutput.includes('two') ||
        JSON.stringify(box.props.options).includes('two');
      expect(mentionsTwoColors).toBe(true);
    });

    it('priority matches source priority (10)', async () => {
      const boxes = await ColorContrastBoxSource.generateBoxes(
        '#000000 #ffffff',
        { contrast: true },
      );
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
