import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

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

const INPUT_REGEX = /^(-?\d+(?:\.\d+)?)\s*([cCfFkK])?$/;

export const TemperatureBoxSource = {
  name: 'Temperature',
  description:
    'Convert a temperature between Celsius, Fahrenheit and Kelvin. e.g. "100C ::temp".',
  defaultInput: '100C ::temp',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'temp', 'temperature')) return [];

    const trimmed = trim(input);
    const match = INPUT_REGEX.exec(trimmed);
    if (!match) return [];

    const value = Number.parseFloat(match[1]);

    // unit from input suffix, then option value, then default to celsius
    let unit = match[2]?.toLowerCase() ?? null;
    if (!unit) {
      const optVal = extractOptionKeys(options, 'temp', 'temperature');
      unit = typeof optVal === 'string' ? optVal.toLowerCase() : 'c';
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

    const { celsius: c, fahrenheit: f, kelvin: k } = fromCelsius(celsius);

    const kvOptions: Record<string, string> = {
      Celsius: c,
      Fahrenheit: f,
      Kelvin: k,
    };

    return [
      new BoxBuilder('Temperature', '')
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default TemperatureBoxSource;
