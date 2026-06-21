import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// the full CSS Color Module Level 4 named-color list mapped to 6-digit lowercase hex (no leading #)
const NAMED: Record<string, string> = {
  aliceblue: 'f0f8ff',
  antiquewhite: 'faebd7',
  aqua: '00ffff',
  aquamarine: '7fffd4',
  azure: 'f0ffff',
  beige: 'f5f5dc',
  bisque: 'ffe4c4',
  black: '000000',
  blanchedalmond: 'ffebcd',
  blue: '0000ff',
  blueviolet: '8a2be2',
  brown: 'a52a2a',
  burlywood: 'deb887',
  cadetblue: '5f9ea0',
  chartreuse: '7fff00',
  chocolate: 'd2691e',
  coral: 'ff7f50',
  cornflowerblue: '6495ed',
  cornsilk: 'fff8dc',
  crimson: 'dc143c',
  cyan: '00ffff',
  darkblue: '00008b',
  darkcyan: '008b8b',
  darkgoldenrod: 'b8860b',
  darkgray: 'a9a9a9',
  darkgreen: '006400',
  darkgrey: 'a9a9a9',
  darkkhaki: 'bdb76b',
  darkmagenta: '8b008b',
  darkolivegreen: '556b2f',
  darkorange: 'ff8c00',
  darkorchid: '9932cc',
  darkred: '8b0000',
  darksalmon: 'e9967a',
  darkseagreen: '8fbc8f',
  darkslateblue: '483d8b',
  darkslategray: '2f4f4f',
  darkslategrey: '2f4f4f',
  darkturquoise: '00ced1',
  darkviolet: '9400d3',
  deeppink: 'ff1493',
  deepskyblue: '00bfff',
  dimgray: '696969',
  dimgrey: '696969',
  dodgerblue: '1e90ff',
  firebrick: 'b22222',
  floralwhite: 'fffaf0',
  forestgreen: '228b22',
  fuchsia: 'ff00ff',
  gainsboro: 'dcdcdc',
  ghostwhite: 'f8f8ff',
  gold: 'ffd700',
  goldenrod: 'daa520',
  gray: '808080',
  green: '008000',
  greenyellow: 'adff2f',
  grey: '808080',
  honeydew: 'f0fff0',
  hotpink: 'ff69b4',
  indianred: 'cd5c5c',
  indigo: '4b0082',
  ivory: 'fffff0',
  khaki: 'f0e68c',
  lavender: 'e6e6fa',
  lavenderblush: 'fff0f5',
  lawngreen: '7cfc00',
  lemonchiffon: 'fffacd',
  lightblue: 'add8e6',
  lightcoral: 'f08080',
  lightcyan: 'e0ffff',
  lightgoldenrodyellow: 'fafad2',
  lightgray: 'd3d3d3',
  lightgreen: '90ee90',
  lightgrey: 'd3d3d3',
  lightpink: 'ffb6c1',
  lightsalmon: 'ffa07a',
  lightseagreen: '20b2aa',
  lightskyblue: '87cefa',
  lightslategray: '778899',
  lightslategrey: '778899',
  lightsteelblue: 'b0c4de',
  lightyellow: 'ffffe0',
  lime: '00ff00',
  limegreen: '32cd32',
  linen: 'faf0e6',
  magenta: 'ff00ff',
  maroon: '800000',
  mediumaquamarine: '66cdaa',
  mediumblue: '0000cd',
  mediumorchid: 'ba55d3',
  mediumpurple: '9370db',
  mediumseagreen: '3cb371',
  mediumslateblue: '7b68ee',
  mediumspringgreen: '00fa9a',
  mediumturquoise: '48d1cc',
  mediumvioletred: 'c71585',
  midnightblue: '191970',
  mintcream: 'f5fffa',
  mistyrose: 'ffe4e1',
  moccasin: 'ffe4b5',
  navajowhite: 'ffdead',
  navy: '000080',
  oldlace: 'fdf5e6',
  olive: '808000',
  olivedrab: '6b8e23',
  orange: 'ffa500',
  orangered: 'ff4500',
  orchid: 'da70d6',
  palegoldenrod: 'eee8aa',
  palegreen: '98fb98',
  paleturquoise: 'afeeee',
  palevioletred: 'db7093',
  papayawhip: 'ffefd5',
  peachpuff: 'ffdab9',
  peru: 'cd853f',
  pink: 'ffb6c1',
  plum: 'dda0dd',
  powderblue: 'b0e0e6',
  purple: '800080',
  rebeccapurple: '663399',
  red: 'ff0000',
  rosybrown: 'bc8f8f',
  royalblue: '4169e1',
  saddlebrown: '8b4513',
  salmon: 'fa8072',
  sandybrown: 'f4a460',
  seagreen: '2e8b57',
  seashell: 'fff5ee',
  sienna: 'a0522d',
  silver: 'c0c0c0',
  skyblue: '87ceeb',
  slateblue: '6a5acd',
  slategray: '708090',
  slategrey: '708090',
  snow: 'fffafa',
  springgreen: '00ff7f',
  steelblue: '4682b4',
  tan: 'd2b48c',
  teal: '008080',
  thistle: 'd8bfd8',
  tomato: 'ff6347',
  turquoise: '40e0d0',
  violet: 'ee82ee',
  wheat: 'f5deb3',
  white: 'ffffff',
  whitesmoke: 'f5f5f5',
  yellow: 'ffff00',
  yellowgreen: '9acd32',
};

