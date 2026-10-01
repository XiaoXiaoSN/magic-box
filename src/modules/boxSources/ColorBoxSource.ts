import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import {
  BoxBuilder,
  errorBox,
  extractOptionKeys,
  keyValueBox,
} from '@modules/Box';

const PriorityColorBox = 80;

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number | null;
}

interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

// parse 3/6/8-digit hex: #RGB, #RRGGBB, #RRGGBBAA
function parseHex(input: string): RGBA | null {
  const m = /^#([0-9a-fA-F]{3,8})$/.exec(input);
  if (!m) return null;
  const h = m[1];

  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
      a: null,
    };
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: null,
    };
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100,
    };
  }
  return null;
}

// parse rgb(r, g, b) or rgba(r, g, b, a)
function parseRgb(input: string): RGBA | null {
  const m =
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(
      input,
    );
  if (!m) return null;

  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  if (r > 255 || g > 255 || b > 255) return null;

  const a = m[4] !== undefined ? Number(m[4]) : null;
  if (a !== null && (a < 0 || a > 1)) return null;

  return { r, g, b, a };
}

// parse hsl(h, s%, l%) or hsla(h, s%, l%, a)
function parseHsl(input: string): RGBA | null {
  const m =
    /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/.exec(
      input,
    );
  if (!m) return null;

  const h = Number(m[1]);
  const s = Number(m[2]);
  const l = Number(m[3]);
  if (h < 0 || h >= 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;

  const a = m[4] !== undefined ? Number(m[4]) : null;
  if (a !== null && (a < 0 || a > 1)) return null;

  return { ...hslToRgb(h, s, l), a };
}

function parseCmyk(input: string): RGBA | null {
  const m =
    /^cmyk\(\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*\)$/.exec(
      input,
    );
  if (!m) return null;
  const [c, my, y, k] = m.slice(1).map(Number);
  if ([c, my, y, k].some((value) => value > 100)) return null;
  return {
    r: Math.round(255 * (1 - c / 100) * (1 - k / 100)),
    g: Math.round(255 * (1 - my / 100) * (1 - k / 100)),
    b: Math.round(255 * (1 - y / 100) * (1 - k / 100)),
    a: null,
  };
}

// convert hsl (h deg, s/l percent) to rgb integers 0-255
export function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// convert rgb integers 0-255 to hsl (h deg, s/l percent)
export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// format rgba to 6 or 8-digit lowercase hex
export function toHex(rgba: RGBA): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const base = `#${hex(rgba.r)}${hex(rgba.g)}${hex(rgba.b)}`;
  if (rgba.a === null) return base;
  const alphaInt = Math.round(rgba.a * 255);
  return `${base}${hex(alphaInt)}`;
}

// format rgba as rgb() or rgba()
export function toRgbString(rgba: RGBA): string {
  if (rgba.a === null) return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}

// format rgba as hsl() or hsla()
export function toHslString(rgba: RGBA): string {
  const { h, s, l } = rgbToHsl(rgba.r, rgba.g, rgba.b);
  if (rgba.a === null) return `hsl(${h}, ${s}%, ${l}%)`;
  return `hsla(${h}, ${s}%, ${l}%, ${rgba.a})`;
}

function parseColor(input: string): RGBA | null {
  return (
    parseHex(input) ?? parseRgb(input) ?? parseHsl(input) ?? parseCmyk(input)
  );
}

function toCmykString({ r, g, b }: RGBA): string {
  const k = 1 - Math.max(r, g, b) / 255;
  const cmyk: CMYK =
    k === 1
      ? { c: 0, m: 0, y: 0, k: 100 }
      : {
          c: Math.round(((1 - r / 255 - k) / (1 - k)) * 100),
          m: Math.round(((1 - g / 255 - k) / (1 - k)) * 100),
          y: Math.round(((1 - b / 255 - k) / (1 - k)) * 100),
          k: Math.round(k * 100),
        };
  return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
}

function optionPercent(
  value: string | boolean | null,
  fallback: number,
): number {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))
    return fallback;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

const colorToken =
  '(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|cmyk)\\([^)]*\\))';
