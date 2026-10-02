import { describe, expect, it } from 'vitest';

import {
  ColorBoxSource,
  hslToRgb,
  rgbToHsl,
  toHex,
  toHslString,
  toRgbString,
} from '../ColorBoxSource';

// ─── conversion helper unit tests ─────────────────────────────────────────────

describe('hslToRgb', () => {
  it('converts red hsl(0, 100%, 50%) to rgb(255, 0, 0)', () => {
    expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('converts green hsl(120, 100%, 50%) to rgb(0, 255, 0)', () => {
    expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('converts blue hsl(240, 100%, 50%) to rgb(0, 0, 255)', () => {
    expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('converts white hsl(0, 0%, 100%) to rgb(255, 255, 255)', () => {
    expect(hslToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts black hsl(0, 0%, 0%) to rgb(0, 0, 0)', () => {
    expect(hslToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('rgbToHsl', () => {
  it('converts rgb(255, 0, 0) to hsl(0, 100%, 50%)', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
  });

  it('converts rgb(0, 255, 0) to hsl(120, 100%, 50%)', () => {
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 });
  });

  it('converts rgb(0, 0, 255) to hsl(240, 100%, 50%)', () => {
    expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 });
  });

  it('converts white rgb(255, 255, 255) to hsl(0, 0%, 100%)', () => {
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 });
  });

  it('converts black rgb(0, 0, 0) to hsl(0, 0%, 0%)', () => {
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 });
  });

  it('round-trips hsl->rgb->hsl for tomato (hsl(9,100%,64%))', () => {
    const { r, g, b } = hslToRgb(9, 100, 64);
    const { h, s, l } = rgbToHsl(r, g, b);
    // allow ±1 rounding error
    expect(Math.abs(h - 9)).toBeLessThanOrEqual(1);
    expect(Math.abs(s - 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(l - 64)).toBeLessThanOrEqual(1);
  });
});

describe('toHex', () => {
  it('formats rgb(255,0,0) as #ff0000', () => {
    expect(toHex({ r: 255, g: 0, b: 0, a: null })).toBe('#ff0000');
  });

  it('includes alpha channel when present', () => {
    expect(toHex({ r: 255, g: 0, b: 0, a: 0.5 })).toBe('#ff000080');
  });

  it('formats fully transparent as #00000000', () => {
    expect(toHex({ r: 0, g: 0, b: 0, a: 0 })).toBe('#00000000');
  });
});

describe('toRgbString', () => {
  it('formats without alpha as rgb()', () => {
    expect(toRgbString({ r: 255, g: 0, b: 0, a: null })).toBe('rgb(255, 0, 0)');
  });

  it('formats with alpha as rgba()', () => {
    expect(toRgbString({ r: 255, g: 0, b: 0, a: 0.5 })).toBe(
      'rgba(255, 0, 0, 0.5)',
    );
  });
});

describe('toHslString', () => {
  it('formats without alpha as hsl()', () => {
    expect(toHslString({ r: 255, g: 0, b: 0, a: null })).toBe(
      'hsl(0, 100%, 50%)',
    );
  });

  it('formats with alpha as hsla()', () => {
    expect(toHslString({ r: 255, g: 0, b: 0, a: 0.5 })).toBe(
      'hsla(0, 100%, 50%, 0.5)',
    );
  });
});

// ─── ColorBoxSource.checkMatch ────────────────────────────────────────────────

describe('ColorBoxSource.checkMatch', () => {
  it('returns undefined for empty input', () => {
    expect(ColorBoxSource.checkMatch('')).toBeUndefined();
  });

  it('returns undefined for non-color text', () => {
    expect(ColorBoxSource.checkMatch('hello world')).toBeUndefined();
    expect(ColorBoxSource.checkMatch('12345')).toBeUndefined();
    expect(ColorBoxSource.checkMatch('uuid')).toBeUndefined();
  });

  it('parses 6-digit hex #ff0000', () => {
    const m = ColorBoxSource.checkMatch('#ff0000');
    expect(m).toBeDefined();
    expect(m?.rgba).toMatchObject({ r: 255, g: 0, b: 0, a: null });
  });

  it('parses 3-digit hex #f00 (shorthand red)', () => {
    const m = ColorBoxSource.checkMatch('#f00');
    expect(m).toBeDefined();
    expect(m?.rgba).toMatchObject({ r: 255, g: 0, b: 0, a: null });
  });

  it('parses 8-digit hex with alpha #ff000080', () => {
    const m = ColorBoxSource.checkMatch('#ff000080');
    expect(m).toBeDefined();
    expect(m?.rgba.r).toBe(255);
    expect(m?.rgba.g).toBe(0);
    expect(m?.rgba.b).toBe(0);
    expect(m?.rgba.a).toBeCloseTo(0.5, 2);
  });

  it('parses rgb(255, 0, 0)', () => {
    const m = ColorBoxSource.checkMatch('rgb(255, 0, 0)');
    expect(m).toBeDefined();
    expect(m?.rgba).toMatchObject({ r: 255, g: 0, b: 0, a: null });
  });

  it('parses rgba(255, 0, 0, 0.5)', () => {
    const m = ColorBoxSource.checkMatch('rgba(255, 0, 0, 0.5)');
    expect(m).toBeDefined();
    expect(m?.rgba).toMatchObject({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('parses hsl(0, 100%, 50%)', () => {
    const m = ColorBoxSource.checkMatch('hsl(0, 100%, 50%)');
    expect(m).toBeDefined();
    expect(m?.rgba).toMatchObject({ r: 255, g: 0, b: 0, a: null });
  });

  it('parses hsla(0, 100%, 50%, 0.5)', () => {
    const m = ColorBoxSource.checkMatch('hsla(0, 100%, 50%, 0.5)');
    expect(m).toBeDefined();
    expect(m?.rgba).toMatchObject({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('rejects rgb with out-of-range channel', () => {
    expect(ColorBoxSource.checkMatch('rgb(300, 0, 0)')).toBeUndefined();
  });

  it('rejects hsl with invalid saturation', () => {
    expect(ColorBoxSource.checkMatch('hsl(0, 150%, 50%)')).toBeUndefined();
  });

  it('is case-insensitive for hex', () => {
    const m = ColorBoxSource.checkMatch('#FF0000');
    expect(m).toBeDefined();
    expect(m?.rgba).toMatchObject({ r: 255, g: 0, b: 0, a: null });
  });

  it('handles leading/trailing whitespace', () => {
    const m = ColorBoxSource.checkMatch('  #ff0000  ');
    expect(m).toBeDefined();
  });
});

// ─── ColorBoxSource.generateBoxes ────────────────────────────────────────────

describe('ColorBoxSource.generateBoxes', () => {
  it('returns empty array for non-color input', async () => {
    const boxes = await ColorBoxSource.generateBoxes('not a color');
    expect(boxes).toHaveLength(0);
  });

  it('preserves the three default color outputs for #ff0000', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#ff0000');
    expect(boxes).toHaveLength(3);

    const names = boxes.map((b) => b.props.name);
    expect(names).toContain('HEX');
    expect(names).toContain('RGB');
    expect(names).toContain('HSL');
  });

  it('round-trip: #ff0000 outputs match expected values', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#ff0000');
    const byName = Object.fromEntries(
      boxes.map((b) => [b.props.name, b.props.plaintextOutput]),
    );

    expect(byName.HEX).toBe('#ff0000');
    expect(byName.RGB).toBe('rgb(255, 0, 0)');
    expect(byName.HSL).toBe('hsl(0, 100%, 50%)');
  });

  it('preserves alpha channel in all three formats for rgba input', async () => {
    const boxes = await ColorBoxSource.generateBoxes('rgba(255, 0, 0, 0.5)');
    expect(boxes).toHaveLength(3);
    const byName = Object.fromEntries(
      boxes.map((b) => [b.props.name, b.props.plaintextOutput]),
    );

    expect(byName.HEX).toBe('#ff000080');
    expect(byName.RGB).toBe('rgba(255, 0, 0, 0.5)');
    expect(byName.HSL).toBe('hsla(0, 100%, 50%, 0.5)');
  });

  it('round-trip: hsl(120, 100%, 50%) converts to green', async () => {
    const boxes = await ColorBoxSource.generateBoxes('hsl(120, 100%, 50%)');
    const byName = Object.fromEntries(
      boxes.map((b) => [b.props.name, b.props.plaintextOutput]),
    );

    expect(byName.HEX).toBe('#00ff00');
    expect(byName.RGB).toBe('rgb(0, 255, 0)');
    expect(byName.HSL).toBe('hsl(120, 100%, 50%)');
  });

  it('each box uses DefaultBoxTemplate', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#00ff00');
    for (const box of boxes) {
      expect(box.view).toBe('default');
    }
  });

  it('each box carries the correct priority', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#0000ff');
    for (const box of boxes) {
      expect(box.props.priority).toBe(80);
    }
  });

  it('3-digit shorthand #f00 is equivalent to #ff0000', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#f00');
    const byName = Object.fromEntries(
      boxes.map((b) => [b.props.name, b.props.plaintextOutput]),
    );
    expect(byName.HEX).toBe('#ff0000');
    expect(byName.RGB).toBe('rgb(255, 0, 0)');
  });

  it('converts CMYK input through the same color source', async () => {
    const boxes = await ColorBoxSource.generateBoxes(
      'cmyk(0%, 100%, 100%, 0%)',
      { cmyk: true },
    );
    const byName = Object.fromEntries(
      boxes.map((box) => [box.props.name, box.props.plaintextOutput]),
    );
    expect(byName.HEX).toBe('#ff0000');
    expect(byName.RGB).toBe('rgb(255, 0, 0)');
    expect(byName.CMYK).toBe('cmyk(0%, 100%, 100%, 0%)');
  });

  it('adds CMYK only when requested for ordinary color input', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#ff0000', { cmyk: true });
    expect(
      boxes.find((box) => box.props.name === 'CMYK')?.props.plaintextOutput,
    ).toBe('cmyk(0%, 100%, 100%, 0%)');
    expect(
      (await ColorBoxSource.generateBoxes('#ff0000')).some(
        (box) => box.props.name === 'CMYK',
      ),
    ).toBe(false);
  });

  it('explains why an alpha color cannot be converted to CMYK', async () => {
    const boxes = await ColorBoxSource.generateBoxes('rgba(255, 0, 0, 0.5)', {
      cmyk: true,
    });
    expect(
      boxes.find((box) => box.props.name === 'CMYK')?.props.plaintextOutput,
    ).toContain('alpha');
  });

  it('converts black and white to CMYK without division by zero', async () => {
    const black = await ColorBoxSource.generateBoxes('#000000', { cmyk: true });
    const white = await ColorBoxSource.generateBoxes('#ffffff', { cmyk: true });
    expect(
      black.find((box) => box.props.name === 'CMYK')?.props.plaintextOutput,
    ).toBe('cmyk(0%, 0%, 0%, 100%)');
    expect(
      white.find((box) => box.props.name === 'CMYK')?.props.plaintextOutput,
    ).toBe('cmyk(0%, 0%, 0%, 0%)');
  });

  it('rejects out-of-range CMYK input', async () => {
    expect(
      await ColorBoxSource.generateBoxes('cmyk(0, 101, 0, 0)'),
    ).toHaveLength(0);
  });

  it('mixes two colors and derives all formats from the result', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#f00 rgb(0, 0, 255)', {
      colormix: '50',
      cmyk: true,
    });
    const byName = Object.fromEntries(
      boxes.map((box) => [box.props.name, box]),
    );
    expect(
      (byName['Color Mix'].props.options as Record<string, string>).Mixed,
    ).toBe('#800080');
    expect(byName.HEX.props.plaintextOutput).toBe('#800080');
    expect(byName.RGB.props.plaintextOutput).toBe('rgb(128, 0, 128)');
    expect(byName.CMYK.props.plaintextOutput).toBe('cmyk(0%, 100%, 0%, 50%)');
  });

  it('supports mix aliases and boundary ratios', async () => {
    const first = await ColorBoxSource.generateBoxes('#ff0000 #0000ff', {
      blend: '0',
    });
    const second = await ColorBoxSource.generateBoxes('#ff0000 #0000ff', {
      mixcolor: '100',
    });
    expect(
      first.find((box) => box.props.name === 'HEX')?.props.plaintextOutput,
    ).toBe('#ff0000');
    expect(
      second.find((box) => box.props.name === 'HEX')?.props.plaintextOutput,
    ).toBe('#0000ff');
  });

  it('requires exactly two valid opaque colors for mixing', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#ff0000', {
      colormix: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toContain('two opaque');
    expect(await ColorBoxSource.generateBoxes('#ff0000 #0000ff')).toHaveLength(
      0,
    );
  });

  it('lightens and darkens using the shared color conversion', async () => {
    const light = await ColorBoxSource.generateBoxes('#000000', {
      lighten: '50',
    });
    const dark = await ColorBoxSource.generateBoxes('#ffffff', {
      darken: '100',
    });
    expect((light[0].props.options as Record<string, string>).Adjusted).toBe(
      '#808080',
    );
    expect(
      light.find((box) => box.props.name === 'HEX')?.props.plaintextOutput,
    ).toBe('#808080');
    expect((dark[0].props.options as Record<string, string>).Adjusted).toBe(
      '#000000',
    );
  });

  it('composes mixing then adjustment in one source', async () => {
    const boxes = await ColorBoxSource.generateBoxes('#000000 #ffffff', {
      colormix: '50',
      lighten: '10',
      darken: '10',
      cmyk: true,
    });
    expect(boxes[0].props.name).toBe('Color Mix');
    expect((boxes[1].props.options as Record<string, string>).Operation).toBe(
      'lighten 10%',
    );
    expect((boxes[1].props.options as Record<string, string>).Original).toBe(
      '#808080',
    );
    expect(
      boxes.find((box) => box.props.name === 'HEX')?.props.plaintextOutput,
    ).toBe('#999999');
    expect(
      boxes.find((box) => box.props.name === 'CMYK')?.props.plaintextOutput,
    ).toBe('cmyk(0%, 0%, 0%, 40%)');
  });
});
