import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

import {
  createUnitLookup,
  formatConversionValue,
  POWER_UNIT_DEFINITIONS,
  parseStrictNumber,
  resolveUnit,
  STRICT_NUMBER_TOKEN,
} from './UnitConversionData';

const Priority = 10;

const UNIT_LOOKUP = createUnitLookup(POWER_UNIT_DEFINITIONS);
const SUPPORTED_UNITS = POWER_UNIT_DEFINITIONS.map(
  ({ outputSymbol, symbol }) => outputSymbol ?? symbol,
).join(', ');

// builds a plaintext "key: value" block suitable for headless rendering
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const PARSE_RE = new RegExp(
  `^(${STRICT_NUMBER_TOKEN})\\s*([a-zA-Z]+(?:/[a-zA-Z]+)?)$`,
  'i',
);

export const PowerConvertBoxSource = {
  defaultDisabled: true,
  name: 'Power Convert',
  description: `Convert power between ${SUPPORTED_UNITS}.`,
  defaultInput: '100 hp\n::power',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'power')) return [];

    const raw = trim(input).slice(0, 64);
    const match = PARSE_RE.exec(raw);

    if (!match) {
      // invalid — return a box listing supported units
      const pairs = {
        Error: 'Invalid format. Expected: <number> <unit>',
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Power Convert', kvToPlaintext(pairs))
          .setView('keyValue')
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = parseStrictNumber(match[1]);
    const definition = resolveUnit(UNIT_LOOKUP, match[2]);

    if (value === null) {
      const pairs = {
        Error: 'Invalid format. Expected: <number> <unit>',
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Power Convert', kvToPlaintext(pairs))
          .setView('keyValue')
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    if (definition === null) {
      // unknown unit — return a box listing supported units
      const pairs = {
        Error: `Unknown unit: ${match[2]}`,
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Power Convert', kvToPlaintext(pairs))
          .setView('keyValue')
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const watts = value * definition.factor;

    // build ordered key-value pairs for all output units + the original input
    const kvPairs: Record<string, string> = {
      Input: raw,
    };

    for (const output of POWER_UNIT_DEFINITIONS) {
      kvPairs[output.outputSymbol ?? output.symbol] = formatConversionValue(
        watts / output.factor,
      );
    }

    const plaintext = kvToPlaintext(kvPairs);

    return [
      new BoxBuilder('Power Convert', plaintext)
        .setView('keyValue')
        .setOptions(kvPairs)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PowerConvertBoxSource;
