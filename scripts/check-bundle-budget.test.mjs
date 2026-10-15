import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
let fixture;

async function createFixture() {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'magic-box-budget-'));
  const buildDir = path.join(rootDir, 'build');
  await mkdir(path.join(buildDir, 'assets'), { recursive: true });
  await writeFile(
    path.join(buildDir, 'index.html'),
    '<script type="module" src="/assets/main.js"></script><link rel="stylesheet" href="/assets/main.css">\n',
  );
  await writeFile(
    path.join(buildDir, 'assets', 'main.js'),
    'console.log("fixture");\n',
  );
  await writeFile(
    path.join(buildDir, 'assets', 'main.css'),
    'body { color: red; }\n',
  );
  await writeFile(
    path.join(buildDir, 'sw-fixture.js'),
    'precacheAndRoute([{url:"index.html",revision:null},{url:"assets/main.js",revision:"1"},{url:"assets/main.css",revision:"1"}]);\n',
  );

  const baselinePath = path.join(rootDir, 'baseline.json');
  await writeFile(
    baselinePath,
    `${JSON.stringify({
      metrics: {
        htmlEntryGzipBytes: 0,
        precacheEntries: 0,
        precacheBytes: 0,
        jsFiles: 0,
      },
    })}\n`,
  );

  const configPath = path.join(rootDir, 'budget.json');
  await writeFile(
    configPath,
    `${JSON.stringify({
      scope: 'fixture',
      baseline: {
        htmlEntryGzipBytes: 0,
        precacheEntries: 0,
        precacheBytes: 0,
        jsFiles: 0,
      },
      budgets: {
        htmlEntryGzipBytes: 1_000_000,
        precacheEntries: 10,
        precacheBytes: 1_000_000,
        jsFiles: 10,
      },
    })}\n`,
  );

  return { baselinePath, buildDir, configPath, rootDir };
}

function runBudget(currentFixture, configPath, baselinePath) {
  const outputPath = path.join(
    currentFixture.rootDir,
    `${path.basename(configPath)}.report.json`,
  );
  const args = [
    path.join(repositoryRoot, 'scripts/check-bundle-budget.mjs'),
    '--build-dir',
    currentFixture.buildDir,
    '--config',
    configPath,
    '--output',
    outputPath,
  ];
  if (baselinePath) args.push('--baseline', baselinePath);

  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return {
    exitCode: result.status,
    output,
    report: existsSync(outputPath)
      ? JSON.parse(readFileSync(outputPath, 'utf8'))
      : null,
  };
}

describe('check-bundle-budget fixtures', () => {
  beforeEach(async () => {
    fixture = await createFixture();
  });

  afterEach(async () => {
    await rm(fixture.rootDir, { recursive: true, force: true });
  });

  it('writes passing metrics and main-artifact deltas', () => {
    const result = runBudget(fixture, fixture.configPath, fixture.baselinePath);
    const report = result.report;

    expect(result.exitCode).toBe(0);
    expect(report.baselineComparison.status).toBe('available');
    expect(Object.values(report.budgets).every((budget) => budget.passed)).toBe(
      true,
    );
    expect(result.output).toContain('current');
    expect(result.output).toContain('base 0');
    expect(result.output).toContain('delta');
    expect(result.output).toContain('limit');
    expect(result.output).toContain('PASS');
  });

  it('reports an unavailable main baseline explicitly', () => {
    const result = runBudget(fixture, fixture.configPath);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(
      'Main artifact comparison: unavailable (no baseline supplied)',
    );
    expect(result.output).toContain('base unavailable');
  });

  it('writes a failing report before returning a budget failure', async () => {
    const configPath = path.join(fixture.rootDir, 'exceeded.json');
    await writeFile(
      configPath,
      `${JSON.stringify({
        scope: 'fixture',
        baseline: {
          htmlEntryGzipBytes: 0,
          precacheEntries: 0,
          precacheBytes: 0,
          jsFiles: 0,
        },
        budgets: {
          htmlEntryGzipBytes: 0,
          precacheEntries: 10,
          precacheBytes: 1_000_000,
          jsFiles: 10,
        },
      })}\n`,
    );

    const result = runBudget(fixture, configPath, fixture.baselinePath);
    const budget = result.report.budgets.htmlEntryGzipBytes;

    expect(result.exitCode).toBe(1);
    expect(budget.actual).toBeGreaterThan(0);
    expect(budget.maximum).toBe(0);
    expect(budget.passed).toBe(false);
    expect(result.output).toContain('limit 0, FAIL');
  });
});
