import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json';
import { writeOfflineToolPack } from './scripts/offline-tool-pack';

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
  'images/maskable-icon-512.png',
]);

const normalizeBuildUrl = (value: string): string | null => {
  if (!value.startsWith('/')) return null;
  return value.split(/[?#]/, 1)[0].replace(/^\/+/, '');
};

const criticalPrecacheTransform = (
  entries: WorkboxManifestEntry[],
  outputDir: string,
): { manifest: WorkboxManifestEntry[]; warnings: string[] } => {
  const available = new Set(entries.map((entry) => entry.url));
  const critical = new Set<string>();
  const addUrl = (value: string): void => {
    const normalized = normalizeBuildUrl(value);
    if (normalized !== null && available.has(normalized))
      critical.add(normalized);
  };

  addUrl('/index.html');
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
    const html = readFileSync(path.join(outputDir, 'index.html'), 'utf8');
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      addUrl(match[1]);
    }

    const rawBuildManifest = JSON.parse(
      readFileSync(path.join(outputDir, 'build-manifest.json'), 'utf8'),
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
      rollupOptions: {
        output: {
          codeSplitting: {
            groups: [
              // Share the small result and string helpers without bundling
              // individual tools or their deferred locale imports.
              {
                name: 'worker-box-helpers',
                test: /[\\/]src[\\/](?:modules[\\/]Box|functions[\\/](?:helper|base64))\.ts$/,
                includeDependenciesRecursively: false,
              },
            ],
          },
        },
      },
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'build',
      manifest: 'build-manifest.json',
      sourcemap: withSentry ? 'hidden' : false,
      rollupOptions: {
        output: {
          codeSplitting: {
            groups: [
              // Browser Cron runs in a worker. Consolidate its retained
              // main-thread fallback without changing the worker imports.
              {
                name: 'cron-locales-fallback',
                test: /[\\/]node_modules[\\/]cronstrue[\\/]locales[\\/]/,
              },
              // Keep the app providers and error boundary in the shared shell chunk.
              {
                name: 'LocaleContext',
                test: /[\\/]src[\\/](?:components[\\/]ErrorBoundary[\\/]index|contexts[\\/](?:Locale|Settings|Preferences|InputDraft)Context)\.tsx$/,
              },
            ],
          },
        },
      },
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
        integration: {
          configureOptions(config, options) {
            const outputDir = path.resolve(config.root, config.build.outDir);
            options.workbox = {
              ...options.workbox,
              manifestTransforms: [
                (entries) => {
                  writeOfflineToolPack(outputDir, buildVersion);
                  return criticalPrecacheTransform(entries, outputDir);
                },
              ],
            };
          },
        },
        manifest: {
          name: 'Magic Box',
          short_name: 'Magic Box',
          description: 'Magic Box Application',
          theme_color: '#f8fafc',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/images/logo-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/images/logo-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/images/maskable-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Version discovery needs a fresh network response on every check.
          globIgnores: [
            'sw.js',
            'manifest.webmanifest',
            'images/logo-*.png',
            'version.json',
            'offline-tool-pack.json',
          ],
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,wasm,woff2,webmanifest,json}',
          ],
          ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^recovery$/],
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2MB
          runtimeCaching: [
            {
              // Hashed feature chunks are cached on first use so loaded tools
              // remain available offline without install-time downloads.
              urlPattern: ({ sameOrigin, url }) =>
                sameOrigin &&
                !url.searchParams.has('offline-pack') &&
                /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:css|js|wasm)$/.test(
                  url.pathname,
                ),
              handler: 'CacheFirst',
              options: {
                cacheName: 'magic-box-feature-assets-v1',
                cacheableResponse: { statuses: [200] },
                matchOptions: { ignoreSearch: true, ignoreVary: true },
                plugins: [
                  {
                    handlerDidError: async ({ request }) => {
                      const packed = await caches.match(request, {
                        cacheName: 'magic-box-offline-tools-v1',
                        ignoreSearch: true,
                        ignoreVary: true,
                      });
                      if (!packed || !new URL(request.url).search)
                        return packed;
                      return new Response(packed.body, {
                        headers: packed.headers,
                        status: packed.status,
                        statusText: packed.statusText,
                      });
                    },
                  },
                  {
                    cachedResponseWillBeUsed: async ({
                      cachedResponse,
                      request,
                    }) => {
                      const url = new URL(request.url);
                      const recovery = url.searchParams.get('recovery');
                      if (
                        !cachedResponse ||
                        url.origin !== self.location.origin ||
                        url.searchParams.size !== 1 ||
                        recovery === null ||
                        !/^\d+$/.test(recovery) ||
                        !/\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.js$/.test(
                          url.pathname,
                        )
                      ) {
                        return cachedResponse;
                      }

                      // module loading rejects a cached response whose stored
                      // URL differs from the fresh recovery module URL.
                      return new Response(cachedResponse.body, {
                        headers: cachedResponse.headers,
                        status: cachedResponse.status,
                        statusText: cachedResponse.statusText,
                      });
                    },
                  },
                ],
                expiration: {
                  maxEntries: 128,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
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
    },
  };
});
