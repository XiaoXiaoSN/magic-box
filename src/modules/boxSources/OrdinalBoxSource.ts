import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

/** returns the English ordinal suffix for a non-negative integer string */
function ordinalSuffix(n: number): string {
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  switch (abs % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export const OrdinalBoxSource = {
  name: 'Ordinal',
  description: 'Convert an integer to its ordinal form (e.g. 21 → 21st).',
  defaultInput: '21 ::ordinal',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ordinal')) return [];

    const raw = trim(input);
    // accept optional leading minus, then digits only, capped at MAX_DIGITS total digits
    if (!/^-?\d{1,16}$/.test(raw)) return [];

    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return [];

    const suffix = ordinalSuffix(n);
    const ordinal = `${n}${suffix}`;

    return [
      new BoxBuilder('Ordinal', '')
        .setOptions({ Ordinal: ordinal, Suffix: suffix })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default OrdinalBoxSource;
