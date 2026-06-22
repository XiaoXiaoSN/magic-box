import { describe, expect, it } from 'vitest';

import { TextIndentBoxSource } from '../TextIndentBoxSource';

describe('TextIndentBoxSource', () => {
  describe('guard conditions', () => {
    it('returns [] when no option keys provided', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('a\nb', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option keys provided', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('a\nb', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('', {
        indent: '2',
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for input exceeding MAX_INPUT', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes(
        'a'.repeat(100_001),
        {
          indent: '2',
        },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('::indent=N (positive)', () => {
    it('prepends N spaces to each non-empty line', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('a\nb', {
        indent: '2',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('  a\n  b');
    });

    it('preserves blank lines — blank line stays blank, non-empty lines indented', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('a\n\nb', {
        indent: '2',
      });
      expect(boxes[0].props.plaintextOutput).toBe('  a\n\n  b');
    });

    it('indents by 4 spaces on single-line input', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('x', {
        indent: '4',
      });
      expect(boxes[0].props.plaintextOutput).toBe('    x');
    });

    it('defaults to 2 spaces when ::indent has no value (boolean true)', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('hello', {
        indent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('  hello');
    });
  });

  describe('::indent=-N (negative — dedent fixed amount)', () => {
    it('removes up to N leading spaces from each line', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('    a\n    b', {
        indent: '-2',
      });
      expect(boxes[0].props.plaintextOutput).toBe('  a\n  b');
    });

    it('does not remove more spaces than available', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('  a', {
        indent: '-10',
      });
      expect(boxes[0].props.plaintextOutput).toBe('a');
    });
  });

  describe('::dedent=N (fixed dedent)', () => {
    it('removes up to N leading spaces per line', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('    a\n      b', {
        dedent: '4',
      });
      expect(boxes[0].props.plaintextOutput).toBe('a\n  b');
    });

    it('does not remove non-space characters', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('  ab', {
        dedent: '10',
      });
      expect(boxes[0].props.plaintextOutput).toBe('ab');
    });
  });

  describe('::dedent (auto-dedent — no value)', () => {
    it('removes the common leading-space prefix from all lines', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('    a\n      b', {
        dedent: true,
      });
      // common prefix is 4 spaces: 'a' and '  b'
      expect(boxes[0].props.plaintextOutput).toBe('a\n  b');
    });

    it('leaves blank lines empty after auto-dedent', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('  a\n\n  b', {
        dedent: true,
      });
      // common prefix from non-empty lines is 2; blank stays blank
      expect(boxes[0].props.plaintextOutput).toBe('a\n\nb');
    });

    it('produces no change when there is no common leading whitespace', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('a\n  b', {
        dedent: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a\n  b');
    });
  });

  describe('box properties', () => {
    it('sets box name to "Indent"', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('x', {
        indent: '2',
      });
      expect(boxes[0].props.name).toBe('Indent');
    });

    it('sets priority from source priority', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('x', {
        indent: '2',
      });
      expect(boxes[0].props.priority).toBe(TextIndentBoxSource.priority);
    });

    it('uses CodeBoxTemplate', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('x', {
        indent: '2',
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });
  });

  describe('CRLF normalization', () => {
    it('normalizes CRLF to LF before indenting', async () => {
      const boxes = await TextIndentBoxSource.generateBoxes('a\r\nb', {
        indent: '2',
      });
      expect(boxes[0].props.plaintextOutput).toBe('  a\n  b');
    });
  });
});