const colorPair = new RegExp(`^(${colorToken})\\s+(${colorToken})$`, 'i');

interface Match {
  rgba: RGBA;
}

export const ColorBoxSource = {
  name: 'Color',
  description:
    'Convert HEX, RGB, and HSL colors; use ::cmyk, ::lighten, ::darken, or ::colormix for more formats and adjustments.',
  defaultInput: '#ff6347',
  tag: '🎨',
  kind: 'Convert',
  priority: PriorityColorBox,

  checkMatch(input: string): Match | undefined {
    const normalized = trim(input);
    if (!normalized) return undefined;

    const rgba = parseColor(normalized.toLowerCase());
    if (!rgba) return undefined;
    return { rgba };
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantsMix =
      options?.colormix !== undefined ||
      options?.mixcolor !== undefined ||
      options?.blend !== undefined;
    const wantsAdjust =
      options?.lighten !== undefined || options?.darken !== undefined;
    const wantsCmyk = options?.cmyk !== undefined || /^\s*cmyk\(/i.test(input);
    const summaries: Box[] = [];
    let rgba: RGBA;

    if (wantsMix) {
      const match = colorPair.exec(trim(input));
      const first = match ? parseColor(match[1].toLowerCase()) : null;
      const second = match ? parseColor(match[2].toLowerCase()) : null;
      if (!first || !second || first.a !== null || second.a !== null) {
        return [
          errorBox(
            'Color Mix',
            'Enter two opaque HEX, RGB, HSL, or CMYK colors.',
            { priority: this.priority },
          ),
        ];
      }
      const percent = optionPercent(
        extractOptionKeys(options, 'colormix', 'mixcolor', 'blend'),
        50,
      );
      const ratio = percent / 100;
      rgba = {
        r: Math.round(first.r * (1 - ratio) + second.r * ratio),
        g: Math.round(first.g * (1 - ratio) + second.g * ratio),
        b: Math.round(first.b * (1 - ratio) + second.b * ratio),
        a: null,
      };
      summaries.push(
        keyValueBox(
          'keyValue',
          'Color Mix',
          {
            'Color 1': toHex(first),
            'Color 2': toHex(second),
            Ratio: `${100 - percent}% / ${percent}%`,
            Mixed: toHex(rgba),
          },
          { priority: this.priority },
        ),
      );
    } else {
      const match = this.checkMatch(input);
      if (!match) return [];
      rgba = match.rgba;
    }

    if (wantsAdjust) {
      if (rgba.a !== null) {
        return [
          errorBox(
            'Color Adjust',
            'Enter an opaque color to lighten or darken.',
            { priority: this.priority },
          ),
        ];
      }
      const isDarken = options?.lighten === undefined;
      const operation = isDarken ? 'darken' : 'lighten';
      const percent = optionPercent(extractOptionKeys(options, operation), 10);
      const original = toHex(rgba);
      const { h, s, l } = rgbToHsl(rgba.r, rgba.g, rgba.b);
      rgba = {
        ...hslToRgb(
          h,
          s,
          isDarken ? Math.max(0, l - percent) : Math.min(100, l + percent),
        ),
        a: null,
      };
      summaries.push(
        keyValueBox(
          'keyValue',
          'Color Adjust',
          {
            Original: original,
            Adjusted: toHex(rgba),
            Operation: `${operation} ${percent}%`,
          },
          { priority: this.priority },
        ),
      );
    }

    const hexStr = toHex(rgba);
    const rgbStr = toRgbString(rgba);
    const hslStr = toHslString(rgba);

    const formats = [
      new BoxBuilder('HEX', hexStr)
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
      new BoxBuilder('RGB', rgbStr)
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
      new BoxBuilder('HSL', hslStr)
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
    if (wantsCmyk && rgba.a === null) {
      formats.push(
        new BoxBuilder('CMYK', toCmykString(rgba))
          .setView('default')
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    } else if (wantsCmyk) {
      formats.push(
        errorBox('CMYK', 'CMYK does not support an alpha channel.', {
          priority: this.priority,
        }),
      );
    }
    return [...summaries, ...formats];
  },
};

export default ColorBoxSource;
