import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// cap iterations to prevent an infinite loop for pathological inputs
const MAX_STEPS = 1_000_000;

// cap sequence display to keep plaintextOutput from being enormous
const MAX_SEQUENCE_DISPLAY = 200;

// renders a key-value record as "key: value" lines for the plaintext output
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

interface CollatzResult {
  number: bigint;
  steps: number;
  peak: bigint;
  // full sequence capped at MAX_SEQUENCE_DISPLAY + ellipsis if truncated
  sequenceDisplay: string;
}

function computeCollatz(n: bigint): CollatzResult | null {
  let current = n;
  let steps = 0;
  let peak = n;
  const sequence: bigint[] = [n];

  while (current !== 1n) {
    if (steps >= MAX_STEPS) {
      return null;
    }
    current = current % 2n === 0n ? current / 2n : 3n * current + 1n;
    steps++;
    if (current > peak) {
      peak = current;
    }
    // only collect terms up to the display cap + 1 to detect truncation
    if (sequence.length <= MAX_SEQUENCE_DISPLAY) {
      sequence.push(current);
    }
  }

  const truncated = steps + 1 > MAX_SEQUENCE_DISPLAY;
  const displayed = sequence.slice(0, MAX_SEQUENCE_DISPLAY);
  const sequenceDisplay = truncated
    ? `${displayed.join(' → ')} …`
    : displayed.join(' → ');

  return { number: n, steps, peak, sequenceDisplay };
}

export const CollatzBoxSource = {
  name: 'Collatz',
  description:
    'Compute the Collatz (3n+1) sequence length, peak value, and the sequence for a positive integer.',
  defaultInput: '27 ::collatz',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'collatz')) return [];

    const raw = trim(input).slice(0, 5000);

    if (!/^\d+$/.test(raw)) {
      const kv: Record<string, string> = {
        Error: 'A positive integer is required (digits only, no sign).',
      };
      return [
        new BoxBuilder('Collatz', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const n = BigInt(raw);

    if (n < 1n) {
      const kv: Record<string, string> = {
        Error: 'A positive integer >= 1 is required.',
      };
      return [
        new BoxBuilder('Collatz', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const result = computeCollatz(n);

    if (result === null) {
      const kv: Record<string, string> = {
        Error: `Sequence did not converge within ${MAX_STEPS.toLocaleString()} steps.`,
      };
      return [
        new BoxBuilder('Collatz', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const kv: Record<string, string> = {
      Number: result.number.toString(),
      Steps: result.steps.toString(),
      Peak: result.peak.toString(),
      Sequence: result.sequenceDisplay,
    };

    return [
      new BoxBuilder('Collatz', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CollatzBoxSource;
