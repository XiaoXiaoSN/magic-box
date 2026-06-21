import { describe, expect, it } from 'vitest';

import { ColorMixBoxSource } from '../ColorMixBoxSource';

describe('ColorMixBoxSource.generateBoxes', () => {
  it('returns [] when no mix/blend option is present', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes(
      '#ff0000 #0000ff',
      null,
    );
    expect(boxes).toHaveLength(0);
  });

  it('returns [] when options exist but no mix/blend key', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      other: true,
    });
    expect(boxes).toHaveLength(0);
  });

  it('blends #ff0000 and #0000ff at 50% → #800080', async () => {
    // 255 * 0.5 = 127.5 → round → 128 = 0x80; 0 * 0.5 + 0 * 0.5 = 0; 0 + 128 = 128 = 0x80
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      mix: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Result).toBe('#800080');
    expect(opts['Color 1']).toBe('#ff0000');
    expect(opts['Color 2']).toBe('#0000ff');
    expect(opts.Ratio).toBe('50% toward #0000ff');
  });

  it('ratio=0 → result equals first color', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      mix: '0',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Result).toBe('#ff0000');
  });

  it('ratio=100 → result equals second color', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      mix: '100',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Result).toBe('#0000ff');
  });

  it('short hex #f00 and #00f at 50% → #800080', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#f00 #00f', {
      mix: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Result).toBe('#800080');
  });

  it('responds to ::blend option as well', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      blend: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Result).toBe('#800080');
  });

  it('returns an error box when only one color is provided', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#f00', { mix: true });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Error).toMatch(/two hex colors/i);
  });

  it('returns an error box for an invalid hex color', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#gg0000 #0000ff', {
      mix: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Error).toMatch(/invalid hex color/i);
  });

  it('clamps ratio below 0 to 0', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      mix: '-10',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Result).toBe('#ff0000');
  });

  it('clamps ratio above 100 to 100', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      mix: '150',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Result).toBe('#0000ff');
  });

  it('box name is Color Mix', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      mix: true,
    });
    expect(boxes[0].props.name).toBe('Color Mix');
  });

  it('box priority matches ColorMixBoxSource.priority', async () => {
    const boxes = await ColorMixBoxSource.generateBoxes('#ff0000 #0000ff', {
      mix: true,
    });
    expect(boxes[0].props.priority).toBe(ColorMixBoxSource.priority);
  });
});
