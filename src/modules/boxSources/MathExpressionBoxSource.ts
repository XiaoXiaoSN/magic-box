import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isJSON, isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityMathExpression = 10;

interface Match {
  answer: string;
}

// cheap pre-screen so the wasm module loads only for math-shaped inputs.
// covers: arithmetic operators, function calls, BigInt suffix `123n`,
// implicit unit literals (`1 km`), and the unit-conversion `to` keyword.
const MATH_SHAPE = /[+\-*/^%!]|[a-zA-Z]+\s*\(|\d+n\b|\d+\s*[a-zA-Z]+|\bto\b/;

// LRU memo of (trimmed input → result). React re-renders frequently feed
// the same input back through; skipping the wasm boundary for repeats is
// a ~50× win on cache hit. null = "evaluated, no match"; absence = uncached.
const CACHE_CAP = 32;
const evalCache = new Map<string, Match | null>();

function readCache(key: string): Match | null | undefined {
  if (!evalCache.has(key)) {
    return undefined;
  }
  const value = evalCache.get(key) ?? null;
  // bump to most-recent so it survives the next eviction
  evalCache.delete(key);
  evalCache.set(key, value);
  return value;
}

function writeCache(key: string, value: Match | null): void {
  if (evalCache.has(key)) {
    evalCache.delete(key);
  }
  evalCache.set(key, value);
  if (evalCache.size > CACHE_CAP) {
    const oldest = evalCache.keys().next().value;
    if (oldest !== undefined) {
      evalCache.delete(oldest);
    }
  }
}

let initPromise: Promise<typeof import('math-box')> | null = null;

async function loadMathBox() {
  if (!initPromise) {
    // a rejected initPromise is cached forever otherwise; reset on failure
    // so a transient wasm fetch error doesn't permanently disable the tool
    // for the page session.
    initPromise = (async () => {
      const mod = await import('math-box');
      const isNode =
        typeof process !== 'undefined' && process.versions?.node !== undefined;
      if (isNode) {
        // jsdom/vitest path: bypass fetch by reading wasm bytes from disk.
        // runtime-string indirection keeps Vite from bundling these into
        // the browser chunk; createRequire resolves the wasm asset by
        // package id so the path stays correct regardless of how the
        // transformer rewrites `import.meta.url`.
        const fsName = 'node:fs/promises';
        const modName = 'node:module';
        const [fs, nodeModule] = await Promise.all([
          import(/* @vite-ignore */ fsName),
          import(/* @vite-ignore */ modName),
        ]);
        const req = nodeModule.createRequire(import.meta.url);
        const wasmPath = req.resolve('math-box/math_box_bg.wasm');
        const bytes = await fs.readFile(wasmPath);
        await mod.default({ module_or_path: bytes });
      } else {
        await mod.default();
      }
      return mod;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export const MathExpressionBoxSource = {
  name: 'Math Expression',
  description: 'Evaluate mathematical expressions with standard operators.',
  defaultInput: '1 + 2 * (3 + 4) / 5',
  tag: '=',
  kind: 'Compute',
  priority: PriorityMathExpression,

  async checkMatch(input: string): Promise<Match | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);
    if (regularInput === '') {
      return undefined;
    }

    // prevent JSON objects/arrays from being evaluated as math expressions
    if (
      (regularInput.startsWith('{') || regularInput.startsWith('[')) &&
      isJSON(regularInput)
    ) {
      return undefined;
    }

    if (!/\d/.test(regularInput) || !MATH_SHAPE.test(regularInput)) {
      return undefined;
    }

    const cached = readCache(regularInput);
    if (cached !== undefined) {
      return cached ?? undefined;
    }

    let result: Match | null = null;
    try {
      const { evaluate } = await loadMathBox();
      const answer = evaluate(regularInput);
      if (
        typeof answer === 'string' &&
        answer !== '' &&
        answer.replace(/\s/g, '') !== regularInput.replace(/\s/g, '')
      ) {
        result = { answer };
      }
    } catch {
      /* expression rejected by parser/evaluator — not a math input */
    }

    writeCache(regularInput, result);
    return result ?? undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = await this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { answer } = match;
    return [
      new BoxBuilder('Math Expression', answer)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MathExpressionBoxSource;
