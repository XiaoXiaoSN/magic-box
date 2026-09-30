import { describe, expect, it } from 'vitest';

import {
  createRepetitionGuard,
  type Logits,
  REPETITION_PENALTY,
} from '../repetition';

const VOCAB = 16;

// Runs one decoding step over `ids` with flat scores and returns them.
const step = (
  guard: ReturnType<typeof createRepetitionGuard>,
  ids: number[],
  score = 1,
): Float32Array => {
  const data = new Float32Array(VOCAB).fill(score);
  const logits: Logits = { 0: { data } };
  guard([ids.map(BigInt)], logits);
  return data;
};

describe('createRepetitionGuard', () => {
  it('never penalizes or bans a token for appearing in the prompt', () => {
    // A rewrite must be able to copy "7 8 9" from its input verbatim. The
    // built-in processors saw the prompt too and forbade exactly that.
    const prompt = [7, 8, 9, 7, 8];
    const guard = createRepetitionGuard(prompt.length);
    const scores = step(guard, prompt);
    expect(Array.from(scores)).toEqual(new Array(VOCAB).fill(1));
  });

  it('bans a trigram the answer already produced', () => {
    const prompt = [1, 2];
    const guard = createRepetitionGuard(prompt.length);
    // Answer so far: 3 4 5 3 4 → next 5 would repeat "3 4 5".
    const scores = step(guard, [...prompt, 3, 4, 5, 3, 4]);
    expect(scores[5]).toBe(-Infinity);
    expect(scores[6]).toBe(1);
  });

  it('penalizes only generated tokens, in the direction of the sign', () => {
    const guard = createRepetitionGuard(2);
    const positive = step(guard, [9, 10, 3], 2);
    expect(positive[3]).toBeCloseTo(2 / REPETITION_PENALTY);
    expect(positive[9]).toBe(2);

    const negativeGuard = createRepetitionGuard(2);
    const negative = step(negativeGuard, [9, 10, 3], -2);
    expect(negative[3]).toBeCloseTo(-2 * REPETITION_PENALTY);
  });

  it('matches a from-scratch scan when fed one token per step', () => {
    // The guard is incremental; stepping it must equal rebuilding the n-gram
    // table over the whole answer at the last step.
    const prompt = [0];
    const answer = [3, 4, 5, 3, 4, 6, 3, 4];
    const incremental = createRepetitionGuard(prompt.length);
    let scores: Float32Array = new Float32Array();
    for (let n = 0; n <= answer.length; n++) {
      scores = step(incremental, [...prompt, ...answer.slice(0, n)]);
    }
    const fresh = step(createRepetitionGuard(prompt.length), [
      ...prompt,
      ...answer,
    ]);
    expect(Array.from(scores)).toEqual(Array.from(fresh));
    // "3 4" was followed by 5 and by 6: both are banned now.
    expect(scores[5]).toBe(-Infinity);
    expect(scores[6]).toBe(-Infinity);
  });
});
