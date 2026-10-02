import { cheatSheetTopics } from '@functions/cheatSheets';
import { describe, expect, it, vi } from 'vitest';
import CheatSheetBoxSource from '../CheatSheetBoxSource';

describe('Cheat Sheet', () => {
  it.each(
    cheatSheetTopics,
  )('provides offline examples for %s', async (topic) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const boxes = await CheatSheetBoxSource.generateBoxes(topic);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toContain(topic);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it.each([
    'curl',
    'cul',
    ' CURL ',
    'cheat:curl',
  ])('supports command input %s', async (input) => {
    const [box] = await CheatSheetBoxSource.generateBoxes(input);
    expect(box.props.plaintextOutput).toContain('curl <url> -o <outfile>');
  });
  it('accepts a directive value and reports unsupported topics', async () => {
    const [box] = await CheatSheetBoxSource.generateBoxes('', { cheat: 'git' });
    expect(box.props.plaintextOutput).toContain('git switch -c');
    const [missing] = await CheatSheetBoxSource.generateBoxes('unknown', {
      cheatsheet: true,
    });
    expect(missing.props.plaintextOutput).toContain('Available topics:');
  });
  it.each([
    'hello world',
    'curl https://example.com',
    '__proto__',
    'constructor',
  ])('does not treat ordinary input as a topic: %s', async (input) => {
    expect(await CheatSheetBoxSource.generateBoxes(input)).toEqual([]);
  });
});