// build a reverse map from hex to canonical name (first entry wins for duplicates like aqua/cyan)
const HEX_TO_NAME: Record<string, string> = {};
for (const [name, hex] of Object.entries(NAMED)) {
  if (!(hex in HEX_TO_NAME)) {
    HEX_TO_NAME[hex] = name;
  }
}

// expand a 3-digit hex string to 6 digits
function expandShortHex(hex: string): string {
  if (hex.length === 3) {
    return hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return hex;
}

// parse a #rgb or #rrggbb string into [r, g, b] components, returns null on failure
function parseHex(raw: string): [number, number, number] | null {
  const stripped = raw.startsWith('#') ? raw.slice(1) : raw;
  const expanded = expandShortHex(stripped);
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return [r, g, b];
}

// find the nearest CSS named color by squared Euclidean RGB distance
function nearestName(r: number, g: number, b: number): string {
  let bestName = '';
  let bestDist = Number.MAX_SAFE_INTEGER;
  for (const [name, hex] of Object.entries(NAMED)) {
    const nr = Number.parseInt(hex.slice(0, 2), 16);
    const ng = Number.parseInt(hex.slice(2, 4), 16);
    const nb = Number.parseInt(hex.slice(4, 6), 16);
    const dist = (r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestName = name;
    }
  }
  return bestName;
}

export const CssColorNameBoxSource = {
  name: 'CSS Color Name',
  description:
    'Convert a CSS named color to hex, or a hex color to the nearest CSS named color.',
  defaultInput: 'tomato ::colorname',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'colorname', 'csscolor')) return [];

    const raw = trim(input);

    if (raw.startsWith('#')) {
      // hex → nearest name
      const lower = raw.toLowerCase();
      const stripped = lower.slice(1);
      const expanded = expandShortHex(stripped);

      const components = parseHex(raw);
      if (!components) return [];
      const [r, g, b] = components;

      const name = nearestName(r, g, b);
      const nameHex = NAMED[name];
      const isExact = nameHex === expanded;

      const box = new BoxBuilder('CSS Color Name', '')
        .setOptions({
          Hex: `#${expanded}`,
          'Nearest Name': name,
          'Name Hex': `#${nameHex}`,
          Exact: isExact ? 'true' : 'false',
        })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(Priority)
        .build();

      return [box];
    }

    // name → hex
    const nameLower = raw.toLowerCase();
    const hex = NAMED[nameLower];

    if (!hex) {
      // unknown name — return a box explaining the color isn't a CSS named color
      const box = new BoxBuilder('CSS Color Name', '')
        .setOptions({
          Name: raw,
          Error: `'${raw}' is not a CSS named color`,
        })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(Priority)
        .build();

      return [box];
    }

    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);

    const box = new BoxBuilder('CSS Color Name', '')
      .setOptions({
        Name: nameLower,
        Hex: `#${hex}`,
        RGB: `rgb(${r}, ${g}, ${b})`,
      })
      .setTemplate(KeyValueBoxTemplate)
      .setPriority(Priority)
      .build();

    return [box];
  },
};

export default CssColorNameBoxSource;
