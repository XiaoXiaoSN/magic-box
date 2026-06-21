import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// the standard Damm operation table (totally anti-symmetric quasigroup, order 10)
const TABLE: number[][] = [
  [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
  [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
  [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
  [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
  [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
  [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
  [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
  [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
  [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
  [2, 5, 8, 1, 4, 3, 6, 7, 9, 0],
];

// runs the Damm algorithm over a digit string and returns the interim value;
// a final interim of 0 means the input is Damm-valid (already includes a correct check digit)
function dammInterim(digits: string): number {
  let interim = 0;
  for (const ch of digits) {
    const d = Number.parseInt(ch, 10);
    interim = TABLE[interim][d];
  }
  return interim;
}

export const DammBoxSource = {
  name: 'Damm Check',
  description:
    'Compute a Damm check digit for a number, or validate a number that already includes one.',
  defaultInput: '572 ::damm',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'damm')) return [];

    const cleaned = trim(input);

    if (!/^\d+$/.test(cleaned) || cleaned.length === 0) {
      const reason = 'Input must contain digits only (0–9).';
      return [
        new BoxBuilder('Damm Check', reason)
          .setOptions({ Error: reason })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    if (cleaned.length > 1000) {
      const reason = 'Input exceeds maximum length of 1000 digits.';
      return [
        new BoxBuilder('Damm Check', reason)
          .setOptions({ Error: reason })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const interim = dammInterim(cleaned);
    const isValid = interim === 0;
    // the interim over the input equals the check digit to append, which drives interim to 0
    const checkDigit = String(interim);

    const kvOptions: Record<string, string> = {
      Input: cleaned,
      Valid: String(isValid),
      'Check Digit': checkDigit,
    };

    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Damm Check', plaintextOutput)
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DammBoxSource;
