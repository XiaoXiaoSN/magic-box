import { describe, expect, it } from 'vitest';

import { HsvBoxSource, hsvToRgb, rgbToHex, rgbToHsv } from '../HsvBoxSource';

// ─── conversion helper unit tests ────────────────────────────────────────────

describe('rgbToHsv', () => {
  it('converts red rgb(255,0,0) to hsv(0, 100%, 100%)', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 100, v: 100 });
  });

  it('converts green rgb(0,255,0) to hsv(120, 100%, 100%)', () => {
    expect(rgbToHsv(0, 255, 0)).toEqual({ h: 120, s: 100, v: 100 });
  });

  it('converts blue rgb(0,0,255) to hsv(240, 100%, 100%)', () => {
    expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 100, v: 100 });
  });

  it('converts white rgb(255,255,255) to hsv(0, 0%, 100%)', () => {
    expect(rgbToHsv(255, 255, 255)).toEqual({ h: 0, s: 0, v: 100 });
  });

  it('converts black rgb(0,0,0) to hsv(0, 0%, 0%)', () => {
    expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('converts tomato rgb(255,99,71) to hsv(9, 72%, 100%)', () => {
    // max=255(v=100%), min=71, delta=184
    // s=184/255≈72%, h=60*((99-71)/184 % 6)=60*(28/184)≈9.13→9
    expect(rgbToHsv(255, 99, 71)).toEqual({ h: 9, s: 72, v: 100 });
  });
});

describe('hsvToRgb', () => {
  it('converts hsv(0, 100%, 100%) to rgb(255,0,0)', () => {
    expect(hsvToRgb(0, 100, 100)).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('converts hsv(120, 100%, 100%) to rgb(0,255,0)', () => {
    expect(hsvToRgb(120, 100, 100)).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('converts hsv(240, 100%, 100%) to rgb(0,0,255)', () => {
    expect(hsvToRgb(240, 100, 100)).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('converts hsv(0, 0%, 100%) to rgb(255,255,255)', () => {
    expect(hsvToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts hsv(0, 0%, 0%) to rgb(0,0,0)', () => {
    expect(hsvToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('rgbToHex', () => {
  it('formats rgb(255,0,0) as #ff0000', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });

  it('formats rgb(0,255,0) as #00ff00', () => {
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
  });

  it('formats rgb(0,0,255) as #0000ff', () => {
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
  });
});

// ─── HsvBoxSource.generateBoxes ───────────────────────────────────────────────

describe('HsvBoxSource.generateBoxes', () => {
  it('returns [] when no ::hsv/::hsb option is present', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ff6347', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] when options is empty object', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ff6347', {});
    expect(boxes).toHaveLength(0);
  });

  it('tomato #ff6347 + ::hsv → HSV hsv(9, 72%, 100%)', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ff6347', { hsv: true });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.HSV).toBe('hsv(9, 72%, 100%)');
    expect(kv.Hex).toBe('#ff6347');
    expect(kv.RGB).toBe('rgb(255, 99, 71)');
  });

  it('pure red #ff0000 → hsv(0, 100%, 100%)', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ff0000', { hsv: true });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.HSV).toBe('hsv(0, 100%, 100%)');
  });

  it('white #ffffff → hsv(0, 0%, 100%)', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ffffff', { hsv: true });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.HSV).toBe('hsv(0, 0%, 100%)');
  });

  it('black #000000 → hsv(0, 0%, 0%)', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#000000', { hsv: true });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.HSV).toBe('hsv(0, 0%, 0%)');
  });

  it('green #00ff00 → hsv(120, 100%, 100%)', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#00ff00', { hsv: true });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.HSV).toBe('hsv(120, 100%, 100%)');
  });

  it('blue #0000ff → hsv(240, 100%, 100%)', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#0000ff', { hsv: true });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.HSV).toBe('hsv(240, 100%, 100%)');
  });

  it('accepts ::hsb alias', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ff0000', { hsb: true });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.HSV).toBe('hsv(0, 100%, 100%)');
  });

  it('rgb(255,99,71) input → same HSV as hex tomato', async () => {
    const boxes = await HsvBoxSource.generateBoxes('rgb(255, 99, 71)', {
      hsv: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.HSV).toBe('hsv(9, 72%, 100%)');
  });

  // reverse: hsv → rgb/hex

  it('reverse hsv(120, 100%, 100%) → Hex #00ff00', async () => {
    const boxes = await HsvBoxSource.generateBoxes('hsv(120, 100%, 100%)', {
      hsv: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Hex).toBe('#00ff00');
    expect(kv.RGB).toBe('rgb(0, 255, 0)');
  });

  it('reverse hsv(0, 0%, 100%) → Hex #ffffff', async () => {
    const boxes = await HsvBoxSource.generateBoxes('hsv(0, 0%, 100%)', {
      hsv: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Hex).toBe('#ffffff');
  });

  it('reverse hsv without % signs hsv(120, 100, 100) → Hex #00ff00', async () => {
    const boxes = await HsvBoxSource.generateBoxes('hsv(120, 100, 100)', {
      hsv: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Hex).toBe('#00ff00');
  });

  it('reverse hsb(240, 100%, 100%) → Hex #0000ff', async () => {
    const boxes = await HsvBoxSource.generateBoxes('hsb(240, 100%, 100%)', {
      hsv: true,
    });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Hex).toBe('#0000ff');
  });

  // invalid input → format hint box

  it('invalid input "hello" → returns a hint box', async () => {
    const boxes = await HsvBoxSource.generateBoxes('hello', { hsv: true });
    expect(boxes).toHaveLength(1);
    const kv = boxes[0].props.options as Record<string, string>;
    expect(kv.Accepted).toBeDefined();
  });

  // box metadata

  it('box name is "HSV"', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ff0000', { hsv: true });
    expect(boxes[0].props.name).toBe('HSV');
  });

  it('box priority matches HsvBoxSource.priority', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ff0000', { hsv: true });
    expect(boxes[0].props.priority).toBe(HsvBoxSource.priority);
  });

  it('plaintext contains key:value pairs', async () => {
    const boxes = await HsvBoxSource.generateBoxes('#ff0000', { hsv: true });
    const text = boxes[0].props.plaintextOutput;
    expect(text).toContain('Hex:');
    expect(text).toContain('RGB:');
    expect(text).toContain('HSV:');
  });
});
