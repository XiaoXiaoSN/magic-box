import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

// expand #RGB to #RRGGBB and validate; returns null for non-hex input
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

// convert rgb (0-255 each) to hsl (h in degrees, s/l in 0-100)
function rgbToHsl(r: number, g: number, b: number): HSL {
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

// convert hsl (h degrees, s/l percent 0-100) to rgb (0-255 each)
function hslToRgb(h: number, s: number, l: number): RGB {
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

// format an rgb value as a lowercase 6-digit hex string
function rgbToHex({ r, g, b }: RGB): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// parse the option value as a percentage point integer (0-100); falls back to 10
function parsePercent(val: string | boolean | null): number {
  if (val === null || val === true || val === false) return 10;
  const n = Number.parseFloat(String(val));
  if (!Number.isFinite(n)) return 10;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const ColorAdjustBoxSource = {
  defaultDisabled: true,
  name: 'Color Adjust',
  description:
    'Lighten or darken a hex color by a percentage. e.g. "#ff6347 ::lighten=20".',
  defaultInput: '#ff6347 ::lighten=20',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'lighten', 'darken')) return [];
    if (input.length > 50) return [];

    const normalized = trim(input).toLowerCase();
    const rgb = parseHex(normalized);
    if (!rgb) return [];

    const lightenVal = extractOptionKeys(options, 'lighten');
    const darkenVal = extractOptionKeys(options, 'darken');

    // lighten takes precedence when both are present
    const isDarken = lightenVal === null && darkenVal !== null;
    const delta = isDarken ? parsePercent(darkenVal) : parsePercent(lightenVal);
    const operation = isDarken ? 'darken' : 'lighten';

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const newL = isDarken
      ? Math.max(0, hsl.l - delta)
      : Math.min(100, hsl.l + delta);

    const adjustedRgb = hslToRgb(hsl.h, hsl.s, newL);
    const originalHex = rgbToHex(rgb);
    const adjustedHex = rgbToHex(adjustedRgb);

    const outputOptions: Record<string, string> = {
      Original: originalHex,
      Adjusted: adjustedHex,
      Operation: `${operation} ${delta}%`,
    };

    const plaintextOutput = `Original: ${originalHex}\nAdjusted: ${adjustedHex}\nOperation: ${operation} ${delta}%`;

    return [
      new BoxBuilder('Color Adjust', plaintextOutput)
        .setOptions(outputOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ColorAdjustBoxSource;
