#!/usr/bin/env node

// Measure the generated package that would be shipped to the browser.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const ITERATIONS = 100_000;
const RUNS = 5;
const MATH_EXPRESSION =
  'f(a, b, c, d) = (a + b) * (c + d) + a^2 + b^2 + c^2 + d^2 + (a - b) * (c - d); f(1, 2, 3, 4)';
const BASE64_INPUT = 'The quick brown fox jumps over the lazy dog.'.repeat(4);

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function benchmark(fn) {
  for (let index = 0; index < 10_000; index += 1) fn();
  const samples = [];
  for (let run = 0; run < RUNS; run += 1) {
    const start = performance.now();
    for (let index = 0; index < ITERATIONS; index += 1) fn();
    samples.push(((performance.now() - start) * 1_000_000) / ITERATIONS);
  }
  return { median_ns_per_op: median(samples), samples_ns_per_op: samples };
}

async function artifact(pkgDir, wasmName, glueName) {
  const wasmPath = resolve(pkgDir, wasmName);
  const gluePath = resolve(pkgDir, glueName);
  const [wasm, glue] = await Promise.all([
    readFile(wasmPath),
    readFile(gluePath),
  ]);
  return {
    wasm_bytes: wasm.byteLength,
    wasm_gzip_bytes: gzipSync(wasm, { level: 9 }).byteLength,
    wasm_sha256: createHash('sha256').update(wasm).digest('hex'),
    glue_bytes: glue.byteLength,
    wasmPath,
    gluePath,
  };
}

async function loadPackage(pkgDir, glueName, wasmName) {
  const gluePath = resolve(pkgDir, glueName);
  const wasmPath = resolve(pkgDir, wasmName);
  const module = await import(pathToFileURL(gluePath).href);
  await module.default({ module_or_path: await readFile(wasmPath) });
  return module;
}

function resolveExecutable(command) {
  if (!command) return null;
  if (command.includes('/')) return command;
  const result = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], {
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

async function commandVersion(command) {
  try {
    const version = await new Promise((resolveVersion) => {
      const child = spawn(command, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk;
      });
      child.stderr.on('data', (chunk) => {
        output += chunk;
      });
      child.on('error', () => resolveVersion(null));
      child.on('close', () => resolveVersion(output.trim() || null));
    });
    return version;
  } catch {
    return null;
  }
}

async function commandInfo(command) {
  const path = resolveExecutable(command);
  if (!path) return { path: null, version: null, sha256: null };

  let sha256 = null;
  try {
    sha256 = createHash('sha256')
      .update(await readFile(path))
      .digest('hex');
  } catch {
    // version output still identifies a tool whose executable is unreadable.
  }

  return {
    path,
    version: await commandVersion(path),
    sha256,
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function main() {
  const [mathArg, base64Arg] = process.argv.slice(2);
  if (!mathArg || !base64Arg) {
    throw new Error(
      'usage: measure-shipping.mjs <math-pkg-dir> <base64-pkg-dir>',
    );
  }

  const mathDir = resolve(mathArg);
  const base64Dir = resolve(base64Arg);
  const mathArtifact = await artifact(
    mathDir,
    'math_box_bg.wasm',
    'math_box.js',
  );
  const base64Artifact = await artifact(
    base64Dir,
    'base64_box_bg.wasm',
    'base64_box.js',
  );
  const math = await loadPackage(mathDir, 'math_box.js', 'math_box_bg.wasm');
  const base64 = await loadPackage(
    base64Dir,
    'base64_box.js',
    'base64_box_bg.wasm',
  );

  const compiled = new math.Compiled(MATH_EXPRESSION);
  assertEqual(compiled.evaluate(), '52', 'compiled math result');
  assertEqual(math.evaluate(MATH_EXPRESSION), '52', 'full math result');
  const encoded = base64.encode(BASE64_INPUT);
  assertEqual(
    base64.decode_to_string(encoded),
    BASE64_INPUT,
    'base64 round trip',
  );

  const result = {
    profile: process.env.WASM_PROFILE ?? 'unknown',
    toolchain: {
      node: {
        path: process.execPath,
        version: process.version,
        sha256: await commandInfo(process.execPath).then((info) => info.sha256),
      },
      rustc: await commandInfo(process.env.RUSTC ?? 'rustc'),
      cargo: await commandInfo(process.env.CARGO ?? 'cargo'),
      wasm_pack: await commandInfo(process.env.WASM_PACK ?? 'wasm-pack'),
      wasm_bindgen: await commandInfo(
        process.env.WASM_BINDGEN ?? 'wasm-bindgen',
      ),
      wasm_opt: await commandInfo(process.env.WASM_OPT ?? 'wasm-opt'),
    },
    iterations: ITERATIONS,
    runs: RUNS,
    math: {
      artifact: mathArtifact,
      runtime: {
        compiled_evaluate: benchmark(() => compiled.evaluate()),
        evaluate: benchmark(() => math.evaluate(MATH_EXPRESSION)),
      },
    },
    base64: {
      artifact: base64Artifact,
      runtime: {
        encode: benchmark(() => base64.encode(BASE64_INPUT)),
        decode_to_string: benchmark(() => base64.decode_to_string(encoded)),
      },
    },
  };

  delete result.math.artifact.wasmPath;
  delete result.math.artifact.gluePath;
  delete result.base64.artifact.wasmPath;
  delete result.base64.artifact.gluePath;
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
