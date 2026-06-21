import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length to avoid runaway regexes
const MAX_INPUT_LENGTH = 100;

// matches a plain decimal degree: optional sign, digits, optional decimal
const DECIMAL_RE = /^(-?\d+(?:\.\d+)?)$/;

// matches DMS in various formats, e.g. "40°26'40.3"N" or "40 26 40.3 N" or "40°26'40.3""
// groups: deg, min, sec, optional hemisphere
const DMS_RE = /^(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*([NSEWnsew]?)$/;

interface DmsComponents {
  degrees: number;
  minutes: number;
  seconds: number;
  // sign: +1 or -1 (from input sign or hemisphere)
  sign: number;
}

function decimalToDms(decimal: number): DmsComponents {
  const sign = decimal < 0 ? -1 : 1;
  const abs = Math.abs(decimal);
  const degrees = Math.trunc(abs);
  const minFloat = (abs - degrees) * 60;
  const minutes = Math.trunc(minFloat);
  const seconds = (minFloat - minutes) * 60;
  return { degrees, minutes, seconds, sign };
}

function dmsToDecimal(components: DmsComponents): number {
  const { degrees, minutes, seconds, sign } = components;
  const abs = degrees + minutes / 60 + seconds / 3600;
  return sign * abs;
}

function formatDmsString(components: DmsComponents): string {
  const { degrees, minutes, seconds } = components;
  return `${degrees}°${minutes}'${seconds.toFixed(2)}"`;
}

export const DmsBoxSource = {
  name: 'DMS Coordinates',
  description:
    'Convert a coordinate between decimal degrees and degrees/minutes/seconds (DMS).',
  defaultInput: '40.446195 ::dms',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'dms', 'latlng')) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_INPUT_LENGTH) return [];

    // try decimal degrees first
    const decimalMatch = raw.match(DECIMAL_RE);
    if (decimalMatch) {
      const decimal = Number.parseFloat(decimalMatch[1]);
      if (Number.isNaN(decimal) || decimal < -180 || decimal > 180) return [];

      const components = decimalToDms(decimal);
      const dmsStr = formatDmsString(components);

      // plaintext k:v output
      const content = [
        `Decimal: ${decimal}`,
        `DMS: ${dmsStr}`,
        `Degrees: ${components.degrees}`,
        `Minutes: ${components.minutes}`,
        `Seconds: ${components.seconds.toFixed(2)}`,
      ].join('\n');

      const opts: Record<string, string> = {
        Decimal: String(decimal),
        DMS: dmsStr,
        Degrees: String(components.degrees),
        Minutes: String(components.minutes),
        Seconds: components.seconds.toFixed(2),
      };

      return [
        new BoxBuilder('DMS Coordinates', content)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(opts)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // try DMS string
    const dmsMatch = raw.match(DMS_RE);
    if (dmsMatch) {
      const degrees = Number.parseInt(dmsMatch[1], 10);
      const minutes = Number.parseInt(dmsMatch[2], 10);
      const seconds = Number.parseFloat(dmsMatch[3]);
      const hemisphere = dmsMatch[4].toUpperCase();

      // south and west hemispheres are negative
      const sign = hemisphere === 'S' || hemisphere === 'W' ? -1 : 1;

      const components: DmsComponents = { degrees, minutes, seconds, sign };
      const decimal = dmsToDecimal(components);
      const decimalStr = decimal.toFixed(6);
      const dmsStr = formatDmsString(components);

      const content = [
        `Decimal: ${decimalStr}`,
        `DMS: ${dmsStr}`,
        `Degrees: ${degrees}`,
        `Minutes: ${minutes}`,
        `Seconds: ${seconds.toFixed(2)}`,
      ].join('\n');

      const opts: Record<string, string> = {
        Decimal: decimalStr,
        DMS: dmsStr,
        Degrees: String(degrees),
        Minutes: String(minutes),
        Seconds: seconds.toFixed(2),
      };

      return [
        new BoxBuilder('DMS Coordinates', content)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(opts)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // neither format matched — return a hint box
    const hint =
      'Expected formats:\n  Decimal: 40.446195 or -73.985\n  DMS: 40°26\'40.3"N or 40 26 40.3 N';

    return [
      new BoxBuilder('DMS Coordinates', hint)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions({ Format: 'Decimal or DMS' })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DmsBoxSource;
