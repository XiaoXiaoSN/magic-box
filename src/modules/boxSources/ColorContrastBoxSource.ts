import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// parses #RGB or #RRGGBB into [r, g, b] integers 0-255, or null if invalid
function parseHexColor(raw: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(raw);
  if (!m) return null;
  const h = m[1];
  if (h.length === 3) {
    return [
      Number.parseInt(h[0] + h[0], 16),
      Number.parseInt(h[1] + h[1], 16),
      Number.parseInt(h[2] + h[2], 16),
    ];
  }
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

// WCAG 2.x relative luminance for a single channel value in [0,255]
function channelLuminance(c: number): number {
  const sRGB = c / 255;
  return sRGB <= 0.04045 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

// formats the contrast ratio in WCAG 'N:1' form (e.g. '21:1', '4.48:1')
function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}:1` : `${rounded.toFixed(2)}:1`;
}

function passOrFail(ratio: number, threshold: number): string {
  return ratio >= threshold ? 'pass' : 'fail';
}

export const ColorContrastBoxSource = {
  name: 'Color Contrast',
  description:
    'WCAG contrast ratio between two hex colors (space- or newline-separated).',
  defaultInput: '#000000 #ffffff ::contrast',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'contrast')) return [];

    const parts = trim(input).split(/\s+/).filter(Boolean);

    // when not exactly two tokens, return an explanatory box
    if (parts.length !== 2) {
      const errorOutput = 'two hex colors required (e.g. #000000 #ffffff)';
      return [
        new BoxBuilder('Color Contrast', errorOutput)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Error: 'two hex colors are required' })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const color1 = parseHexColor(parts[0]);
    const color2 = parseHexColor(parts[1]);

    if (color1 === null || color2 === null) {
      const errorOutput = 'invalid hex color — use #RGB or #RRGGBB format';
      return [
        new BoxBuilder('Color Contrast', errorOutput)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({
            Error: 'invalid hex color — use #RGB or #RRGGBB format',
          })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const L1 = relativeLuminance(...color1);
    const L2 = relativeLuminance(...color2);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    const ratioStr = formatRatio(ratio);

    const kvOptions: Record<string, string> = {
      Ratio: ratioStr,
      'AA Normal': passOrFail(ratio, 4.5),
      'AA Large': passOrFail(ratio, 3),
      'AAA Normal': passOrFail(ratio, 7),
      'AAA Large': passOrFail(ratio, 4.5),
    };

    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Color Contrast', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ColorContrastBoxSource;
