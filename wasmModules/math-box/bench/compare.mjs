// Bench harness comparing math-box (WASM) against mathjs (JS) on identical
// expressions. Run via: `bun wasmModules/math-box/bench/compare.mjs`.
//
// Methodology:
//   1. Warm both engines with each expression (parse-once, compile-once).
//   2. Time N evaluate-from-source iterations per engine per expression.
//   3. Report median over R runs to dampen GC noise.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ITER = 100_000;
const RUNS = 5;

const cases = [
  { name: 'simple',     expr: '1 + 2 * 3' },
  { name: 'medium',     expr: '2 + 2^10 + log(10, 10000)' },
  { name: 'trig',       expr: 'sin(PI/2) + cos(PI/3)' },
  { name: 'hex',        expr: '0xff + 0b1010' },
  { name: 'factorial',  expr: '5! + 10!' },
  { name: 'nested',     expr: '(((1 + 2) * 3 - 4) / 5) ^ 2' },
  { name: 'large_int',  expr: '1234567 * 7654321 + 99999' },
  // phase 2 — variables & user functions
  { name: 'var_assign', expr: 'a = 5; b = 7; a*b + a^2' },
  { name: 'user_fn',    expr: 'sq(x) = x^2; sq(11) + sq(13)' },
  // phase 3 — bigint
  { name: 'bigint',     expr: '9007199254740993n + 1n' },
  // phase 4 — fraction
  { name: 'fraction',   expr: 'frac(1, 3) + frac(1, 4)' },
  // phase 5b — unit conversion via SI table
  { name: 'unit',       expr: 'convert(unit(1, "km"), "m")' },
  // phase 6 — complex
  { name: 'complex',    expr: '(2 + 3*i) * (2 - 3*i)' },
];

async function loadMathBox() {
  const mod = await import('math-box');
  const wasmPath = require.resolve('math-box/math_box_bg.wasm');
  const bytes = await readFile(wasmPath);
  await mod.default({ module_or_path: bytes });
  return mod;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

function bench(label, fn) {
  // warm
  for (let i = 0; i < 1000; i++) fn();
  const samples = [];
  for (let r = 0; r < RUNS; r++) {
    const t0 = performance.now();
    for (let i = 0; i < ITER; i++) fn();
    samples.push((performance.now() - t0) * 1000 / ITER); // µs per op
  }
  return { label, us_per_op: median(samples) };
}

async function main() {
  const mathBox = await loadMathBox();
  const { evaluate: mjsEvaluate } = await import('mathjs');

  console.log(`# math-box vs mathjs benchmark`);
  console.log(`iterations per run: ${ITER.toLocaleString()}, runs: ${RUNS}`);
  console.log();
  console.log(`| case | expression | math-box (µs/op) | mathjs (µs/op) | speedup |`);
  console.log(`|---|---|---:|---:|---:|`);

  for (const c of cases) {
    const mb = bench(`math-box::${c.name}`, () => mathBox.evaluate(c.expr));
    let mjLine = '— | —';
    try {
      // probe mathjs once before bench-loop; if it throws, mark as unsupported
      mjsEvaluate(c.expr);
      const mj = bench(`mathjs::${c.name}`, () => String(mjsEvaluate(c.expr)));
      const speedup = mj.us_per_op / mb.us_per_op;
      mjLine = `${mj.us_per_op.toFixed(2)} | ${speedup.toFixed(2)}×`;
    } catch {
      mjLine = `n/a | n/a`;
    }
    console.log(
      `| ${c.name} | \`${c.expr}\` | ${mb.us_per_op.toFixed(2)} | ${mjLine} |`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
