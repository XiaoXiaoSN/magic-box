import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

interface RGB {
  r: number;
  g: number;
  b: number;
}

// parse #RGB or #RRGGBB hex strings into r,g,b integers 0-255
function parseHex(input: string): RGB | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(input);
  if (!m) return null;
  const h = m[1];
  if (h.length === 3) {
    return {
      r: Number.parseInt(h[0] + h[0], 16),
      g: Number.parseInt(h[1] + h[1], 16),
      b: Number.parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

// parse rgb(r, g, b) strings into r,g,b integers 0-255
function parseRgb(input: string): RGB | null {
  const m = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(
    input,
  );
  if (!m) return null;
  const r = Number.parseInt(m[1], 10);
  const g = Number.parseInt(m[2], 10);
  const b = Number.parseInt(m[3], 10);
  if (r > 255 || g > 255 || b > 255) return null;
  return { r, g, b };
}

interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

// convert r,g,b (0-255) to cmyk percentages (0-100, integer-rounded)
function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

// convert r,g,b (0-255) to hsv: h in degrees 0-360, s and v as percentages 0-100
function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  const v = max;
  const s = max === 0 ? 0 : delta / max;

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

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

export const CmykBoxSource = {
  name: 'CMYK / HSV',
  description: 'Convert a hex or rgb() color to CMYK and HSV.',
  defaultInput: '#ff6347 ::cmyk',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'cmyk', 'hsv')) return [];

    const raw = trim(input).slice(0, 64);
    const rgb = parseHex(raw) ?? parseRgb(raw);

    if (!rgb) {
      const errorText =
        'A valid hex (#RGB / #RRGGBB) or rgb(r,g,b) color is required.';
      return [
        new BoxBuilder('CMYK / HSV', errorText)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ error: errorText })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { r, g, b } = rgb;
    const { c, m, y, k } = rgbToCmyk(r, g, b);
    const { h, s, v } = rgbToHsv(r, g, b);

    const rgbStr = `rgb(${r}, ${g}, ${b})`;
    const cmykStr = `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
    const hsvStr = `hsv(${h}, ${s}%, ${v}%)`;

    const plaintext = `RGB: ${rgbStr}\nCMYK: ${cmykStr}\nHSV: ${hsvStr}`;

    return [
      new BoxBuilder('CMYK / HSV', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions({ RGB: rgbStr, CMYK: cmykStr, HSV: hsvStr })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CmykBoxSource;
