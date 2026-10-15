import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json';

const getBuildRevision = (): string => {
  const githubSha = process.env.GITHUB_SHA?.trim();
  if (githubSha) return githubSha.slice(0, 12);

  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'local';
  }
};

const buildVersion = `${packageJson.version}-${getBuildRevision()}`;
const buildId = buildVersion.replace(/[^a-zA-Z0-9_-]/g, '-');
const serviceWorkerFileName = `sw-${buildId}.js`;
const serviceWorkerUrl = `/${serviceWorkerFileName}`;

interface WorkboxManifestEntry {
  url: string;
  revision: string | null;
  size: number;
}

interface ViteManifestEntry {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
}

const staticShellUrls = new Set([
  'apple-touch-icon.png',
  'favicon.ico',
  'manifest.webmanifest',
  'masked-icon.svg',
]);

const normalizeBuildUrl = (value: string): string | null => {
  if (!value.startsWith('/')) return null;
  return value.split(/[?#]/, 1)[0].replace(/^\/+/, '');
};

const criticalPrecacheTransform = (
  entries: WorkboxManifestEntry[],
): { manifest: WorkboxManifestEntry[]; warnings: string[] } => {
  const available = new Set(entries.map((entry) => entry.url));
  const critical = new Set<string>();
  const addUrl = (value: string): void => {
    const normalized = normalizeBuildUrl(value);
    if (normalized !== null && available.has(normalized))
      critical.add(normalized);
  };

  addUrl('/index.html');
  addUrl('/version.json');
  for (const entry of entries) {
    if (
      staticShellUrls.has(entry.url) ||
      entry.url.startsWith('fonts/') ||
      entry.url.startsWith('images/logo-')
    ) {
      critical.add(entry.url);
    }
  }

  try {
    const html = readFileSync(
      path.resolve(__dirname, 'build/index.html'),
      'utf8',
    );
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      addUrl(match[1]);
    }

    const rawBuildManifest = JSON.parse(
      readFileSync(
        path.resolve(__dirname, 'build/build-manifest.json'),
        'utf8',
      ),
    ) as Record<string, ViteManifestEntry>;
    const visited = new Set<string>();
    const addViteEntry = (key: string, includeDynamicImports = false): void => {
      if (visited.has(key)) return;
      visited.add(key);
      const entry = rawBuildManifest[key];
      if (!entry) return;

      addUrl(`/${entry.file}`);
      for (const css of entry.css ?? []) addUrl(`/${css}`);
      for (const asset of entry.assets ?? []) addUrl(`/${asset}`);
      for (const imported of entry.imports ?? []) addViteEntry(imported);
      if (includeDynamicImports) {
        for (const imported of entry.dynamicImports ?? []) {
          addViteEntry(imported);
        }
      }
    };

    // the home route is the only feature route in the initial shell. its small
    // first-level loader is part of the shell; deeper feature implementations
    // stay runtime-cached so disabled tools and heavy templates are not
    // downloaded during service-worker installation.
    addViteEntry('index.html');
    addViteEntry('src/pages/MagicBox/index.ts', true);
  } catch {
    // keep the shell and static assets available if a nonstandard build omits
    // Vite's manifest; regular production builds always emit it below.
  }

  const manifest: WorkboxManifestEntry[] = [];
  for (const entry of entries) {
    if (
      critical.has(entry.url) &&
      !manifest.some((item) => item.url === entry.url)
    ) {
      manifest.push(entry);
    }
  }

  return { manifest, warnings: [] };
};

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const withSentry =
    command === 'build' && Boolean(process.env.SENTRY_AUTH_TOKEN);

  return {
    define: {
      __BUILD_VERSION__: JSON.stringify(buildVersion),
      __SERVICE_WORKER_URL__: JSON.stringify(serviceWorkerUrl),
    },
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, './src/components'),
        '@functions': path.resolve(__dirname, './src/functions'),
        '@global': path.resolve(__dirname, './src/global'),
        '@modules': path.resolve(__dirname, './src/modules'),
        '@pages': path.resolve(__dirname, './src/pages'),
      },
    },
    // the local AI inference worker is a module worker (it dynamic-imports the
    // pinned transformers build), which requires the es output format.
    worker: {
      format: 'es',
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'build',
      manifest: 'build-manifest.json',
      sourcemap: withSentry ? 'hidden' : false,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    },
    plugins: [
      {
        name: 'build-version-manifest',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: `${JSON.stringify({
              version: buildVersion,
              serviceWorker: serviceWorkerUrl,
            })}\n`,
          });
        },
      },
      react(),
      VitePWA({
        filename: serviceWorkerFileName,
        injectRegister: false,
        registerType: 'prompt',
        manifest: {
          name: 'Magic Box',
          short_name: 'Magic Box',
          description: 'Magic Box Application',
          theme_color: '#d18fd8',
          background_color: '#fafafa',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/images/logo-16.png',
              sizes: '16x16',
              type: 'image/png',
              purpose: 'maskable any',
            },
            {
              src: '/images/logo-64.png',
              sizes: '64x64',
              type: 'image/png',
              purpose: 'maskable any',
            },
            {
              src: '/images/logo-128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'maskable any',
            },
            {
              src: '/images/logo-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable any',
            },
            {
              src: '/images/logo-256.png',
              sizes: '256x256',
              type: 'image/png',
              purpose: 'maskable any',
            },
            {
              src: '/images/logo-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable any',
            },
          ],
        },
        workbox: {
          globIgnores: ['sw.js', 'manifest.webmanifest', 'images/logo-*.png'],
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,wasm,woff2,webmanifest,json}',
          ],
          manifestTransforms: [criticalPrecacheTransform],
          ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^recovery$/],
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2MB
          runtimeCaching: [
            {
              // Hashed feature chunks are cached on first use so loaded tools
              // remain available offline without install-time downloads.
              urlPattern: /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:css|js|wasm)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'magic-box-feature-assets-v1',
                cacheableResponse: { statuses: [200] },
                expiration: {
                  maxEntries: 128,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
              },
            },
            {
              // Only the pinned browser entry module. Model weights and the ORT
              // wasm assets go to transformers.js's own cache, never this one, so
              // the 4 MiB precache budget above is unaffected.
              urlPattern:
                /^https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@4\.3\.0\/dist\/transformers\.min\.js$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'magic-box-local-ai-runtime-v2',
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
      }),
      ...(withSentry
        ? [
            sentryVitePlugin({
              authToken: process.env.SENTRY_AUTH_TOKEN,
              org: 'xiaoxiao-sn',
              project: 'magic-box',
              telemetry: false,
              sourcemaps: {
                filesToDeleteAfterUpload: ['build/**/*.map'],
              },
            }),
          ]
        : []),
    ],
    optimizeDeps: {
      // wasm modules are loaded dynamically; skip pre-bundle
      exclude: ['base64-box', 'math-box'],
      // pre-bundle so cypress component tests don't trigger mid-run
      // re-optimization that reloads the iframe and aborts dynamic
      // imports of *.cy.tsx specs.
      include: ['workbox-window'],
    },
  };
});
