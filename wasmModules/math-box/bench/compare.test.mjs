import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL('../../..', import.meta.url));
const script = fileURLToPath(new URL('./compare.mjs', import.meta.url));
const canonicalReport = join(root, 'wasmModules/math-box/BENCHMARK.md');

test('writing a comparison report preserves the canonical benchmark', async () => {
  const before = await readFile(canonicalReport);
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), 'magic-box-compare-'),
  );
  const outputPath = join(temporaryDirectory, 'comparison.md');

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        script,
        '--write',
        '--output',
        outputPath,
        '--iterations',
        '2',
        '--runs',
        '1',
      ],
      { cwd: root, maxBuffer: 1_000_000 },
    );
    const after = await readFile(canonicalReport);
    const generated = await readFile(outputPath, 'utf8');

    assert.deepEqual(after, before);
    assert.match(stdout, /WASM SHA-256/);
    assert.match(generated, /^# math-box Comparison Report/m);
    assert.match(generated, /does not replace the canonical/);
    assert.match(generated, /2 evaluations per run for 1 runs/);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('rejects the canonical benchmark as a generated report destination', async () => {
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        script,
        '--write',
        '--output',
        canonicalReport,
        '--iterations',
        '1',
        '--runs',
        '1',
      ],
      { cwd: root },
    ),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /cannot overwrite/);
      return true;
    },
  );
});
