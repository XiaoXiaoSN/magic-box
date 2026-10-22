import { sourceManifest } from '@modules/boxSources';
import { describe, expect, it, vi } from 'vitest';

import type { ComputeWorkerSource } from '../entry';

describe('compute worker source registry', () => {
  it('keeps the narrow worker loader map aligned with the manifest', async () => {
    const { workerSourceIds } = await import('../registry');
    expect([...workerSourceIds].sort()).toEqual(
      sourceManifest
        .filter((definition) => definition.workerSafe === true)
        .map((definition) => definition.id)
        .sort(),
    );
  });

  it('lazily resolves only explicitly worker-safe sources', async () => {
    const { resolveComputeWorkerSource } = await import('../registry');
    const dataConverter = await resolveComputeWorkerSource('data-converter');
    expect(dataConverter).not.toBeNull();
    expect(await resolveComputeWorkerSource('my-ip')).toBeNull();
    expect(await resolveComputeWorkerSource('missing')).toBeNull();
  });

  it('imports only the source implementation requested by the worker', async () => {
    vi.resetModules();
    const importedModules: string[] = [];
    const source: ComputeWorkerSource = {
      async generateBoxes() {
        return [];
      },
    };
    const mockedModules: ReadonlyArray<
      readonly [string, Record<string, ComputeWorkerSource>]
    > = [
      [
        '@modules/boxSources/Base64BoxSource',
        {
          Base64DecodeBoxSource: source,
          Base64EncodeBoxSource: source,
        },
      ],
      ['@modules/boxSources/CronExpressionBoxSource', { default: source }],
      ['@modules/boxSources/DataConverterBoxSource', { default: source }],
      ['@modules/boxSources/DateCalculateBoxSource', { default: source }],
      ['@modules/boxSources/JsonToolsBoxSource', { default: source }],
      ['@modules/boxSources/MathExpressionBoxSource', { default: source }],
      ['@modules/boxSources/NowBoxSource', { default: source }],
      ['@modules/boxSources/Pbkdf2BoxSource', { default: source }],
      ['@modules/boxSources/SortLinesBoxSource', { default: source }],
      ['@modules/boxSources/TimestampBoxSource', { default: source }],
      ['@modules/boxSources/UnitConverterBoxSource', { default: source }],
      ['@modules/boxSources/WeekNumberBoxSource', { default: source }],
    ];

    for (const [modulePath, mockExports] of mockedModules) {
      vi.doMock(modulePath, () => {
        importedModules.push(modulePath);
        return mockExports;
      });
    }

    try {
      const { resolveComputeWorkerSource } = await import('../registry');
      expect(importedModules).toEqual([]);

      await expect(resolveComputeWorkerSource('missing')).resolves.toBeNull();
      expect(importedModules).toEqual([]);

      await expect(resolveComputeWorkerSource('data-converter')).resolves.toBe(
        source,
      );
      expect(importedModules).toEqual([
        '@modules/boxSources/DataConverterBoxSource',
      ]);

      await expect(resolveComputeWorkerSource('base64-decode')).resolves.toBe(
        source,
      );
      await expect(resolveComputeWorkerSource('base64-encode')).resolves.toBe(
        source,
      );
      expect(importedModules).toEqual([
        '@modules/boxSources/DataConverterBoxSource',
        '@modules/boxSources/Base64BoxSource',
      ]);
    } finally {
      for (const [modulePath] of mockedModules) vi.doUnmock(modulePath);
      vi.resetModules();
    }
  });

  it('retains explicitly registered test sources', async () => {
    const { registerComputeWorkerSource, resolveComputeWorkerSource } =
      await import('../registry');
    const source = {
      async generateBoxes() {
        return [];
      },
    };
    registerComputeWorkerSource('test-source', source);
    await expect(resolveComputeWorkerSource('test-source')).resolves.toBe(
      source,
    );
  });
});
