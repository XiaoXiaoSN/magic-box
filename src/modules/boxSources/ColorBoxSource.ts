import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityColorBox = 80;

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number | null;
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
  return parseHex(input) ?? parseRgb(input) ?? parseHsl(input);
}

interface Match {
  rgba: RGBA;
}

export const ColorBoxSource = {
  name: 'Color',
  description:
    'Convert a color (hex, rgb/rgba, hsl/hsla) between hex, RGB, and HSL formats.',
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
    _options: BoxOptions = null,
  ): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) return [];

    const { rgba } = match;

    const hexStr = toHex(rgba);
    const rgbStr = toRgbString(rgba);
    const hslStr = toHslString(rgba);

    return [
      new BoxBuilder('HEX', hexStr)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
      new BoxBuilder('RGB', rgbStr)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
      new BoxBuilder('HSL', hslStr)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ColorBoxSource;
