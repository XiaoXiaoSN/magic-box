import { describe, expect, it } from 'vitest';
import { CssColorNameBoxSource } from '../CssColorNameBoxSource';

describe('CssColorNameBoxSource', () => {
  it('returns [] when no option keys are present', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('tomato', null);
    expect(boxes).toEqual([]);
  });

  it('returns [] when unrelated options are present', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('tomato', {
      base64: true,
    });
    expect(boxes).toEqual([]);
  });

  it('name→hex: tomato resolves to #ff6347', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('tomato', {
      colorname: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({ Hex: '#ff6347' });
  });

  it('name→hex: case-insensitive — RebeccaPurple resolves to #663399', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('RebeccaPurple', {
      colorname: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({ Hex: '#663399' });
  });

  it('name→hex: includes Name and RGB keys', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('tomato', {
      colorname: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Name).toBe('tomato');
    expect(opts.RGB).toBe('rgb(255, 99, 71)');
  });

  it('hex→name: #ff6347 exact match — Nearest Name is tomato, Exact is true', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('#ff6347', {
      colorname: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Nearest Name']).toBe('tomato');
    expect(opts.Exact).toBe('true');
  });

  it('hex→name: #ff6348 near match — Nearest Name is tomato, Exact is false', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('#ff6348', {
      colorname: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Nearest Name']).toBe('tomato');
    expect(opts.Exact).toBe('false');
  });

  it('hex→name: includes Hex and Name Hex keys', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('#ff6347', {
      colorname: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Hex).toBe('#ff6347');
    expect(opts['Name Hex']).toBe('#ff6347');
  });

  it('unknown name returns a box mentioning not a CSS color', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('notacolor', {
      colorname: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Error).toMatch(/not a CSS (named )?color/i);
  });

  it('accepts ::csscolor option key', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('tomato', {
      csscolor: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({ Hex: '#ff6347' });
  });

  it('handles 3-digit shorthand hex like #f63', async () => {
    // #f63 expands to #ff6633 — nearest to tomato (#ff6347) or coral (#ff7f50)
    const boxes = await CssColorNameBoxSource.generateBoxes('#f63', {
      colorname: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Hex).toBe('#ff6633');
    expect(opts['Nearest Name']).toBeTruthy();
  });

  it('invalid hex returns []', async () => {
    const boxes = await CssColorNameBoxSource.generateBoxes('#zzzzzz', {
      colorname: true,
    });
    expect(boxes).toEqual([]);
  });
});
