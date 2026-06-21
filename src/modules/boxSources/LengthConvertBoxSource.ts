import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// unit -> meters conversion factor
const TO_M: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
  nmi: 1852,
};

// display order for output keys
const UNIT_ORDER = ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi', 'nmi'];

const PARSE_RE = /^(-?\d+(?:\.\d+)?)\s*([a-z]+)$/i;

// format a number to up to 6 significant figures, stripping trailing zeros
function formatValue(n: number): string {
  // handle exact integers cleanly (sig-figs would corrupt large exact values)
  if (Number.isInteger(n)) return String(n);

  // round to 6 decimal places, then strip trailing zeros
  return String(Number.parseFloat(n.toFixed(6)));
}

// render key/value pairs as `k: v` lines for the headless/TUI plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const LengthConvertBoxSource = {
  name: 'Length Convert',
  description:
    'Convert a length between units. e.g. "1 mi ::length" or "5 km ::length=mi".',
  defaultInput: '1 mi ::length',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'length')) return [];

    const raw = trim(input).slice(0, 64);
    const match = PARSE_RE.exec(raw);

    if (!match) {
      // invalid format — return an explanatory box
      const kv: Record<string, string> = {
        Error: 'Invalid format. Expected: <number> <unit>',
        'Supported Units': UNIT_ORDER.join(', '),
        Example: '1 mi, 5.5 km, -2.5 ft',
      };
      return [
        new BoxBuilder('Length Convert', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = Number.parseFloat(match[1]);
    const unitRaw = match[2].toLowerCase();

    if (!(unitRaw in TO_M)) {
      // unknown unit — return an explanatory box
      const kv: Record<string, string> = {
        Error: `Unknown unit: "${unitRaw}"`,
        'Supported Units': UNIT_ORDER.join(', '),
        Example: '1 mi, 5.5 km, -2.5 ft',
      };
      return [
        new BoxBuilder('Length Convert', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const meters = value * TO_M[unitRaw];

    // optional target unit from option value, e.g. ::length=km
    const targetRaw = extractOptionKeys(options, 'length');
    const target =
      typeof targetRaw === 'string' && targetRaw.toLowerCase() in TO_M
        ? targetRaw.toLowerCase()
        : null;

    const kv: Record<string, string> = {
      Input: `${formatValue(value)} ${unitRaw}`,
    };

    for (const unit of UNIT_ORDER) {
      kv[unit] = formatValue(meters / TO_M[unit]);
    }

    if (target !== null) {
      kv.Result = `${formatValue(meters / TO_M[target])} ${target}`;
    }

    return [
      new BoxBuilder('Length Convert', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default LengthConvertBoxSource;
