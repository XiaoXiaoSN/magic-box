import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// maps all accepted unit spellings to a canonical unit name
const unitAliases: Record<string, string> = {
  deg: 'deg',
  degree: 'deg',
  degrees: 'deg',
  '°': 'deg',
  rad: 'rad',
  radian: 'rad',
  radians: 'rad',
  grad: 'grad',
  gradian: 'grad',
  gradians: 'grad',
  gon: 'grad',
  turn: 'turn',
  turns: 'turn',
  rev: 'turn',
};

// converts a value in the given canonical unit to degrees
function toDegrees(value: number, unit: string): number {
  switch (unit) {
    case 'deg':
      return value;
    case 'rad':
      return value * (180 / Math.PI);
    case 'grad':
      return value * 0.9;
    case 'turn':
      return value * 360;
    default:
      return value;
  }
}

// formats a number to ~6 significant figures and strips trailing zeros
function formatSigFigs(n: number): string {
  // toPrecision(7) gives 7 sig figs; we use 7 to keep the 6th digit accurate
  const formatted = n.toPrecision(7);
  // remove trailing zeros after decimal point
  if (formatted.includes('.')) {
    return formatted.replace(/\.?0+$/, '');
  }
  return formatted;
}

const INPUT_MAX_LEN = 64;
const UNIT_REGEX = /^(-?\d+(?:\.\d+)?)\s*([a-z°]+)$/i;
const VALID_UNITS = Object.keys(unitAliases).join(', ');

export const AngleConvertBoxSource = {
  name: 'Angle Convert',
  description:
    'Convert an angle between degrees, radians, gradians, and turns. e.g. "180 deg ::angle".',
  defaultInput: '180 deg ::angle',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'angle')) return [];

    const trimmed = trim(input).slice(0, INPUT_MAX_LEN);
    const match = UNIT_REGEX.exec(trimmed);

    if (!match) {
      // invalid format — return an informational box
      const errorContent = `Input: ${trimmed}
Error: unable to parse input
Format: <number> <unit>
Units: ${VALID_UNITS}`;
      return [
        new BoxBuilder('Angle Convert', errorContent)
          .setOptions({
            Input: trimmed,
            Error: 'unable to parse input',
            Format: '<number> <unit>',
            Units: VALID_UNITS,
          })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = Number.parseFloat(match[1]);
    const rawUnit = match[2].toLowerCase();
    const canonicalUnit = unitAliases[rawUnit];

    if (!canonicalUnit) {
      const errorContent = `Input: ${trimmed}
Error: unrecognized unit "${match[2]}"
Units: ${VALID_UNITS}`;
      return [
        new BoxBuilder('Angle Convert', errorContent)
          .setOptions({
            Input: trimmed,
            Error: `unrecognized unit "${match[2]}"`,
            Units: VALID_UNITS,
          })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const degrees = toDegrees(value, canonicalUnit);
    const radians = degrees * (Math.PI / 180);
    const gradians = degrees / 0.9;
    const turns = degrees / 360;

    const degreesStr = formatSigFigs(degrees);
    const radiansStr = formatSigFigs(radians);
    const gradiansStr = formatSigFigs(gradians);
    const turnsStr = formatSigFigs(turns);

    const content = `Input: ${trimmed}
Degrees: ${degreesStr}
Radians: ${radiansStr}
Gradians: ${gradiansStr}
Turns: ${turnsStr}`;

    return [
      new BoxBuilder('Angle Convert', content)
        .setOptions({
          Input: trimmed,
          Degrees: degreesStr,
          Radians: radiansStr,
          Gradians: gradiansStr,
          Turns: turnsStr,
        })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default AngleConvertBoxSource;
