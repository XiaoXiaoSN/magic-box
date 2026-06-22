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

// parses #RGB, #RRGGBB, or rgb(r,g,b) into an RGB struct; returns null on failure
function parseColor(raw: string): RGB | null {
  const hex = raw.trim();

  if (hex.startsWith('#')) {
    const digits = hex.slice(1);

    if (digits.length === 3) {
      const r = Number.parseInt(digits[0] + digits[0], 16);
      const g = Number.parseInt(digits[1] + digits[1], 16);
      const b = Number.parseInt(digits[2] + digits[2], 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
      return { r, g, b };
    }

    if (digits.length === 6) {
      const r = Number.parseInt(digits.slice(0, 2), 16);
      const g = Number.parseInt(digits.slice(2, 4), 16);
      const b = Number.parseInt(digits.slice(4, 6), 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
      return { r, g, b };
    }

    return null;
  }

  const rgbMatch = hex.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i,
  );
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1], 10);
    const g = Number.parseInt(rgbMatch[2], 10);
    const b = Number.parseInt(rgbMatch[3], 10);
    if (r > 255 || g > 255 || b > 255) return null;
    return { r, g, b };
  }

  return null;
}

// formats an RGB struct to a lowercase #rrggbb hex string
function toHex(rgb: RGB): string {
  const pad = (n: number) => n.toString(16).padStart(2, '0');
  return `#${pad(rgb.r)}${pad(rgb.g)}${pad(rgb.b)}`;
}

// naive sRGB linear blend: result = color1*(1-t) + color2*t  (not gamma-corrected)
function blendRGB(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(c1.r * (1 - t) + c2.r * t),
    g: Math.round(c1.g * (1 - t) + c2.g * t),
    b: Math.round(c1.b * (1 - t) + c2.b * t),
  };
}

// builds a plain k:v string for headless / plaintext consumers
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// extract color tokens by matching them directly — splitting on commas would
// break rgb(r,g,b)'s internal commas, so match hex or rgb(...) groups instead
function splitColors(input: string): string[] {
  const matches = input.match(/#[0-9a-fA-F]+|rgba?\([^)]*\)/gi);
  return matches ?? [];
}

export const ColorMixBoxSource = {
  name: 'Color Mix',
  description:
    'Mix two colors. Input: "#hex1 #hex2" (or rgb()). ::colormix=<percent of the second color> (default 50).',
  defaultInput: '#ff0000 #0000ff ::colormix',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'colormix', 'mixcolor', 'blend')) return [];

    const raw = trim(input).slice(0, 64);
    const tokens = splitColors(raw);

    // resolve ratio: percent of the second color, clamped to [0, 100]
    const optVal = extractOptionKeys(options, 'colormix', 'mixcolor', 'blend');
    let percent = 50;
    if (typeof optVal === 'string') {
      const parsed = Number.parseInt(optVal, 10);
      if (!Number.isNaN(parsed)) {
        percent = Math.min(100, Math.max(0, parsed));
      }
    }
    const t = percent / 100;

    const parsed = tokens.map(parseColor);
    const valid = parsed.filter((c): c is RGB => c !== null);

    if (valid.length < 2) {
      // return a single explanatory box rather than an empty array
      const kv = {
        Error: 'Need exactly two colors.',
        Format: '#RGB, #RRGGBB, or rgb(r,g,b)',
        Example: '#ff0000 #0000ff',
      };
      const box = new BoxBuilder('Color Mix', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(Priority)
        .setTag(ColorMixBoxSource.tag)
        .setKind(ColorMixBoxSource.kind)
        .build();
      return [box];
    }

    const [c1, c2] = valid;
    const mixed = blendRGB(c1, c2, t);
    const mixedHex = toHex(mixed);

    const kv: Record<string, string> = {
      'Color 1': toHex(c1),
      'Color 2': toHex(c2),
      Ratio: `${100 - percent}% / ${percent}%`,
      Mixed: mixedHex,
      RGB: `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`,
    };

    const box = new BoxBuilder('Color Mix', kvToPlaintext(kv))
      .setOptions(kv)
      .setTemplate(KeyValueBoxTemplate)
      .setPriority(ColorMixBoxSource.priority)
      .setTag(ColorMixBoxSource.tag)
      .setKind(ColorMixBoxSource.kind)
      .build();

    return [box];
  },
};

export default ColorMixBoxSource;
