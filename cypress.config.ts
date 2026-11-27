import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { promisify } from 'node:util';
import { defineConfig } from 'cypress';

const execFileAsync = promisify(execFile);
const preprocessorDir = join(tmpdir(), 'magic-box-cypress-preprocessor');

// use the pinned Bun toolchain so Cypress does not load a mismatched webpack TypeScript compiler.
export async function preprocessCypressFile(
  file: Cypress.FileObject,
): Promise<string> {
  await mkdir(preprocessorDir, { recursive: true });
  const fileKey = createHash('sha256')
    .update(file.filePath)
    .digest('hex')
    .slice(0, 12);
  const outputPath = join(
    preprocessorDir,
    `${basename(file.filePath, extname(file.filePath))}-${fileKey}.js`,
  );

  await execFileAsync(
    'bun',
    [
      'build',
      file.filePath,
      '--target=browser',
      '--format=cjs',
      `--outfile=${outputPath}`,
    ],
    { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 },
  );

  return outputPath;
}

async function buildPwaUpdateManifest(): Promise<unknown> {
  const outputDir = await mkdtemp(join(tmpdir(), 'magic-box-pwa-update-'));
  try {
    await execFileAsync(
      'bun',
      ['x', '--no-install', 'vite', 'build', '--outDir', outputDir],
      {
        env: {
          ...process.env,
          GITHUB_SHA: randomBytes(6).toString('hex'),
          SENTRY_AUTH_TOKEN: '',
        },
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return JSON.parse(await readFile(join(outputDir, 'version.json'), 'utf8'));
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

export default defineConfig({
  projectId: 'sjqi3t',
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    excludeSpecPattern: ['cypress/e2e/math-wasm-offline.cy.ts'],
    setupNodeEvents(on) {
      on('file:preprocessor', preprocessCypressFile);
      on('task', { buildPwaUpdateManifest });
    },
  },
  component: {
    specPattern: 'src/**/*.cy.{ts,tsx}',
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
