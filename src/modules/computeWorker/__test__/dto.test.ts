import { describe, expect, it } from 'vitest';

import {
  type ComputeWorkerRunRequest,
  isComputeWorkerRunRequest,
  isWorkerBoxDTO,
  rehydrateWorkerBox,
  serializeWorkerBoxes,
  toWorkerBox,
} from '../dto';

describe('compute worker DTOs', () => {
  it('removes callbacks and survives structured cloning', () => {
    const box = {
      props: {
        name: 'Result',
        plaintextOutput: 'value',
        options: { language: 'text' },
        onClick: () => {},
        sourceInput: 'input',
      },
      view: 'code' as const,
    };
    const dto = toWorkerBox(box);
    expect(dto).not.toBeNull();
    expect(() => structuredClone(dto)).not.toThrow();
    expect(dto).toEqual({
      name: 'Result',
      plaintextOutput: 'value',
      options: { language: 'text' },
      sourceInput: 'input',
      view: 'code',
    });

    expect(dto).toBeDefined();
    const rehydrated = rehydrateWorkerBox(dto as NonNullable<typeof dto>);
    expect(rehydrated.props.onClick).toEqual(expect.any(Function));
    expect(rehydrated.props.onClick('copied')).toBeUndefined();
  });

  it('excludes custom templates from the worker DTO', () => {
    const dto = toWorkerBox({
      props: {
        name: 'Interactive',
        plaintextOutput: 'value',
        options: null,
        onClick: () => {},
      },
      boxTemplate: () => null,
    });
    expect(dto).toBeNull();
  });

  it('validates bounded run input and primitive options', () => {
    const request: ComputeWorkerRunRequest = {
      type: 'run',
      runId: 'run-1',
      input: 'input',
      options: { locale: 'en', preview: true },
      sourceIds: ['a', 'b'],
      now: 1_704_067_200_000,
      locale: 'en-US',
      timezone: 'Asia/Taipei',
      timezoneOffset: 8,
      timezoneMode: 'fixed',
    };
    expect(isComputeWorkerRunRequest(request)).toBe(true);
    expect(
      isWorkerBoxDTO({
        name: 'x',
        plaintextOutput: 'y',
        options: null,
      }),
    ).toBe(true);
    expect(
      isComputeWorkerRunRequest({
        ...request,
        input: 'x'.repeat(1024 * 1024 + 1),
      }),
    ).toBe(false);
    expect(
      isComputeWorkerRunRequest({ ...request, options: { bad: { value: 1 } } }),
    ).toBe(false);
    expect(isComputeWorkerRunRequest({ ...request, now: Number.NaN })).toBe(
      false,
    );
  });

  it('rejects output that exceeds the transferable string budget', () => {
    const oversized = toWorkerBox({
      props: {
        name: 'JSON Output',
        plaintextOutput: 'x'.repeat(1_048_577),
        options: null,
        onClick: () => {},
      },
    });

    expect(oversized).toBeNull();
    expect(() =>
      serializeWorkerBoxes([
        {
          props: {
            name: 'JSON Output',
            plaintextOutput: 'x'.repeat(1_048_577),
            options: null,
            onClick: () => {},
          },
        },
      ]),
    ).toThrow('exceeds the transferable output limits');
  });
});
