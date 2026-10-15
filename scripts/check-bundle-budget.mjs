import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const buildDir = path.resolve(argument('--build-dir', 'build'));
const configPath = path.resolve(
  argument('--config', 'scripts/bundle-budget.json'),
);
const baselinePath = argument('--baseline', null);
const outputPath = path.resolve(
  argument('--output', 'bundle-budget-report.json'),
);

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`unable to parse ${label}: ${error.message}`);
  }
}

async function fileSize(filePath, label) {
  try {
    return (await stat(filePath)).size;
  } catch (error) {
    throw new Error(`missing ${label}: ${error.message}`);
  }
}

function findManifestArray(source, swName) {
  const callStart = source.indexOf('precacheAndRoute(');
  if (callStart === -1) {
    throw new Error(`precacheAndRoute manifest not found in ${swName}`);
  }

  const arrayStart = source.indexOf('[', callStart);
  if (arrayStart === -1) {
    throw new Error(`precacheAndRoute manifest is not an array in ${swName}`);
  }

  let depth = 0;
  let quote = null;
  let arrayEnd = -1;
  for (let index = arrayStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    if (character === ']' && --depth === 0) {
      arrayEnd = index;
      break;
    }
  }
  if (arrayEnd === -1 || quote) {
    throw new Error(`unterminated precacheAndRoute manifest in ${swName}`);
  }

  const raw = source.slice(arrayStart, arrayEnd + 1);
  const entryPattern =
    /\{url:("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'),revision:(null|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\}/g;
  const entries = [];
  for (const match of raw.matchAll(entryPattern)) {
    const url = JSON.parse(
      match[1].startsWith("'")
        ? `"${match[1].slice(1, -1).replaceAll('"', '\\"')}"`
        : match[1],
    );
    entries.push({ url });
  }
  const remainder = raw.replace(entryPattern, '').replace(/[\s,]/g, '');
  if (entries.length === 0 || remainder !== '[]') {
    throw new Error(`unparseable precacheAndRoute manifest in ${swName}`);
  }
  return entries;
}

async function findPrecacheManifest() {
  const names = await readdir(buildDir);
  const serviceWorkers = names.filter(
    (name) => name.startsWith('sw-') && name.endsWith('.js'),
  );
  if (serviceWorkers.length !== 1) {
    throw new Error(
      `expected one generated service worker, found ${serviceWorkers.length}`,
    );
  }
  const name = serviceWorkers[0];
  return { name, source: await readFile(path.join(buildDir, name), 'utf8') };
}

async function calculateMetrics() {
  const htmlPath = path.join(buildDir, 'index.html');
  const html = await readFile(htmlPath, 'utf8').catch((error) => {
    throw new Error(`missing build/index.html: ${error.message}`);
  });
  const references = [
    ...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/g),
  ].map((match) => match[1]);
  if (references.length === 0) {
    throw new Error('index.html has no JS or CSS asset references');
  }
  let htmlEntryGzipBytes = 0;
  for (const reference of references) {
    const assetPath = path.join(buildDir, reference.slice(1));
    const bytes = await readFile(assetPath).catch((error) => {
      throw new Error(`missing HTML asset ${reference}: ${error.message}`);
    });
    htmlEntryGzipBytes += gzipSync(bytes).length;
  }

  const { name, source } = await findPrecacheManifest();
  const entries = findManifestArray(source, name);
  let precacheBytes = 0;
  for (const entry of entries) {
    const relativePath = entry.url.replace(/^\/+/, '');
    precacheBytes += await fileSize(
      path.join(buildDir, relativePath),
      `precache entry ${entry.url}`,
    );
  }

  const assets = await readdir(path.join(buildDir, 'assets')).catch((error) => {
    throw new Error(`missing build/assets: ${error.message}`);
  });
  const jsFiles = assets.filter((name) => name.endsWith('.js')).length;
  if (jsFiles === 0)
    throw new Error('build/assets contains no JavaScript files');

  return {
    htmlEntryGzipBytes,
    precacheEntries: entries.length,
    precacheBytes,
    jsFiles,
  };
}

function checkBudgets(metrics, budgets) {
  return Object.fromEntries(
    Object.entries(budgets).map(([name, maximum]) => [
      name,
      { actual: metrics[name], maximum, passed: metrics[name] <= maximum },
    ]),
  );
}

async function loadBaseline() {
  if (!baselinePath)
    return { status: 'unavailable', reason: 'no baseline supplied' };
  const resolvedPath = path.resolve(baselinePath);
  let baseline;
  try {
    baseline = JSON.parse(await readFile(resolvedPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { status: 'unavailable', reason: 'baseline artifact not found' };
    }
    throw new Error(`unable to parse baseline: ${error.message}`);
  }
  const metrics = baseline.metrics ?? baseline;
  for (const key of [
    'htmlEntryGzipBytes',
    'precacheEntries',
    'precacheBytes',
    'jsFiles',
  ]) {
    if (!Number.isFinite(metrics[key])) {
      throw new Error(`baseline is missing numeric ${key}`);
    }
  }
  return { status: 'available', metrics };
}

const config = await readJson(configPath, 'bundle budget config');
if (!config.baseline || !config.budgets) {
  throw new Error('bundle budget config must contain baseline and budgets');
}
const metrics = await calculateMetrics();
const budgetChecks = checkBudgets(metrics, config.budgets);
const baseline = await loadBaseline();
const comparison =
  baseline.status === 'available'
    ? Object.fromEntries(
        Object.keys(metrics).map((name) => [
          name,
          {
            baseline: baseline.metrics[name],
            actual: metrics[name],
            delta: metrics[name] - baseline.metrics[name],
          },
        ]),
      )
    : null;
const report = {
  scope: config.scope,
  metrics,
  configuredBaseline: config.baseline,
  budgets: budgetChecks,
  baselineComparison: { ...baseline, comparison },
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
const metricLabels = {
  htmlEntryGzipBytes: 'HTML entry JS/CSS gzip',
  precacheEntries: 'Precache entries',
  precacheBytes: 'Precache bytes',
  jsFiles: 'JavaScript assets',
};
const summary = [
  '### Bundle budget',
  '',
  `- Main artifact comparison: ${baseline.status}${baseline.reason ? ` (${baseline.reason})` : ''}`,
  ...Object.entries(metricLabels).map(([name, label]) => {
    const comparisonMetric = comparison?.[name];
    const base = comparisonMetric?.baseline ?? 'unavailable';
    const delta = comparisonMetric?.delta ?? 'unavailable';
    const check = budgetChecks[name];
    return `- ${label}: current ${metrics[name]}, base ${base}, delta ${delta}, limit ${check.maximum}, ${check.passed ? 'PASS' : 'FAIL'}`;
  }),
  '',
  `Machine-readable report: ${outputPath}`,
  '',
].join('\n');
if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
}
console.log(summary);
if (Object.values(budgetChecks).some((check) => !check.passed)) {
  process.exitCode = 1;
}
