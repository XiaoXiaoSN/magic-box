import { describe, expect, it } from 'vitest';

import { MODEL, RUNTIME_VERSION } from '../modelCatalog';
import {
  createRepetitionGuard,
  type Logits,
  REPETITION_PENALTY,
} from '../repetition';
import generationConfig from './fixtures/generation_config.json';
import tokenizerFixture from './fixtures/tokenizer_cases.json';

interface TokenizerCase {
  name: string;
  text: string;
  tokenIds: number[];
}

const fixture = tokenizerFixture as {
  runtimeVersion: string;
  modelRevision: string;
  cases: TokenizerCase[];
};
const scoreCount = 151_646;

const step = (
  guard: ReturnType<typeof createRepetitionGuard>,
  ids: number[],
  scores: Float32Array,
): Float32Array => {
  scores.fill(1);
  const logits: Logits = { 0: { data: scores } };
  guard([ids.map(BigInt)], logits);
  return scores;
};

describe('createRepetitionGuard', () => {
  it('overrides the pinned model repetition defaults and matches the runtime/tokenizer fixtures', () => {
    expect(fixture.runtimeVersion).toBe(RUNTIME_VERSION);
    expect(fixture.modelRevision).toBe(MODEL.revision);
    expect(generationConfig.repetition_penalty).toBe(1.1);
    expect(generationConfig.do_sample).toBe(true);
    expect(REPETITION_PENALTY).toBe(1.1);
  });

  it('never penalizes or bans a token for appearing in the prompt', () => {
    const prompt = [7, 8, 9, 7, 8];
    const scores = step(
      createRepetitionGuard(prompt.length),
      prompt,
      new Float32Array(scoreCount),
    );
    expect(Array.from(scores.slice(0, 16))).toEqual(new Array(16).fill(1));
  });

  it('keeps repeated CJK entities, URL prefixes and similar code loops available', () => {
    const promptToken = 151_643;
    const scores = new Float32Array(scoreCount);
    for (const sample of fixture.cases.filter(
      ({ name }) => name !== 'genuine-single-token-loop',
    )) {
      expect(sample.text.length).toBeGreaterThan(0);
      const guard = createRepetitionGuard(1);
      const ids = [promptToken];
      for (const token of sample.tokenIds) {
        const current = step(guard, ids, scores);
        expect(current[token]).not.toBe(-Infinity);
        ids.push(token);
      }
    }
  });

  it('stops a sustained single-token loop after four repeated generated tokens', () => {
    const loop = fixture.cases.find(
      ({ name }) => name === 'genuine-single-token-loop',
    );
    expect(loop).toBeDefined();
    const repeatedToken = loop?.tokenIds.at(-1);
    expect(repeatedToken).toBeDefined();
    const guard = createRepetitionGuard(1);
    const scores = step(
      guard,
      [151_643, ...(loop?.tokenIds.slice(0, 5) ?? [])],
      new Float32Array(scoreCount),
    );
    expect(scores[repeatedToken as number]).toBe(-Infinity);
  });

  it('penalizes only generated tokens, in the direction of the sign', () => {
    const guard = createRepetitionGuard(2);
    const scores = new Float32Array(scoreCount);
    const positive = step(guard, [9, 10, 3], scores);
    expect(positive[3]).toBeCloseTo(1 / REPETITION_PENALTY);
    expect(positive[9]).toBe(1);

    const negativeGuard = createRepetitionGuard(2);
    const negativeScores = new Float32Array(scoreCount);
    negativeScores.fill(-2);
    negativeGuard([[9n, 10n, 3n]], { 0: { data: negativeScores } });
    expect(negativeScores[3]).toBeCloseTo(-2 * REPETITION_PENALTY);
  });
});
