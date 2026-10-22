import type { ConfigEnv, UserConfig } from 'vite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sentryVitePlugin = vi.hoisted(() =>
  vi.fn(() => ({ name: 'sentry-test-plugin' })),
);

vi.mock('@sentry/vite-plugin', () => ({ sentryVitePlugin }));

import viteConfig from '../vite.config';

const configFunction = viteConfig as (env: ConfigEnv) => UserConfig;

function resolveConfig(command: 'build' | 'serve', token?: string): UserConfig {
  const previousToken = process.env.SENTRY_AUTH_TOKEN;
  if (token === undefined) {
    delete process.env.SENTRY_AUTH_TOKEN;
  } else {
    process.env.SENTRY_AUTH_TOKEN = token;
  }

  try {
    return configFunction({
      command,
      mode: 'test',
      isSsrBuild: false,
      isPreview: false,
    });
  } finally {
    if (previousToken === undefined) {
      delete process.env.SENTRY_AUTH_TOKEN;
    } else {
      process.env.SENTRY_AUTH_TOKEN = previousToken;
    }
  }
}

describe('Vite build configuration', () => {
  beforeEach(() => {
    sentryVitePlugin.mockClear();
  });

  it('does not enable Sentry or maps without a token', () => {
    const config = resolveConfig('build');

    expect(config.build?.sourcemap).toBe(false);
    expect(sentryVitePlugin).not.toHaveBeenCalled();
  });

  it('does not enable Sentry for development with a token', () => {
    const config = resolveConfig('serve', 'test-token');

    expect(config.build?.sourcemap).toBe(false);
    expect(sentryVitePlugin).not.toHaveBeenCalled();
  });

  it('enables hidden maps and cleanup for a tokenized deployment build', () => {
    const config = resolveConfig('build', 'test-token');

    expect(config.build?.sourcemap).toBe('hidden');
    expect(sentryVitePlugin).toHaveBeenCalledWith({
      authToken: 'test-token',
      org: 'xiaoxiao-sn',
      project: 'magic-box',
      telemetry: false,
      sourcemaps: {
        filesToDeleteAfterUpload: ['build/**/*.map'],
      },
    });
  });

  it('consolidates only the client Cron locale fallback graph', () => {
    const config = resolveConfig('build');
    const output = config.build?.rollupOptions?.output;
    expect(Array.isArray(output)).toBe(false);
    const manualChunks = Array.isArray(output)
      ? undefined
      : output?.manualChunks;
    expect(typeof manualChunks).toBe('function');

    const resolveChunk = manualChunks as (id: string) => string | undefined;
    expect(resolveChunk('/repo/node_modules/cronstrue/locales/zh_TW.js')).toBe(
      'cron-locales-fallback',
    );
    expect(
      resolveChunk('/repo/src/modules/boxSources/CronExpressionBoxSource.ts'),
    ).toBeUndefined();
  });
});
