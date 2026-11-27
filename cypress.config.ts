import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { defineConfig } from 'cypress';
import { preprocessCypressFile } from './cypress/preprocess';

export { preprocessCypressFile };

const execFileAsync = promisify(execFile);

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
