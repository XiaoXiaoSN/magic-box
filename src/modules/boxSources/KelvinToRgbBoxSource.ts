import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// min/max valid kelvin range per the Tanner Helland approximation
const MIN_KELVIN = 1000;
const MAX_KELVIN = 40000;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// clamp a float to [0, 255] and round to integer
function clampChannel(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

// Tanner Helland algorithm: convert a Kelvin temperature to approximate RGB
// https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html
function kelvinToRgb(kelvin: number): RgbColor {
  const temp = kelvin / 100;

  let r: number;
  if (temp <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * (temp - 60) ** -0.1332047592;
  }

  let g: number;
  if (temp <= 66) {
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    g = 288.1221695283 * (temp - 60) ** -0.0755148492;
  }

  let b: number;
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  }

  return { r: clampChannel(r), g: clampChannel(g), b: clampChannel(b) };
}

// format a channel byte as a two-digit hex string
function toHex(channel: number): string {
  return channel.toString(16).padStart(2, '0');
}

export const KelvinToRgbBoxSource = {
  name: 'Color Temperature',
  description:
    'Convert a color temperature in Kelvin (1000–40000) to an approximate RGB/hex color.',
  defaultInput: '6500 ::kelvin',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'kelvin', 'colortemp')) return [];

    const raw = trim(input).replace(/[Kk]$/, '').trim();

    // input too long or not a plain integer
    if (raw.length > 8 || !/^\d+$/.test(raw)) {
      return [
        new BoxBuilder(
          'Color Temperature',
          'Please provide a valid Kelvin value (e.g. 6500 ::kelvin)',
        )
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({
            Error: 'A numeric Kelvin value is required (1000–40000)',
          })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const rawK = Number.parseInt(raw, 10);
    const kelvin = Math.min(MAX_KELVIN, Math.max(MIN_KELVIN, rawK));

    const { r, g, b } = kelvinToRgb(kelvin);
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    const kv = {
      Kelvin: `${kelvin}K`,
      RGB: `rgb(${r}, ${g}, ${b})`,
      Hex: hex,
    };
    const plaintext = Object.entries(kv)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Color Temperature', plaintext)
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default KelvinToRgbBoxSource;
