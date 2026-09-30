import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length guard
const MAX_LEN = 64;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface CmykColor {
  c: number;
  m: number;
  y: number;
  k: number;
}

// parses #RGB or #RRGGBB into r,g,b integers 0..255
function parseHex(hex: string): RgbColor | null {
  const s = hex.startsWith('#') ? hex.slice(1) : hex;
  if (s.length === 3) {
    const r = Number.parseInt(s[0] + s[0], 16);
    const g = Number.parseInt(s[1] + s[1], 16);
    const b = Number.parseInt(s[2] + s[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }
  if (s.length === 6) {
    const r = Number.parseInt(s.slice(0, 2), 16);
    const g = Number.parseInt(s.slice(2, 4), 16);
    const b = Number.parseInt(s.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }
  return null;
}

// parses rgb(r,g,b) — values may be integers 0..255
function parseRgb(input: string): RgbColor | null {
  const m = input.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (!m) return null;
  const r = Number.parseInt(m[1], 10);
  const g = Number.parseInt(m[2], 10);
  const b = Number.parseInt(m[3], 10);
  if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) return null;
  return { r, g, b };
}

// converts r,g,b (0..255) to cmyk percentages rounded to integer
function rgbToCmyk({ r, g, b }: RgbColor): CmykColor {
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;
  const k = 1 - Math.max(rp, gp, bp);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const denom = 1 - k;
  const c = Math.round(((1 - rp - k) / denom) * 100);
  const m = Math.round(((1 - gp - k) / denom) * 100);
  const y = Math.round(((1 - bp - k) / denom) * 100);
  return { c, m, y, k: Math.round(k * 100) };
}

// converts cmyk percentages (0..100) to r,g,b integers 0..255
function cmykToRgb({ c, m, y, k }: CmykColor): RgbColor {
  const r = Math.round(255 * (1 - c / 100) * (1 - k / 100));
  const g = Math.round(255 * (1 - m / 100) * (1 - k / 100));
  const b = Math.round(255 * (1 - y / 100) * (1 - k / 100));
  return { r, g, b };
}

// formats a channel byte as two uppercase hex digits
function byteToHex(v: number): string {
  return v.toString(16).padStart(2, '0').toUpperCase();
}

function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

// parses cmyk(c,m,y,k) where each value is 0..100 (with or without %)
function parseCmyk(input: string): CmykColor | null {
  const m = input.match(
    /^cmyk\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)$/i,
  );
  if (!m) return null;
  const [c, my, y, k] = [m[1], m[2], m[3], m[4]].map((v) =>
    Number.parseFloat(v),
  );
  if ([c, my, y, k].some((v) => Number.isNaN(v) || v < 0 || v > 100))
    return null;
  return { c, m: my, y, k };
}

function formatCmyk({ c, m, y, k }: CmykColor): string {
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

export const CmykBoxSource = {
  defaultDisabled: true,
  name: 'CMYK',
  description: 'Convert a color between hex/RGB and CMYK.',
  defaultInput: '#ff6347 ::cmyk',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'cmyk')) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_LEN) return [];

    // attempt hex → cmyk
    const hexMatch = raw.match(/^(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)$/);
    if (hexMatch) {
      const rgb = parseHex(hexMatch[1]);
      if (rgb) {
        const cmyk = rgbToCmyk(rgb);
        const kv: Record<string, string> = {
          Hex: raw
            .toUpperCase()
            .replace(/^(#[0-9a-f]{3,6})$/i, (s) => s.toUpperCase()),
          RGB: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          CMYK: formatCmyk(cmyk),
        };
        const plaintext = Object.entries(kv)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
        return [
          new BoxBuilder('CMYK', plaintext)
            .setOptions(kv)
            .setTemplate(KeyValueBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // attempt rgb(r,g,b) → cmyk
    const rgbMatch = raw.match(/^(rgb\([^)]*\))$/i);
    if (rgbMatch) {
      const rgb = parseRgb(rgbMatch[1]);
      if (rgb) {
        const cmyk = rgbToCmyk(rgb);
        const kv: Record<string, string> = {
          Hex: rgbToHex(rgb),
          RGB: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          CMYK: formatCmyk(cmyk),
        };
        const plaintext = Object.entries(kv)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
        return [
          new BoxBuilder('CMYK', plaintext)
            .setOptions(kv)
            .setTemplate(KeyValueBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // attempt cmyk(c,m,y,k) → hex/rgb
    const cmykMatch = raw.match(/^(cmyk\([^)]*\))$/i);
    if (cmykMatch) {
      const cmyk = parseCmyk(cmykMatch[1]);
      if (cmyk) {
        const rgb = cmykToRgb(cmyk);
        const kv: Record<string, string> = {
          CMYK: formatCmyk(cmyk),
          RGB: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          Hex: rgbToHex(rgb),
        };
        const plaintext = Object.entries(kv)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
        return [
          new BoxBuilder('CMYK', plaintext)
            .setOptions(kv)
            .setTemplate(KeyValueBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // unrecognized format — return a hint box
    const hint =
      'Expected: #RGB, #RRGGBB, rgb(r,g,b), or cmyk(c,m,y,k) (0–100%)';
    return [
      new BoxBuilder('CMYK', hint)
        .setOptions({ Format: hint })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CmykBoxSource;
