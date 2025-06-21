import { describe, expect, it } from 'vitest';

import { WordCountBoxSource } from '@modules/boxSources/WordCountBoxSource';

describe('WordCountBoxSource', () => {
  it('should return correct counts for a simple string', async () => {
    const input = 'hello world';
    const boxes = await WordCountBoxSource.generateBoxes(input);
    expect(boxes).toHaveLength(1);
    const box = boxes[0];
    expect(box.props.name).toBe('Word Count');
    expect(box.props.plaintextOutput).toBe('lines: 1\nwords: 2\ncharacters: 11');
  });

  it('should return correct counts for a multi-line string', async () => {
    const input = 'hello world\nthis is a test';
    const boxes = await WordCountBoxSource.generateBoxes(input);
    expect(boxes).toHaveLength(1);
    const box = boxes[0];
    expect(box.props.name).toBe('Word Count');
    expect(box.props.plaintextOutput).toBe('lines: 2\nwords: 6\ncharacters: 26');
    expect(box.props.options).toEqual({
      lines: '2',
      words: '6',
      characters: '26',
    });
  });

  it('should return no boxes for an empty string', async () => {
    const input = '';
    const boxes = await WordCountBoxSource.generateBoxes(input);
    expect(boxes).toHaveLength(0);
  });

  it('should return no boxes for a string with only whitespace', async () => {
    const input = '   ';
    const boxes = await WordCountBoxSource.generateBoxes(input);
    expect(boxes).toHaveLength(0);
  });
});
