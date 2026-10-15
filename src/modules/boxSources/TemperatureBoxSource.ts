import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import {
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
  keyValueBox,
} from '@modules/Box';

const Priority = 10;

// strips trailing decimal zeros, e.g. 100.00 → '100', 37.78 → '37.78'
function formatValue(n: number): string {
  return Number.parseFloat(n.toFixed(2)).toString();
}

// converts celsius to all three scales and returns formatted strings
function fromCelsius(c: number): {
  celsius: string;
  fahrenheit: string;
  kelvin: string;
} {
  return {
    celsius: formatValue(c),
    fahrenheit: formatValue(c * (9 / 5) + 32),
    kelvin: formatValue(c + 273.15),
  };
}

const INPUT_REGEX = /^(-?\d+(?:\.\d+)?)\s*°?\s*([cCfFkK])?$/;

// absolute zero in celsius; nothing colder is physically meaningful
const ABSOLUTE_ZERO_C = -273.15;
const ABSOLUTE_ZERO_BY_UNIT: Record<string, number> = {
  c: ABSOLUTE_ZERO_C,
  f: -459.67,
  k: 0,
};
const UNIT_ALIASES: Record<string, string> = {
  c: 'c',
  celsius: 'c',
  f: 'f',
  fahrenheit: 'f',
  k: 'k',
  kelvin: 'k',
};

export const TemperatureBoxSource = {
  defaultDisabled: true,
  name: 'Temperature',
  description:
    'Convert a temperature between Celsius, Fahrenheit and Kelvin. e.g. "100C ::temp".',
  defaultInput: '100C\n::temp',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'temp', 'temperature')) return [];

    const trimmed = trim(input);
    // no valid temperature string is this long; bound regex work
    if (trimmed.length > 50) return [];
    const match = INPUT_REGEX.exec(trimmed);
    if (!match) return [];

    const value = Number.parseFloat(match[1]);

    // unit from input suffix, then option value, then default to celsius
    let unit = match[2]?.toLowerCase() ?? null;
    if (!unit) {
      const optVal = extractOptionKeys(options, 'temperature', 'temp');
      const requestedUnit =
        typeof optVal === 'string' ? optVal.trim().toLowerCase() : 'c';
      unit = UNIT_ALIASES[requestedUnit] ?? '';
      if (!unit) {
        return [
          errorBox(
            'Temperature',
            `Unknown temperature unit "${requestedUnit}". Use Celsius, Fahrenheit, or Kelvin.`,
            { priority: this.priority },
          ),
        ];
      }
    } else {
      unit = UNIT_ALIASES[unit] ?? '';
    }

    // compute celsius as pivot
    let celsius: number;
    if (unit === 'f') {
      celsius = (value - 32) * (5 / 9);
    } else if (unit === 'k') {
      celsius = value - 273.15;
    } else {
      celsius = value;
    }

    // compare in the source unit so exact physical boundaries remain valid
    if (value < ABSOLUTE_ZERO_BY_UNIT[unit]) {
      return [
        errorBox(
          'Temperature',
          `Temperature is below absolute zero for ${unit.toUpperCase()}.`,
          { priority: this.priority },
        ),
      ];
    }

    const { celsius: c, fahrenheit: f, kelvin: k } = fromCelsius(celsius);

    const kvOptions: Record<string, string> = {
      Celsius: c,
      Fahrenheit: f,
      Kelvin: k,
    };

    return [
      keyValueBox('keyValue', 'Temperature', kvOptions, {
        priority: this.priority,
      }),
    ];
  },
};

export default TemperatureBoxSource;
