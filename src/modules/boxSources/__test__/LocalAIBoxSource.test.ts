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

  it('carries the text in front of the directive as the prompt', async () => {
    const [box] = await run('say hello\n::ai');
    expect(box.props.sourceInput).toBe('say hello');
    // Carried, not executed: the box itself still produces no output.
    expect(box.props.plaintextOutput).toBe('');
  });

  it('reads text after the directive on the same line as the prompt', async () => {
    // Regression: `parseInput` takes it as the option value and strips the
    // line, so `::ai what is WebGPU?` used to arrive as an empty prompt.
    const [inline] = await run('::ai what is WebGPU?');
    expect(inline.props.sourceInput).toBe('what is WebGPU?');
    const [both] = await run('draft notes\n::ai summarize these');
    expect(both.props.sourceInput).toBe('draft notes\nsummarize these');
  });

  it('leaves the prompt empty when the directive stands alone', async () => {
    const [box] = await run('::ai');
    expect(box.props.sourceInput).toBe('');
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
