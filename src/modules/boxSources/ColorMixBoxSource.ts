import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

// parses #RGB or #RRGGBB hex strings into {r,g,b}, returns null on failure
function parseHex(raw: string): Rgb | null {
  const s = trim(raw).toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(s);
  if (short) {
    const [, hex] = short;
    return {
      r: Number.parseInt(hex[0] + hex[0], 16),
      g: Number.parseInt(hex[1] + hex[1], 16),
      b: Number.parseInt(hex[2] + hex[2], 16),
    };
  }
  const full = /^#([0-9a-f]{6})$/.exec(s);
  if (full) {
    const [, hex] = full;
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
}

// formats an {r,g,b} value as a lowercase #rrggbb string
function toHex({ r, g, b }: Rgb): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// linear RGB blend (not gamma-corrected): mixedChannel = round(c1*(1-t) + c2*t)
function blendChannel(c1: number, c2: number, t: number): number {
  return Math.round(c1 * (1 - t) + c2 * t);
}

export const ColorMixBoxSource = {
  name: 'Color Mix',
  description:
    'Blend two hex colors. Two colors in the input; optional ::mix=PERCENT (weight toward the second color, default 50).',
  defaultInput: '#ff0000 #0000ff ::mix',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'mix', 'blend')) return [];

    const parts = trim(input)
      .split(/\s+/)
      .filter((p) => p.startsWith('#'));

    if (parts.length !== 2) {
      const box = new BoxBuilder(
        'Color Mix',
        'Two hex colors are required (e.g. #ff0000 #0000ff).',
      )
        .setTemplate(KeyValueBoxTemplate)
        .setOptions({
          Error: 'Two hex colors are required (e.g. #ff0000 #0000ff).',
        })
        .setPriority(this.priority)
        .build();
      return [box];
    }

    const c1 = parseHex(parts[0]);
    const c2 = parseHex(parts[1]);

    if (!c1 || !c2) {
      const invalid = !c1 ? parts[0] : parts[1];
      const box = new BoxBuilder(
        'Color Mix',
        `Invalid hex color: ${invalid}. Use #RGB or #RRGGBB format.`,
      )
        .setTemplate(KeyValueBoxTemplate)
        .setOptions({
          Error: `Invalid hex color: ${invalid}. Use #RGB or #RRGGBB format.`,
        })
        .setPriority(this.priority)
        .build();
      return [box];
    }

    const rawOption = extractOptionKeys(options, 'mix', 'blend');
    let ratio = 50;
    if (typeof rawOption === 'string') {
      const parsed = Number.parseFloat(rawOption);
      if (!Number.isNaN(parsed)) {
        ratio = Math.min(100, Math.max(0, parsed));
      }
    }

    const t = ratio / 100;
    const mixed: Rgb = {
      r: blendChannel(c1.r, c2.r, t),
      g: blendChannel(c1.g, c2.g, t),
      b: blendChannel(c1.b, c2.b, t),
    };

    const color1Hex = toHex(c1);
    const color2Hex = toHex(c2);
    const resultHex = toHex(mixed);

    const kv: Record<string, string> = {
      'Color 1': color1Hex,
      'Color 2': color2Hex,
      Ratio: `${ratio}% toward ${color2Hex}`,
      Result: resultHex,
    };

    const plaintext = Object.entries(kv)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Color Mix', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ColorMixBoxSource;
