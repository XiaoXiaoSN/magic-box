// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { TerminalUsageError } from '../options';
import {
  selectTerminalSources,
  terminalSourceInfo,
  tuiBoxSources,
} from '../sources';

describe('headless terminal registry', () => {
  it('resolves stable ids and unambiguous source names', () => {
    expect(selectTerminalSources(['uuid']).map((source) => source.id)).toEqual([
      'uuid',
    ]);
    expect(
      selectTerminalSources(['Math Expression']).map((source) => source.id),
    ).toEqual(['math-expression']);
  });

  it('deduplicates repeated selectors and rejects network sources', () => {
    expect(selectTerminalSources(['uuid', 'UUID'])).toHaveLength(1);
    expect(() => selectTerminalSources(['my-ip'])).toThrow(TerminalUsageError);
    expect(
      tuiBoxSources.every(
        (source) =>
          source.headless === true && source.sideEffects !== 'network',
      ),
    ).toBe(true);
  });

  it('lists stable ids and default examples from the shared registry', () => {
    const uuid = terminalSourceInfo().find((source) => source.id === 'uuid');
    expect(uuid).toMatchObject({ name: 'UUID', defaultInput: 'uuid' });
  });
});
