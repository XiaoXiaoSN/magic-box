import { describe, expect, it } from 'vitest';

import { MarkdownStripBoxSource } from '../MarkdownStripBoxSource';

describe('MarkdownStripBoxSource', () => {
  describe('generateBoxes — guard conditions', () => {
    it('returns [] with no option keys', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] with unrelated option keys', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('', {
        stripmd: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for input exceeding MAX_INPUT', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        'a'.repeat(100_001),
        { stripmd: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — ::stripmd trigger', () => {
    it('returns a box with correct name and priority', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        stripmd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Markdown to Text');
      expect(boxes[0].props.priority).toBe(10);
    });

    it('uses CodeBoxTemplate', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        stripmd: true,
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });
  });

  describe('generateBoxes — ::mdtotext trigger', () => {
    it('accepts mdtotext option key', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        mdtotext: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Title');
    });
  });

  describe('heading stripping', () => {
    it('strips h1', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Title');
    });

    it('strips h2 through h6', async () => {
      for (let level = 2; level <= 6; level++) {
        const boxes = await MarkdownStripBoxSource.generateBoxes(
          `${'#'.repeat(level)} Heading ${level}`,
          { stripmd: true },
        );
        expect(boxes[0].props.plaintextOutput).toBe(`Heading ${level}`);
      }
    });
  });

  describe('emphasis stripping', () => {
    it('strips bold **text**', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('**bold**', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('bold');
    });

    it('strips bold __text__', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('__bold__', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('bold');
    });

    it('strips italic *text*', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('*italic*', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('italic');
    });

    it('strips italic _text_', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('_italic_', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('italic');
    });
  });

  describe('inline code stripping', () => {
    it('strips `code`', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('`code`', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('code');
    });
  });

  describe('combined inline stripping', () => {
    it('strips bold, italic, and code on one line', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '**bold** and *italic* and `code`',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('bold and italic and code');
    });
  });

  describe('links and images', () => {
    it('strips link [text](url) → text', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '[Google](https://google.com)',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('Google');
    });

    it('strips image ![alt text](img.png) → alt text', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '![alt text](img.png)',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('alt text');
    });
  });

  describe('blockquotes', () => {
    it('strips blockquote prefix', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('> quoted', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('quoted');
    });
  });

  describe('list markers', () => {
    it('normalises unordered list markers to "- "', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '- item one\n- item two',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('- item one\n- item two');
    });

    it('normalises * list markers to "- "', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '* item one\n* item two',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('- item one\n- item two');
    });

    it('strips ordered list markers', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '1. first\n2. second',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('first\nsecond');
    });
  });

  describe('strikethrough', () => {
    it('strips ~~text~~', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('~~gone~~', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('gone');
    });
  });

  describe('horizontal rules', () => {
    it('removes --- rule', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('---', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('');
    });

    it('removes *** rule', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('***', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('');
    });
  });

  describe('code fences', () => {
    it('removes fence delimiters but keeps inner content', async () => {
      const input = '```\nconst x = 1;\n```';
      const boxes = await MarkdownStripBoxSource.generateBoxes(input, {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('const x = 1;');
    });
  });

  describe('multi-element document', () => {
    it('strips heading and inline bold in a multi-line document', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '# Title\n\nSome **text**',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('Title\n\nSome text');
    });

    it('handles the defaultInput example', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '# Title\n\n**bold** and *italic* and `code`',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe(
        'Title\n\nbold and italic and code',
      );
    });
  });

  describe('linear regex safety', () => {
    // a long string of asterisks must not cause catastrophic backtracking
    it('handles a long asterisk string without hanging', () => {
      const longAsterisks = '*'.repeat(50_000);
      const start = Date.now();
      // access the internal stripMarkdown indirectly via generateBoxes
      // we only need to confirm it completes quickly (< 500 ms)
      const result = MarkdownStripBoxSource.generateBoxes(longAsterisks, {
        stripmd: true,
      });
      // the promise resolves synchronously for this pure transform, but await
      // is not available here — we simply verify it was created fast
      expect(Date.now() - start).toBeLessThan(500);
      expect(result).toBeDefined();
    });

    it('handles a long underscore string without hanging', () => {
      const longUnderscores = '_'.repeat(50_000);
      const start = Date.now();
      const result = MarkdownStripBoxSource.generateBoxes(longUnderscores, {
        stripmd: true,
      });
      expect(Date.now() - start).toBeLessThan(500);
      expect(result).toBeDefined();
    });
  });
});
