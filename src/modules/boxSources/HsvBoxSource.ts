import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

const MAX_INPUT_LEN = 64;

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

// convert rgb integers 0-255 to hsv (h in [0,360), s/v in [0,100])
export function rgbToHsv(r: number, g: number, b: number): HSV {
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

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

// convert hsv (h deg, s/v percent) to rgb integers 0-255
export function hsvToRgb(h: number, s: number, v: number): RGB {
  const sn = s / 100;
  const vn = v / 100;

  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;

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

// format rgb as lowercase 6-digit hex
export function rgbToHex(r: number, g: number, b: number): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// parse 3 or 6-digit hex to rgb, or null if invalid
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

// parse rgb(r,g,b) to rgb, or null if invalid
function parseRgb(input: string): RGB | null {
  const m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(input);
  if (!m) return null;
  const r = Number.parseInt(m[1], 10);
  const g = Number.parseInt(m[2], 10);
  const b = Number.parseInt(m[3], 10);
  if (r > 255 || g > 255 || b > 255) return null;
  return { r, g, b };
}

// parse hsv(h,s%,v%) or hsb(h,s%,v%) to hsv, or null if invalid
function parseHsv(input: string): HSV | null {
  const m =
    /^hs[vb]\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*\)$/i.exec(
      input,
    );
  if (!m) return null;
  const h = Number.parseFloat(m[1]);
  const s = Number.parseFloat(m[2]);
  const v = Number.parseFloat(m[3]);
  if (h < 0 || h > 360 || s < 0 || s > 100 || v < 0 || v > 100) return null;
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

// build the key:value plaintext for headless/TUI consumers
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, val]) => `${k}: ${val}`)
    .join('\n');
}

type Direction = 'toHsv' | 'toRgb' | 'unknown';

interface Match {
  direction: Direction;
  rgb?: RGB;
  hsv?: HSV;
}

export const HsvBoxSource = {
  defaultDisabled: true,
  name: 'HSV',
  description: 'Convert a color between hex/RGB and HSV (HSB).',
  defaultInput: '#ff6347 ::hsv',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  checkMatch(input: string): Match | undefined {
    const s = trim(input);
    if (!s || s.length > MAX_INPUT_LEN) return undefined;

    const lower = s.toLowerCase();

    // hsv()/hsb() → rgb/hex direction
    const hsv = parseHsv(lower);
    if (hsv) return { direction: 'toRgb', hsv };

    // hex or rgb() → hsv direction
    const rgb = parseHex(lower) ?? parseRgb(lower);
    if (rgb) return { direction: 'toHsv', rgb };

    // input is present but unparseable — show format hint
    if (s.length > 0) return { direction: 'unknown' };

    return undefined;
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'hsv', 'hsb')) return [];

    const match = this.checkMatch(input);
    if (!match) return [];

    if (match.direction === 'toHsv' && match.rgb) {
      const { r, g, b } = match.rgb;
      const { h, s, v } = rgbToHsv(r, g, b);
      const hexStr = rgbToHex(r, g, b);
      const rgbStr = `rgb(${r}, ${g}, ${b})`;
      const hsvStr = `hsv(${h}, ${s}%, ${v}%)`;

      const kv: Record<string, string> = {
        Hex: hexStr,
        RGB: rgbStr,
        HSV: hsvStr,
      };

      return [
        new BoxBuilder('HSV', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    if (match.direction === 'toRgb' && match.hsv) {
      const { h, s, v } = match.hsv;
      const { r, g, b } = hsvToRgb(h, s, v);
      const hexStr = rgbToHex(r, g, b);
      const rgbStr = `rgb(${r}, ${g}, ${b})`;
      const hsvStr = `hsv(${h}, ${s}%, ${v}%)`;

      const kv: Record<string, string> = {
        HSV: hsvStr,
        RGB: rgbStr,
        Hex: hexStr,
      };

      return [
        new BoxBuilder('HSV', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // unknown direction: show format hint
    const kv: Record<string, string> = {
      Accepted: '#RRGGBB, #RGB, rgb(r,g,b), hsv(h,s%,v%), hsb(h,s%,v%)',
    };

    return [
      new BoxBuilder('HSV', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HsvBoxSource;
