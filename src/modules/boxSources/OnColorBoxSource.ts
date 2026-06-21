import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_HEX_INPUT = 32;

// expands a 3-digit shorthand hex (e.g. #rgb) to 6-digit form
function expandShortHex(hex: string): string {
  return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

// parses #RGB or #RRGGBB hex strings; returns null for anything else
function parseHex(input: string): { rgb: Rgb; normalized: string } | null {
  const cleaned = input.trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(cleaned);
  if (short) {
    const full = expandShortHex(cleaned);
    return {
      rgb: {
        r: Number.parseInt(full.slice(1, 3), 16),
        g: Number.parseInt(full.slice(3, 5), 16),
        b: Number.parseInt(full.slice(5, 7), 16),
      },
      normalized: full,
    };
  }
  const long = /^#([0-9a-f]{6})$/.exec(cleaned);
  if (long) {
    return {
      rgb: {
        r: Number.parseInt(cleaned.slice(1, 3), 16),
        g: Number.parseInt(cleaned.slice(3, 5), 16),
        b: Number.parseInt(cleaned.slice(5, 7), 16),
      },
      normalized: cleaned,
    };
  }
  return null;
}

// converts a single 8-bit channel to its WCAG linearized value
function linearizeChannel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

// computes WCAG 2.1 relative luminance for an sRGB color
function relativeLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

// formats a contrast ratio as "X.XX:1", dropping decimals when exact
function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 100) / 100;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded}:1`;
}

export const OnColorBoxSource = {
  name: 'Readable Text Color',
  description:
    'Given a background hex color, pick the readable foreground (black or white) and the WCAG contrast.',
  defaultInput: '#3498db ::oncolor',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'oncolor', 'textcolor')) return [];

    const raw = trim(input).slice(0, MAX_HEX_INPUT);
    const parsed = parseHex(raw);

    if (!parsed) {
      const errorText = 'A valid hex color is required (e.g. #3498db or #fff)';
      return [
        new BoxBuilder('Readable Text Color', errorText)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Error: errorText })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { rgb, normalized } = parsed;
    const L = relativeLuminance(rgb);

    // WCAG contrast ratio: (lighter + 0.05) / (darker + 0.05)
    const blackRatio = (L + 0.05) / 0.05;
    const whiteRatio = 1.05 / (L + 0.05);

    const foreground = blackRatio >= whiteRatio ? '#000000' : '#ffffff';
    const ratio = Math.max(blackRatio, whiteRatio);
    const contrastStr = formatRatio(ratio);
    const wcagAA = ratio >= 4.5 ? 'pass' : 'fail';
    const wcagAAA = ratio >= 7 ? 'pass' : 'fail';

    const kvOptions: Record<string, string> = {
      Background: normalized,
      Foreground: foreground,
      Contrast: contrastStr,
      'WCAG AA': wcagAA,
      'WCAG AAA': wcagAAA,
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Readable Text Color', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default OnColorBoxSource;
