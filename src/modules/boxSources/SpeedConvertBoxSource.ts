import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

import {
  createUnitLookup,
  formatConversionValue,
  parseStrictNumber,
  resolveUnit,
  SPEED_UNIT_DEFINITIONS,
  STRICT_NUMBER_TOKEN,
} from './UnitConversionData';

// render key/value pairs as `k: v` lines for the headless/TUI plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const UNIT_LOOKUP = createUnitLookup(SPEED_UNIT_DEFINITIONS);
const SUPPORTED_UNITS = SPEED_UNIT_DEFINITIONS.map(
  ({ outputSymbol, symbol }) => outputSymbol ?? symbol,
).join(', ');
const PARSE_RE = new RegExp(
  `^(${STRICT_NUMBER_TOKEN})\\s*([a-zA-Z]+(?:/[a-zA-Z]+)?)$`,
  'i',
);

export const SpeedConvertBoxSource = {
  defaultDisabled: true,
  name: 'Speed Convert',
  description: 'Convert a speed between m/s, km/h, mph, knots, and ft/s.',
  defaultInput: '100 km/h\n::speed',
  tag: '#',
  kind: 'Convert',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'speed')) return [];

    const trimmed = trim(input).slice(0, 64);
    const match = PARSE_RE.exec(trimmed);

    if (!match) {
      const errorOutput: Record<string, string> = {
        Input: trimmed,
        Error: 'Invalid format. Expected: <number> <unit>',
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Speed Convert', kvToPlaintext(errorOutput))
          .setOptions(errorOutput)
          .setView('keyValue')

          .build(),
      ];
    }

    const value = parseStrictNumber(match[1]);
    const definition = resolveUnit(UNIT_LOOKUP, match[2]);
    if (value === null) {
      const errorOutput: Record<string, string> = {
        Input: trimmed,
        Error: 'Invalid format. Expected: <number> <unit>',
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Speed Convert', kvToPlaintext(errorOutput))
          .setOptions(errorOutput)
          .setView('keyValue')

          .build(),
      ];
    }

    if (definition === null) {
      const errorOutput: Record<string, string> = {
        Input: trimmed,
        Error: `Unknown unit: "${match[2].trim()}"`,
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Speed Convert', kvToPlaintext(errorOutput))
          .setOptions(errorOutput)
          .setView('keyValue')

          .build(),
      ];
    }

    // convert to m/s first, then to each output unit
    const ms = value * definition.factor;

    const kvOutput: Record<string, string> = {
      Input: trimmed,
    };
    for (const output of SPEED_UNIT_DEFINITIONS) {
      kvOutput[output.outputSymbol ?? output.symbol] = formatConversionValue(
        ms / output.factor,
      );
    }

    return [
      new BoxBuilder('Speed Convert', kvToPlaintext(kvOutput))
        .setOptions(kvOutput)
        .setView('keyValue')

        .build(),
    ];
  },
};

export default SpeedConvertBoxSource;
