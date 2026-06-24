import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { WordsToNumberBoxSource } from '../WordsToNumberBoxSource';

describe('WordsToNumberBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes(
        'forty-two',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes('forty-two', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with option', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes('', {
        wordstonum: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes('   ', {
        wordstonum: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('basic parsing with ::wordstonum', () => {
    it('parses "forty-two" → 42', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes('forty-two', {
        wordstonum: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('42');
    });

    it('parses "one hundred" → 100', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes('one hundred', {
        wordstonum: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('100');
    });

    it('parses "one hundred one" → 101', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes(
        'one hundred one',
        {
          wordstonum: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('101');
    });

    it('parses "one thousand two hundred thirty-four" → 1234', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes(
        'one thousand two hundred thirty-four',
        { wordstonum: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1234');
    });

    it('parses "one million two hundred thirty-four thousand five hundred sixty-seven" → 1234567', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes(
        'one million two hundred thirty-four thousand five hundred sixty-seven',
        { wordstonum: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1234567');
    });

    it('parses "negative five" → -5', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes(
        'negative five',
        {
          wordstonum: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('-5');
    });

    it('parses "zero" → 0', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes('zero', {
        wordstonum: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('0');
    });
  });

  describe('alias option ::wordstonumber', () => {
    it('also triggers on ::wordstonumber', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes('five', {
        wordstonumber: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('5');
    });
  });

  describe('unrecognized word', () => {
    it('returns a box mentioning the unrecognized word for "one bazillion"', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes(
        'one bazillion',
        {
          wordstonum: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain("couldn't parse");
      expect(boxes[0].props.plaintextOutput).toContain('bazillion');
    });
  });

  describe('box metadata', () => {
    it('sets correct name, priority, template, and showExpandButton', async () => {
      const boxes = await WordsToNumberBoxSource.generateBoxes('ten', {
        wordstonum: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Words to Number');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.showExpandButton).toBe(false);
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });
  });
});
