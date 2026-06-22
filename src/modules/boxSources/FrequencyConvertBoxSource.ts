import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// unit (normalized) -> hertz
const TO_HZ: Record<string, number> = {
  hz: 1,
  khz: 1e3,
  mhz: 1e6,
  ghz: 1e9,
  thz: 1e12,
};

const BOX_NAME = 'Frequency Convert';

const FORMAT_ERROR_MSG =
  'Invalid input. Expected format: <number> <unit>\n' +
  'Supported units: Hz, kHz, MHz, GHz, THz\n' +
  'Example: 2.4 GHz';

/** renders key-value record as plaintext for headless consumers */
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/**
 * formats a frequency/period number with integer-exact display when possible,
 * 6-decimal fixed notation for normal ranges, or exponential for extremes.
 */
function fmtNum(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-4) {
    return n.toExponential(6);
  }
  // use integer if it rounds exactly
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(6).replace(/\.?0+$/, '');
}

export const FrequencyConvertBoxSource = {
  name: 'Frequency Convert',
  description:
    'Convert a frequency between Hz, kHz, MHz, GHz, THz and its period.',
  defaultInput: '2.4 GHz ::frequency',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'frequency', 'freq')) return [];

    const raw = trim(input);
    if (raw.length > 64) {
      // prose message → leave the template undefined (DefaultBoxTemplate)
      // so it renders; a KeyValue template with no options would show blank
      return [
        new BoxBuilder(BOX_NAME, FORMAT_ERROR_MSG)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // parse "<number> <unit>", allowing scientific notation in the number
    const match = raw.match(
      /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s+(\S+)$/,
    );
    if (!match) {
      return [
        new BoxBuilder(BOX_NAME, FORMAT_ERROR_MSG)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = Number.parseFloat(match[1]);
    const unitKey = match[2].toLowerCase();

    if (Number.isNaN(value) || !(unitKey in TO_HZ)) {
      return [
        new BoxBuilder(BOX_NAME, FORMAT_ERROR_MSG)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const hz = value * TO_HZ[unitKey];

    // period is only meaningful for positive frequency
    const periodSec = hz > 0 ? 1 / hz : null;

    const kv: Record<string, string> = {
      Input: `${value} ${match[2]}`,
      Hz: fmtNum(hz),
      kHz: fmtNum(hz / 1e3),
      MHz: fmtNum(hz / 1e6),
      GHz: fmtNum(hz / 1e9),
      THz: fmtNum(hz / 1e12),
    };

    if (periodSec !== null) {
      kv.Period = `${fmtNum(periodSec)} s`;
    }

    return [
      new BoxBuilder(BOX_NAME, kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default FrequencyConvertBoxSource;
