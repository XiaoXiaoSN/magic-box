// Anti-repetition for greedy decoding, scoped to the ANSWER.
//
// Pure greedy decoding on the 0.5B model degenerates into repeating one token
// until the budget runs out (measured on real hardware: one word ~80 times).
// transformers.js ships `repetition_penalty` and `no_repeat_ngram_size`, but in
// a decoder-only model both see `all_input_ids` — the rendered prompt plus the
// answer. Applied to the prompt they forbid exactly what translate, rewrite and
// summarize must do: copy names, numbers, URLs, code and CJK text (roughly one
// token per character) verbatim from the input. So the prompt is sliced off
// and only generated tokens are penalized or banned.
//
// The built-in n-gram processor also rebuilds a JSON-keyed map over the whole
// sequence on every step (O(length) string allocations per token). This one is
// incremental: each step folds in only the tokens appended since the last call,
// so a step is O(1) amortized and allocates only when a new trigram is seen.

export const REPETITION_PENALTY = 1.1;
export const NO_REPEAT_NGRAM_SIZE = 3;

// The trigram's two-token prefix packed into one number. Qwen2.5's vocabulary
// is 151,936 ids, far below 2^21, and 2^42 stays inside Number's exact range.
const PREFIX_BASE = 2 ** 21;

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
  // Generated tokens seen so far, and for each two-token prefix the tokens
  // that have already followed it.
  const seen = new Set<number>();
  const followers = new Map<number, Set<number>>();
  const generated: number[] = [];

  return (inputIds, logits) => {
    const ids = inputIds[0];
    for (let i = promptLength + generated.length; i < ids.length; ++i) {
      const token = Number(ids[i]);
      const n = generated.push(token);
      seen.add(token);
      if (n >= NO_REPEAT_NGRAM_SIZE) {
        const key = generated[n - 3] * PREFIX_BASE + generated[n - 2];
        const next = followers.get(key);
        if (next) next.add(token);
        else followers.set(key, new Set([token]));
      }
    }

    const scores = logits[0].data;
    for (const token of seen) {
      const score = scores[token];
      scores[token] =
        score < 0 ? score * REPETITION_PENALTY : score / REPETITION_PENALTY;
    }
    const n = generated.length;
    if (n >= NO_REPEAT_NGRAM_SIZE - 1) {
      const banned = followers.get(
        generated[n - 2] * PREFIX_BASE + generated[n - 1],
      );
      if (banned) for (const token of banned) scores[token] = -Infinity;
    }
    return logits;
  };
}
