import {
  getLocale,
  getTimezoneOffset,
  setRuntimePrefs,
} from '@functions/runtimePrefs';
import { BoxBuilder } from '@modules/Box';
import { describe, expect, it } from 'vitest';
import type { ComputeWorkerEvent, ComputeWorkerRunRequest } from '../dto';
import { type ComputeWorkerSource, executeComputeWorkerRun } from '../entry';

const request: ComputeWorkerRunRequest = {
  type: 'run',
  runId: 'run-1',
  input: 'input',
  options: null,
  sourceIds: ['fast', 'throws', 'last'],
  now: 1_704_067_200_000,
  locale: 'en-US',
  timezone: 'UTC',
  timezoneOffset: 0,
  timezoneMode: 'fixed',
};

function source(output: string): ComputeWorkerSource {
  return {
    async generateBoxes() {
      return [
        {
          props: {
            name: output,
            plaintextOutput: output,
            options: null,
            onClick: () => {},
          },
        },
      ];
    },
  };
}

describe('compute worker entry', () => {
  it('runs sources in order and isolates source exceptions', async () => {
    const events: ComputeWorkerEvent[] = [];
    const sources = new Map<string, ComputeWorkerSource>([
      ['fast', source('fast')],
      ['last', source('last')],
      [
        'throws',
        {
          async generateBoxes() {
            throw new Error('broken source');
          },
        },
      ],
    ]);

    await executeComputeWorkerRun(
      request,
      (sourceId) => sources.get(sourceId) ?? null,
      { postMessage: (event) => events.push(event) },
    );

    expect(events.map((event) => event.type)).toEqual([
      'started',
      'source-load-start',
      'source-start',
      'source-result',
      'source-load-start',
      'source-start',
      'source-error',
      'source-load-start',
      'source-start',
      'source-result',
      'finished',
    ]);
    expect(events.find((event) => event.type === 'source-error')).toMatchObject(
      {
        sourceId: 'throws',
        message: 'broken source',
      },
    );
  });

  it('supports async source resolution before announcing execution', async () => {
    const events: ComputeWorkerEvent[] = [];
    let resolved = false;
    await executeComputeWorkerRun(
      { ...request, sourceIds: ['lazy'] },
      async () => {
        await Promise.resolve();
        resolved = true;
        return source('lazy');
      },
      { postMessage: (event) => events.push(event) },
    );

    expect(resolved).toBe(true);
    expect(events.map((event) => event.type)).toEqual([
      'started',
      'source-load-start',
      'source-start',
      'source-result',
      'finished',
    ]);
  });

  it('applies locale and timezone preferences before each source runs', async () => {
    const events: ComputeWorkerEvent[] = [];
    const seen: Array<{
      contextLocale: string | undefined;
      contextOffset: number | undefined;
      contextNow: number | undefined;
      runtimeLocale: string;
      runtimeOffset: number;
    }> = [];
    const preferenceRequest: ComputeWorkerRunRequest = {
      ...request,
      locale: 'zh_TW',
      timezoneOffset: -5,
      timezoneMode: 'fixed',
    };

    try {
      await executeComputeWorkerRun(
        { ...preferenceRequest, sourceIds: ['prefs'] },
        () => ({
          async generateBoxes(_input, _options, context) {
            seen.push({
              contextLocale: context?.locale,
              contextOffset: context?.timezoneOffset,
              contextNow: context?.now,
              runtimeLocale: getLocale(),
              runtimeOffset: getTimezoneOffset(new Date(0)),
            });
            return [];
          },
        }),
        { postMessage: (event) => events.push(event) },
      );
    } finally {
      setRuntimePrefs({
        locale: 'en',
        timezoneOffset: 8,
        timezoneMode: 'fixed',
      });
    }

    expect(seen).toEqual([
      {
        contextLocale: 'zh_TW',
        contextOffset: -5,
        contextNow: 1_704_067_200_000,
        runtimeLocale: 'zh_TW',
        runtimeOffset: -5,
      },
    ]);
  });

  it('reports oversized valid output instead of silently dropping the box', async () => {
    const events: ComputeWorkerEvent[] = [];
    await executeComputeWorkerRun(
      { ...request, sourceIds: ['oversized'] },
      () => ({
        async generateBoxes() {
          return [new BoxBuilder('JSON Output', 'x'.repeat(1_048_577)).build()];
        },
      }),
      { postMessage: (event) => events.push(event) },
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'source-error',
        sourceId: 'oversized',
        message:
          'Worker source returned a box that exceeds the transferable output limits.',
      }),
    );
    expect(events.some((event) => event.type === 'source-result')).toBe(false);
  });
});
