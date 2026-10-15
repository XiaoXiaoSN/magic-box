// Repetition controls see generated tokens only, so copied prompt text remains intact.

export const REPETITION_PENALTY = 1.1;
const LOOP_SIZES = [1, 2, 3, 4] as const;
const SINGLE_TOKEN_LOOP_CYCLES = 4;

interface LogitsRow {
  data: Float32Array;
}

// transformers.js logits for batch size 1: `logits[0].data` is a view over the
// last position's scores, which processors edit in place.
export interface Logits {
  [row: number]: LogitsRow;
}

export type LogitsProcessor = (inputIds: bigint[][], logits: Logits) => Logits;

export function createRepetitionGuard(promptLength: number): LogitsProcessor {
  const seen = new Set<number>();
  const generated: number[] = [];

  return (inputIds, logits) => {
    const ids = inputIds[0];
    for (let i = promptLength + generated.length; i < ids.length; ++i) {
      const token = Number(ids[i]);
      generated.push(token);
      seen.add(token);
    }

    const scores = logits[0].data;
    for (const token of seen) {
      const score = scores[token];
      scores[token] =
        score < 0 ? score * REPETITION_PENALTY : score / REPETITION_PENALTY;
    }
    const length = generated.length;
    for (const size of LOOP_SIZES) {
      if (size === 1) {
        if (length < SINGLE_TOKEN_LOOP_CYCLES) continue;
        const repeatedToken = generated[length - 1];
        let repeated = true;
        for (let i = 2; i <= SINGLE_TOKEN_LOOP_CYCLES; ++i) {
          if (generated[length - i] !== repeatedToken) {
            repeated = false;
            break;
          }
        }
        if (repeated) scores[repeatedToken] = -Infinity;
        continue;
      }
      if (length < size * 2) continue;
      const previous = length - size * 2;
      const last = length - size;
      let repeats = true;
      for (let i = 0; i < size; ++i) {
        if (generated[previous + i] !== generated[last + i]) {
          repeats = false;
          break;
        }
      }
      if (repeats) {
        scores[generated[last]] = -Infinity;
        break;
      }
    }
    return logits;
  };
}
