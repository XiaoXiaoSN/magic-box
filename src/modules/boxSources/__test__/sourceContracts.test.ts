// @vitest-environment node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseInput } from '@functions/parseOptions';
import type { BoxSourceContext } from '@modules/BoxSource';
import { describe, expect, it } from 'vitest';

import { boxSources } from '../index';

const context = (): BoxSourceContext => ({
  signal: new AbortController().signal,
  preview: true,
  now: Date.UTC(2024, 0, 1),
  locale: 'en',
  timezone: 'Asia/Taipei',
  timezoneOffset: 8,
  timezoneMode: 'fixed',
});

const enabledSources = boxSources.filter(
  (source) => source.defaultDisabled !== true,
);

const noiseInputs = [
  'hello world',
  '2024-01-01',
  '0912-345-678',
  '200',
  'be',
  '5',
  'Version: 1.0',
  '^[A-Z]+$',
  'constructor',
] as const;

const expectedNoiseMatches: Readonly<Record<string, readonly string[]>> = {
  'hello world': ['base64-encode', 'word-count'],
  '2024-01-01': ['base64-encode', 'word-count'],
  '0912-345-678': ['base64-decode', 'base64-encode', 'word-count'],
  '200': ['base64-decode', 'base64-encode', 'word-count'],
  be: ['base64-encode', 'word-count'],
  '5': ['base64-encode', 'word-count'],
  'Version: 1.0': ['base64-encode', 'word-count'],
  '^[A-Z]+$': ['base64-encode', 'word-count'],
  constructor: ['base64-encode', 'word-count'],
};

const largeInputChild = `
const [{ boxSources }, { executeComputeWorkerRun }, { resolveComputeWorkerSource }] =
  await Promise.all([
    import(process.argv[1]),
    import(process.argv[2]),
    import(process.argv[3]),
  ]);

let state = 0x9e3779b9;
let input = '';
for (let index = 0; index < 100 * 1024; index += 1) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  input += String.fromCharCode(32 + (state % 95));
}

const context = {
  signal: new AbortController().signal,
  preview: true,
  now: Date.UTC(2024, 0, 1),
  locale: 'en',
  timezone: 'Asia/Taipei',
  timezoneOffset: 8,
  timezoneMode: 'fixed',
};
const mainResults = [];
for (const source of boxSources.filter(
  (candidate) => candidate.workerSafe !== true,
)) {
  try {
    const boxes = await source.generateBoxes(input, null, context);
    mainResults.push({
      path: 'main',
      id: source.id,
      boxes: boxes.length,
      maxOutput: Math.max(0, ...boxes.map((box) => box.props.plaintextOutput.length)),
    });
  } catch (error) {
    mainResults.push({
      path: 'main',
      id: source.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const workerSourceIds = boxSources
  .filter((candidate) => candidate.workerSafe === true)
  .map((source) => source.id);
const workerEvents = [];
await executeComputeWorkerRun(
  {
    type: 'run',
    runId: 'large-input-contract',
    input,
    options: null,
    sourceIds: workerSourceIds,
    now: Date.UTC(2024, 0, 1),
    locale: 'en',
    timezone: 'Asia/Taipei',
    timezoneOffset: 8,
    timezoneMode: 'fixed',
  },
  resolveComputeWorkerSource,
  { postMessage: (event) => workerEvents.push(event) },
);

console.log(
  JSON.stringify({
    inputLength: input.length,
    mainResults,
    workerResults: workerEvents
      .filter(
        (event) => event.type === 'source-result' || event.type === 'source-error',
      )
      .map((event) =>
        event.type === 'source-result'
          ? {
              path: 'worker',
              id: event.sourceId,
              boxes: event.boxes.length,
              maxOutput: Math.max(
                0,
                ...event.boxes.map((box) => box.plaintextOutput.length),
              ),
            }
          : { path: 'worker', id: event.sourceId, error: event.message },
      ),
  }),
);
`;

const runLargeInputChild = async (): Promise<unknown> => {
  const sourceIndex = fileURLToPath(new URL('../index.ts', import.meta.url));
  const workerEntry = fileURLToPath(
    new URL('../../computeWorker/entry.ts', import.meta.url),
  );
  const workerRegistry = fileURLToPath(
    new URL('../../computeWorker/registry.ts', import.meta.url),
  );

  return new Promise((resolve, reject) => {
    const child = spawn(
      'bun',
      ['-e', largeInputChild, sourceIndex, workerEntry, workerRegistry],
      { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let output = '';
    let errorOutput = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('100 KiB source contract exceeded 20 second timeout'));
    }, 20_000);

    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new Error(
            `100 KiB source contract child exited with ${signal ?? code}: ${errorOutput}`,
          ),
        );
        return;
      }
      try {
        resolve(JSON.parse(output));
      } catch (error) {
        reject(
          new Error(
            `100 KiB source contract emitted invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    });
  });
};

describe('default source false-positive boundaries', () => {
  it.each(noiseInputs)('does not invent tools for %s', async (input) => {
    const [normalizedInput, options] = parseInput(input);
    const matches = await Promise.all(
      enabledSources.map(async (source) => {
        const boxes = await source.generateBoxes(
          normalizedInput,
          options,
          context(),
        );
        return [source.id, boxes] as const;
      }),
    );
    const nonEmpty = matches
      .filter(([, boxes]) => boxes.length > 0)
      .map(([sourceId]) => sourceId);
    expect(nonEmpty.sort()).toEqual([...expectedNoiseMatches[input]].sort());
  });

  it('runs every registered source through bounded main or worker execution for a seeded 100 KiB input', async () => {
    const result = (await runLargeInputChild()) as {
      inputLength: number;
      mainResults: Array<{
        path: string;
        id: string;
        boxes?: number;
        maxOutput?: number;
        error?: string;
      }>;
      workerResults: Array<{
        path: string;
        id: string;
        boxes?: number;
        maxOutput?: number;
        error?: string;
      }>;
    };
    const results = [...result.mainResults, ...result.workerResults];

    expect(result.inputLength).toBe(100 * 1024);
    expect(results).not.toHaveLength(0);
    expect(results.every((entry) => entry.error === undefined)).toBe(true);
    expect(new Set(results.map((entry) => entry.id))).toEqual(
      new Set(boxSources.map((source) => source.id)),
    );
    expect(
      results.every(
        (entry) =>
          (entry.boxes ?? 0) >= 0 && (entry.maxOutput ?? 0) <= 4 * 1024 * 1024,
      ),
    ).toBe(true);
  }, 30_000);
});
