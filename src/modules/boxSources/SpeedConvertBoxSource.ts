import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// render key/value pairs as `k: v` lines for the headless/TUI plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// unit alias -> m/s conversion factor
const TO_MS: Record<string, number> = {
  'm/s': 1,
  mps: 1,
  'km/h': 1000 / 3600,
  kmh: 1000 / 3600,
  kph: 1000 / 3600,
  mph: 1609.344 / 3600,
  knot: 1852 / 3600,
  kn: 1852 / 3600,
  knots: 1852 / 3600,
  'ft/s': 0.3048,
  fps: 0.3048,
};

// canonical output units in display order
const OUTPUT_UNITS: Array<[string, number]> = [
  ['m/s', 1],
  ['km/h', 3600 / 1000],
  ['mph', 3600 / 1609.344],
  ['knot', 3600 / 1852],
  ['ft/s', 1 / 0.3048],
];

// formats to integer string if exact, otherwise rounds to 6 decimal places and strips trailing zeros
function formatValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number.parseFloat(n.toFixed(6)));
}

const SUPPORTED_UNITS = Object.keys(TO_MS).join(', ');

export const SpeedConvertBoxSource = {
  defaultDisabled: true,
  name: 'Speed Convert',
  description: 'Convert a speed between m/s, km/h, mph, knots, and ft/s.',
  defaultInput: '100 km/h ::speed',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'speed')) return [];

    const trimmed = trim(input).slice(0, 64);
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(.+)$/);

    if (!match) {
      const errorOutput: Record<string, string> = {
        Input: trimmed,
        Error: 'Invalid format. Expected: <number> <unit>',
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Speed Convert', kvToPlaintext(errorOutput))
          .setOptions(errorOutput)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = Number.parseFloat(match[1]);
    const unitRaw = match[2].trim().toLowerCase();

    const factor = TO_MS[unitRaw];
    if (factor === undefined) {
      const errorOutput: Record<string, string> = {
        Input: trimmed,
        Error: `Unknown unit: "${match[2].trim()}"`,
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Speed Convert', kvToPlaintext(errorOutput))
          .setOptions(errorOutput)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // convert to m/s first, then to each output unit
    const ms = value * factor;

    const kvOutput: Record<string, string> = {
      Input: trimmed,
    };
    for (const [unit, fromMs] of OUTPUT_UNITS) {
      kvOutput[unit] = formatValue(ms * fromMs);
    }

    return [
      new BoxBuilder('Speed Convert', kvToPlaintext(kvOutput))
        .setOptions(kvOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SpeedConvertBoxSource;
