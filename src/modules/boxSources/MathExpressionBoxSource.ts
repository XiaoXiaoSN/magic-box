import { isJSON, isString, parseDateString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import {
  BoxBuilder,
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
} from '@modules/Box';
import type { BoxSourceContext } from '@modules/BoxSource';
import mathBoxGlueUrl from 'math-box/math_box.js?url';
import mathBoxWasmUrl from 'math-box/math_box_bg.wasm?url';
import { createFreshMathBox, loadRuntimeWasm } from './runtimeAssets';

const PriorityMathExpression = 10;

interface Match {
  answer: string;
}

interface TypedResult {
  kind: string;
  text: string;
  exact?: boolean;
  finite?: boolean;
}

interface TypedResultHandle extends TypedResult {
  free(): void;
}

type MathBoxModule = typeof import('math-box') & {
  evaluate_typed?: (input: string) => TypedResultHandle;
  Compiled?: new (
    input: string,
  ) => {
    evaluate(): string;
    evaluate_typed(): TypedResultHandle;
    free(): void;
  };
};

// cheap pre-screen so the wasm module loads only for math-shaped inputs.
const MATH_SHAPE =
  /[+\-*/^%!<>=&|]|[a-zA-Z]+\s*\(|\d+n\b|\d+\s*[a-zA-Z°]|\bto\b/;
const UNIT_LABELS = new Set([
  'm',
  'km',
  'cm',
  'mm',
  'um',
  'nm',
  'mi',
  'yd',
  'ft',
  'in',
  'kg',
  'g',
  'mg',
  't',
  'lb',
  'oz',
  's',
  'ms',
  'us',
  'ns',
  'min',
  'h',
  'day',
  'week',
  'k',
  'K',
  'degC',
  'degF',
  '°C',
  '°F',
  'B',
  'KB',
  'MB',
  'GB',
  'TB',
  'KiB',
  'MiB',
  'GiB',
  'TiB',
  'b',
  'bit',
  'bits',
  'Hz',
  'N',
  'Pa',
  'J',
  'W',
]);
const AUTO_KINDS = new Set(['num', 'big', 'fraction', 'complex', 'unit']);

// LRU memo of (mode + trimmed input → result). React re-renders frequently
// feed the same input back through; explicit mode changes evaluation policy.
const CACHE_CAP = 32;
const evalCache = new Map<string, Match | null>();

function readCache(key: string): Match | null | undefined {
  if (!evalCache.has(key)) return undefined;
  const value = evalCache.get(key) ?? null;
  evalCache.delete(key);
  evalCache.set(key, value);
  return value;
}

function writeCache(key: string, value: Match | null): void {
  if (evalCache.has(key)) evalCache.delete(key);
  evalCache.set(key, value);
  if (evalCache.size > CACHE_CAP) {
    const oldest = evalCache.keys().next().value;
    if (oldest !== undefined) evalCache.delete(oldest);
  }
}

let initPromise: Promise<MathBoxModule> | null = null;
let wasmBytesPromise: Promise<Uint8Array> | null = null;
let recoveryId = 0;

function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined;
}

async function loadWasmBytes(): Promise<Uint8Array> {
  if (!wasmBytesPromise) {
    wasmBytesPromise = (async () => {
      const embeddedBytes = loadRuntimeWasm('math');
      if (embeddedBytes) return embeddedBytes;
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
    })().catch((error) => {
      wasmBytesPromise = null;
      throw error;
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

async function loadMathBox(): Promise<MathBoxModule> {
  if (!initPromise) {
    initPromise = (async () => {
      const [mod] = await Promise.all([import('math-box'), warmRecoveryGlue()]);
      await mod.default({ module_or_path: await loadWasmBytes() });
      return mod as MathBoxModule;
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function recoverMathBox(): Promise<MathBoxModule> {
  const recovery = (async () => {
    const freshEmbeddedModule = createFreshMathBox();
    if (freshEmbeddedModule) {
      freshEmbeddedModule.initSync({ module: await loadWasmBytes() });
      return freshEmbeddedModule;
    }

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
    )) as MathBoxModule;
    freshMod.initSync({ module: await loadWasmBytes() });
    return freshMod;
  })();

  initPromise = recovery.catch((error) => {
    initPromise = null;
    throw error;
  });
  return initPromise;
}

function isExplicit(options: BoxOptions): boolean {
  return hasOptionKeys(options, 'math');
}

function expressionFor(input: string, options: BoxOptions): string {
  const option = extractOptionKeys(options, 'math');
  return typeof option === 'string' && option.trim() !== ''
    ? option.trim()
    : input;
}

function isNumericGroupNoise(input: string): boolean {
  return /^\d+(?:-\d+){2,}$/.test(input) || /^\d+(?:\/\d+){2,}$/.test(input);
}

function isBareUnitLiteral(input: string): boolean {
  const match = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*(.+)$/.exec(input);
  if (!match) return false;
  const labels = match[1]
    .split(/[*/]/)
    .map((part) => part.replace(/\^[-+]?\d+$/, '').trim());
  return labels.length > 0 && labels.every((label) => UNIT_LABELS.has(label));
}

function shouldAutoIgnore(input: string): boolean {
  if (parseDateString(input) !== null) return true;
  if (isNumericGroupNoise(input)) return true;
  if (/^e-\d+$/i.test(input)) return true;
  if (/^"(?:[^"\\]|\\.)*"$/.test(input)) return true;
  if (isBareUnitLiteral(input)) return true;
  return false;
}

function normalizeTypedResult(
  module: MathBoxModule,
  input: string,
): TypedResult {
  if ('evaluate_typed' in module) {
    const evaluateTyped = module.evaluate_typed;
    if (evaluateTyped) {
      const handle = evaluateTyped(input);
      try {
        return {
          kind: handle.kind,
          text: handle.text,
          exact: handle.exact,
          finite: handle.finite,
        };
      } finally {
        handle.free();
      }
    }
  }
  const text = module.evaluate(input);
  const finite = !/^(?:NaN|[+-]?Infinity)$/.test(text);
  return {
    kind: 'num',
    text,
    finite,
  };
}

function isBooleanComparison(input: string): boolean {
  return /(?:!|<|>|==|!=|<=|>=|&&|\|\|)/.test(input);
}

function typedResultMatches(
  typed: TypedResult,
  input: string,
  explicit: boolean,
): boolean {
  if (typed.finite === false) return false;
  if (typed.kind === 'bool') return explicit || isBooleanComparison(input);
  if (!AUTO_KINDS.has(typed.kind)) return false;
  if (explicit) return typed.text !== '';
  return typed.text.replace(/\s/g, '') !== input.replace(/\s/g, '');
}

export const MathExpressionBoxSource = {
  name: 'Math Expression',
  description: 'Evaluate mathematical expressions with standard operators.',
  defaultInput: '1 + 2 * (3 + 4) / 5',
  tag: '=',
  kind: 'Compute',
  priority: PriorityMathExpression,

  async checkMatch(
    input: string,
    options: BoxOptions = null,
    context?: BoxSourceContext,
  ): Promise<Match | undefined> {
    if (!isString(input) || context?.signal.aborted) return undefined;
    const rawInput = trim(input);
    const explicit = isExplicit(options);
    const regularInput = expressionFor(rawInput, options);
    if (regularInput === '' || (!explicit && shouldAutoIgnore(rawInput)))
      return undefined;
    if (
      (regularInput.startsWith('{') || regularInput.startsWith('[')) &&
      isJSON(regularInput)
    ) {
      return undefined;
    }
    if (
      !explicit &&
      (!MATH_SHAPE.test(regularInput) ||
        (!/\d/.test(regularInput) && !/[<>=!&|]/.test(regularInput)))
    ) {
      return undefined;
    }

    const cacheKey = `${explicit ? 'explicit' : 'auto'}:${regularInput}`;
    const cached = readCache(cacheKey);
    if (cached !== undefined) return cached ?? undefined;

    let mathBox: MathBoxModule;
    try {
      mathBox = await loadMathBox();
      if (context?.signal.aborted) return undefined;
    } catch (error) {
      console.error('math-box failed to load', error);
      return undefined;
    }

    try {
      const typed = normalizeTypedResult(mathBox, regularInput);
      if (!typedResultMatches(typed, regularInput, explicit)) {
        writeCache(cacheKey, null);
        return undefined;
      }
      const result = { answer: typed.text };
      writeCache(cacheKey, result);
      return result;
    } catch (error) {
      if (typeof error === 'string') {
        writeCache(cacheKey, null);
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

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
    context?: BoxSourceContext,
  ): Promise<Box[]> {
    const explicit = isExplicit(options);
    const match = await this.checkMatch(input, options, context);
    if (!match) {
      if (explicit && !context?.signal.aborted) {
        return [
          errorBox('Math Expression', 'Invalid mathematical expression.', {
            priority: this.priority,
          }),
        ];
      }
      return [];
    }

    return [
      new BoxBuilder('Math Expression', match.answer)
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MathExpressionBoxSource;
