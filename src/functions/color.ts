// shared sRGB hex parsing and WCAG 2.x contrast math used by the color-related
// boxSources (ColorContrast, OnColor, ...). kept in one place so luminance
// formulas and ratio formatting have exactly one implementation and can never
// drift apart between tools.

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface ParsedHexColor extends RgbColor {
  // canonical lowercase `#rrggbb` form of the input
  normalized: string;
}

export const BLACK: RgbColor = { r: 0, g: 0, b: 0 };
export const WHITE: RgbColor = { r: 255, g: 255, b: 255 };

// canonical lowercase `#rrggbb` form of an rgb color
export const formatHex = (color: RgbColor): string =>
  `#${((color.r << 16) | (color.g << 8) | color.b)
    .toString(16)
    .padStart(6, '0')}`;

// parses #RGB or #RRGGBB (case-insensitive, surrounding whitespace ignored);
// returns null for anything else
export const parseHexColor = (raw: string): ParsedHexColor | null => {
  const cleaned = raw.trim().toLowerCase();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(cleaned);
  if (!match) return null;

  const h = match[1];
  const rgb: RgbColor =
    h.length === 3
      ? {
          r: Number.parseInt(h[0] + h[0], 16),
          g: Number.parseInt(h[1] + h[1], 16),
          b: Number.parseInt(h[2] + h[2], 16),
        }
      : {
          r: Number.parseInt(h.slice(0, 2), 16),
          g: Number.parseInt(h.slice(2, 4), 16),
          b: Number.parseInt(h.slice(4, 6), 16),
        };
  return { ...rgb, normalized: formatHex(rgb) };
};

// WCAG 2.x linearization of a single 8-bit sRGB channel
const linearizeChannel = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

// WCAG 2.x relative luminance of an sRGB color
export const relativeLuminance = ({ r, g, b }: RgbColor): number =>
  0.2126 * linearizeChannel(r) +
  0.7152 * linearizeChannel(g) +
  0.0722 * linearizeChannel(b);

// WCAG contrast ratio between two colors: (lighter + 0.05) / (darker + 0.05)
export const contrastRatio = (a: RgbColor, b: RgbColor): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// formats a contrast ratio in WCAG 'N:1' style (e.g. '21:1', '4.48:1')
export const formatRatio = (ratio: number): string => {
  const rounded = Math.round(ratio * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}:1` : `${rounded.toFixed(2)}:1`;
};
