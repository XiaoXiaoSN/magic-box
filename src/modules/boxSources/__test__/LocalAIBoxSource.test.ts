import { parseInput } from '@functions/parseOptions';
import { boxSources } from '@modules/boxSources';
import LocalAIBoxSource from '@modules/boxSources/LocalAIBoxSource';
import { describe, expect, it } from 'vitest';

import { SettingsStorage } from '../../../contexts/SettingsContext';

const run = async (raw: string) => {
  const [input, options] = parseInput(raw);
  return LocalAIBoxSource.generateBoxes(input, options);
};

describe('LocalAIBoxSource', () => {
  it('stays silent for ordinary input so typing cannot surface a 500 MB box', async () => {
    for (const raw of ['', 'hello world', 'ai', '::aim', '::roll=2']) {
      await expect(run(raw)).resolves.toEqual([]);
    }
  });

  it('matches ::ai and ::localai', async () => {
    await expect(run('::ai')).resolves.toHaveLength(1);
    await expect(run('::localai')).resolves.toHaveLength(1);
    await expect(run('::AI')).resolves.toHaveLength(1);
  });

  it('emits an interactive box that owns its own output and cannot be expanded', async () => {
    const [box] = await run('::ai');
    expect(box.props.name).toBe('Local AI');
    // Empty until the template republishes a settled answer: streaming tokens
    // through the box list would re-render every card per token.
    expect(box.props.plaintextOutput).toBe('');
    expect(box.props.showExpandButton).toBe(false);
    expect(box.boxTemplate).toBeTypeOf('function');
  });

  it('is registered and enabled by default so it appears on /list', () => {
    expect(boxSources).toContain(LocalAIBoxSource);
    expect(LocalAIBoxSource.defaultDisabled).toBeUndefined();
    expect(SettingsStorage.get().boxes['Local AI']?.enabled).toBe(true);
  });

  it('is excluded from the node-safe TUI sources', async () => {
    const { tuiBoxSources } = await import('../../../tui/sources');
    expect(tuiBoxSources).not.toContain(LocalAIBoxSource);
  });
});
