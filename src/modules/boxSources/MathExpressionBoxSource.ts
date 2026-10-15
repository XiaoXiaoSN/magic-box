import { isJSON, isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';
import mathBoxGlueUrl from 'math-box/math_box.js?url';
import mathBoxWasmUrl from 'math-box/math_box_bg.wasm?url';

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
let wasmBytesPromise: Promise<Uint8Array> | null = null;
let recoveryId = 0;

function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined;
}

async function loadWasmBytes(): Promise<Uint8Array> {
  if (!wasmBytesPromise) {
    wasmBytesPromise = (async () => {
      if (isNodeRuntime()) {
        const fsName = 'node:fs/promises';
        const modName = 'node:module';
        const [fs, nodeModule] = await Promise.all([
          import(/* @vite-ignore */ fsName),
          import(/* @vite-ignore */ modName),
        ]);
        const req = nodeModule.createRequire(import.meta.url);
        return fs.readFile(req.resolve('math-box/math_box_bg.wasm'));
      }

      const response = await fetch(mathBoxWasmUrl);
      if (!response.ok) {
        throw new Error(`math-box WASM fetch failed: ${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    })().catch((err) => {
      wasmBytesPromise = null;
      throw err;
    });
  }
  return wasmBytesPromise;
}

async function warmRecoveryGlue(): Promise<void> {
  if (isNodeRuntime()) return;

  const response = await fetch(mathBoxGlueUrl);
  if (!response.ok) {
    throw new Error(`math-box recovery glue fetch failed: ${response.status}`);
  }
}

async function loadMathBox() {
  if (!initPromise) {
    // a rejected initPromise is cached forever otherwise; reset on failure
    // so a transient wasm fetch error doesn't permanently disable the tool
    // for the page session.
    initPromise = (async () => {
      const [mod] = await Promise.all([import('math-box'), warmRecoveryGlue()]);
      await mod.default({ module_or_path: await loadWasmBytes() });
      return mod;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function recoverMathBox(): Promise<typeof import('math-box')> {
  const recovery = (async () => {
    let freshUrl: string;
    if (isNodeRuntime()) {
      const modName = 'node:module';
      const urlName = 'node:url';
      const [nodeModule, nodeUrl] = await Promise.all([
        import(/* @vite-ignore */ modName),
        import(/* @vite-ignore */ urlName),
      ]);
      const req = nodeModule.createRequire(import.meta.url);
      freshUrl = `${nodeUrl.pathToFileURL(req.resolve('math-box/math_box.js')).href}?recovery=${++recoveryId}`;
    } else {
      const url = new URL(mathBoxGlueUrl, import.meta.url);
      url.searchParams.set('recovery', String(++recoveryId));
      freshUrl = url.href;
    }

    const freshMod = (await import(
      /* @vite-ignore */ freshUrl
    )) as typeof import('math-box');
    freshMod.initSync({ module: await loadWasmBytes() });
    return freshMod;
  })();

  initPromise = recovery.catch((err) => {
    initPromise = null;
    throw err;
  });
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

    let mathBox: typeof import('math-box');
    try {
      mathBox = await loadMathBox();
    } catch (error) {
      console.error('math-box failed to load', error);
      return undefined;
    }

    try {
      const answer = mathBox.evaluate(regularInput);
      if (
        typeof answer === 'string' &&
        answer !== '' &&
        answer.replace(/\s/g, '') !== regularInput.replace(/\s/g, '')
      ) {
        const result = { answer };
        writeCache(regularInput, result);
        return result;
      }
      writeCache(regularInput, null);
      return undefined;
    } catch (error) {
      if (typeof error === 'string') {
        writeCache(regularInput, null);
      } else if (error instanceof WebAssembly.RuntimeError) {
        console.error('math-box WASM runtime trap; reinitializing', error);
        try {
          await recoverMathBox();
        } catch (recoveryError) {
          console.error('math-box WASM recovery failed', recoveryError);
        }
      } else {
        console.error('math-box evaluation failed', error);
      }
      return undefined;
    }
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = await this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { answer } = match;
    return [
      new BoxBuilder('Math Expression', answer)
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MathExpressionBoxSource;
