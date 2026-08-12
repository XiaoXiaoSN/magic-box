import { describe, expect, it } from 'vitest';

import { LoremIpsumBoxSource } from '../LoremIpsumBoxSource';

describe('LoremIpsumBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no lorem/words option', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when options do not include lorem or words', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', {
        other: 'value',
      });
      expect(boxes).toHaveLength(0);
    });

    it('::words=5 produces exactly 5 words, capitalized first, ending with period', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', { words: '5' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'Lorem ipsum dolor sit amet.',
      );
    });

    it('::words=5 output has exactly 5 words', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', { words: '5' });
      const text = boxes[0].props.plaintextOutput;
      // strip trailing period and count words
      const words = text.replace(/\.$/, '').split(' ');
      expect(words).toHaveLength(5);
    });

    it('::lorem=2 produces two paragraphs separated by exactly one \\n\\n', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', { lorem: '2' });
      expect(boxes).toHaveLength(1);
      const text = boxes[0].props.plaintextOutput;
      const parts = text.split('\n\n');
      expect(parts).toHaveLength(2);
    });

    it('::lorem=2 output is deterministic', async () => {
      const a = await LoremIpsumBoxSource.generateBoxes('', { lorem: '2' });
      const b = await LoremIpsumBoxSource.generateBoxes('', { lorem: '2' });
      expect(a[0].props.plaintextOutput).toBe(b[0].props.plaintextOutput);
    });

    it('bare ::lorem (value true) defaults to 3 paragraphs', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', {
        lorem: true,
      });
      expect(boxes).toHaveLength(1);
      const text = boxes[0].props.plaintextOutput;
      const parts = text.split('\n\n');
      expect(parts).toHaveLength(3);
    });

    it('box name is Lorem Ipsum', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', { lorem: '1' });
      expect(boxes[0].props.name).toBe('Lorem Ipsum');
    });

    it('box has a template set (CodeBoxTemplate)', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', { lorem: '1' });
      expect(boxes[0].boxTemplate).toBeDefined();
    });

    it('input text is ignored — only options matter', async () => {
      const a = await LoremIpsumBoxSource.generateBoxes('anything here', {
        words: '5',
      });
      const b = await LoremIpsumBoxSource.generateBoxes('', { words: '5' });
      expect(a[0].props.plaintextOutput).toBe(b[0].props.plaintextOutput);
    });

    it('invalid words value falls back to default 50 words', async () => {
      const boxes = await LoremIpsumBoxSource.generateBoxes('', {
        words: 'abc',
      });
      expect(boxes).toHaveLength(1);
      const words = boxes[0].props.plaintextOutput
        .replace(/\.$/, '')
        .split(' ');
      expect(words).toHaveLength(50);
    });
  });
});
