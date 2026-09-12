import path from 'node:path';

import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json';

const buildVersion = `${packageJson.version}-${new Date().toISOString()}`;
const buildId = buildVersion.replace(/[^a-zA-Z0-9_-]/g, '-');
const serviceWorkerFileName = `sw-${buildId}.js`;
const serviceWorkerUrl = `/${serviceWorkerFileName}`;

// https://vitejs.dev/config/
export default defineConfig({
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
  worker: {
    format: 'es',
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
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
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
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
        globIgnores: ['sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
        runtimeCaching: [
          {
            // Only the pinned browser entry module. Model and ORT assets use
            // Transformers.js's dedicated cache, not the general app cache.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@4\.2\.0\/dist\/transformers\.min\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'magic-box-local-ai-runtime-v1',
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/mb\.10oz\.tw\/(?!version\.json(?:$|\?)).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
    sentryVitePlugin({
      org: 'xiaoxiao-sn',
      project: 'magic-box',
    }),
  ],
  optimizeDeps: {
    // wasm modules are loaded dynamically; skip pre-bundle
    exclude: ['base64-box', 'math-box'],
    // pre-bundle so cypress component tests don't trigger mid-run
    // re-optimization that reloads the iframe and aborts dynamic
    // imports of *.cy.tsx specs.
    include: ['workbox-window'],
  },
});
