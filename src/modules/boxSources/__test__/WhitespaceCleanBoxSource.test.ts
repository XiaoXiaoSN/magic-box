import { describe, expect, it } from 'vitest';

import { WhitespaceCleanBoxSource } from '../WhitespaceCleanBoxSource';

describe('WhitespaceCleanBoxSource', () => {
  describe('generateBoxes — gate conditions', () => {
    it('returns [] when no option is supplied', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes(
        '  hello   world  ',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is supplied', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes(
        '  hello   world  ',
        { json: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty string with ::clean', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes('', {
        clean: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with ::clean', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes(
        '   \n\n   \n',
        { clean: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for a string of only spaces and newlines with ::cleanws', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes('  \n  \n  ', {
        cleanws: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — cleaning behavior', () => {
    it('collapses internal spaces and trims lines, drops blank lines (::clean)', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes(
        '  hello   world  \n\n\n  foo  bar',
        { clean: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello world\nfoo bar');
    });

    it('also triggers on ::cleanws', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes(
        '  hello   world  ',
        { cleanws: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello world');
    });

    it('collapses tabs to a single space', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes('a\t\tb', {
        clean: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a b');
    });

    it('trims leading and trailing spaces from each line', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes(
        '  hello   world  ',
        { clean: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('hello world');
    });

    it('produces correct output for the spec example', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes('  a   b  ', {
        clean: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a b');
    });
  });

  describe('generateBoxes — box metadata', () => {
    it('sets name to "Whitespace Clean"', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes('  a  b  ', {
        clean: true,
      });
      expect(boxes[0].props.name).toBe('Whitespace Clean');
    });

    it('sets priority to 10', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes('  a  b  ', {
        clean: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('assigns CodeBoxTemplate as boxTemplate', async () => {
      const boxes = await WhitespaceCleanBoxSource.generateBoxes('  a  b  ', {
        clean: true,
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });
  });
});
