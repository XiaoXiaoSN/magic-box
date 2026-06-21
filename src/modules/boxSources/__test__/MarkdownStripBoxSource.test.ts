import { describe, expect, it } from 'vitest';
import { MarkdownStripBoxSource } from '../MarkdownStripBoxSource';

describe('MarkdownStripBoxSource', () => {
  describe('static metadata', () => {
    it('has correct name, tag, kind, priority', () => {
      expect(MarkdownStripBoxSource.name).toBe('Markdown Strip');
      expect(MarkdownStripBoxSource.tag).toBe('#');
      expect(MarkdownStripBoxSource.kind).toBe('Transform');
      expect(MarkdownStripBoxSource.priority).toBe(10);
    });
  });

  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', null);
      expect(boxes).toEqual([]);
    });

    it('returns [] when unrelated option is provided', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        hash: true,
      });
      expect(boxes).toEqual([]);
    });

    it('activates on ::stripmd option', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        stripmd: true,
      });
      expect(boxes.length).toBe(1);
    });

    it('activates on ::markdownstrip option', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        markdownstrip: true,
      });
      expect(boxes.length).toBe(1);
    });
  });

  describe('empty / invalid input', () => {
    it('returns [] for empty string', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('', {
        stripmd: true,
      });
      expect(boxes).toEqual([]);
    });

    it('returns [] for whitespace-only string', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('   ', {
        stripmd: true,
      });
      expect(boxes).toEqual([]);
    });

    it('returns [] for input exceeding MAX_INPUT', async () => {
      const huge = 'a'.repeat(100_001);
      const boxes = await MarkdownStripBoxSource.generateBoxes(huge, {
        stripmd: true,
      });
      expect(boxes).toEqual([]);
    });
  });

  describe('heading stripping', () => {
    it('strips ATX h1', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Title', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Title');
    });

    it('strips ATX h2', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('## Section', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Section');
    });

    it('strips ATX h6', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('###### Deep', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('Deep');
    });
  });

  describe('bold and italic stripping', () => {
    it('strips **bold** and _italic_', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '**bold** and _italic_',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('bold and italic');
    });

    it('strips __bold__ and *italic*', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '__bold__ and *italic*',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('bold and italic');
    });
  });

  describe('inline code stripping', () => {
    it('strips backtick inline code', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('`code`', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('code');
    });
  });

  describe('link stripping', () => {
    it('keeps link text, drops URL', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '[text](https://x.com)',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('text');
    });

    it('keeps image alt text, drops URL', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes(
        '![alt text](https://x.com/img.png)',
        { stripmd: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('alt text');
    });
  });

  describe('list stripping', () => {
    it('strips unordered list marker -', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('- item', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('item');
    });

    it('strips unordered list marker *', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('* item', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('item');
    });

    it('strips ordered list marker', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('1. item', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('item');
    });
  });

  describe('blockquote stripping', () => {
    it('strips blockquote marker', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('> quote', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('quote');
    });
  });

  describe('strikethrough stripping', () => {
    it('strips ~~strikethrough~~', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('~~deleted~~', {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('deleted');
    });
  });

  describe('fenced code block stripping', () => {
    it('removes fence lines and keeps inner content', async () => {
      const input = '```js\nconsole.log("hi");\n```';
      const boxes = await MarkdownStripBoxSource.generateBoxes(input, {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('console.log("hi");');
    });
  });

  describe('horizontal rule stripping', () => {
    it('removes --- horizontal rule', async () => {
      const input = 'above\n---\nbelow';
      const boxes = await MarkdownStripBoxSource.generateBoxes(input, {
        stripmd: true,
      });
      expect(boxes[0].props.plaintextOutput).not.toContain('---');
      expect(boxes[0].props.plaintextOutput).toContain('above');
      expect(boxes[0].props.plaintextOutput).toContain('below');
    });
  });

  describe('combined stripping', () => {
    it('strips multiple formats in one input', async () => {
      const input = '# Title\n\n**bold** and _italic_ and `code`';
      const boxes = await MarkdownStripBoxSource.generateBoxes(input, {
        stripmd: true,
      });
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('Title');
      expect(out).toContain('bold');
      expect(out).toContain('italic');
      expect(out).toContain('code');
      expect(out).not.toContain('#');
      expect(out).not.toContain('**');
      expect(out).not.toContain('_');
      expect(out).not.toContain('`');
    });
  });

  describe('box structure', () => {
    it('returns a single box named Markdown Strip', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Hello', {
        stripmd: true,
      });
      expect(boxes.length).toBe(1);
      expect(boxes[0].props.name).toBe('Markdown Strip');
    });

    it('sets priority to 10', async () => {
      const boxes = await MarkdownStripBoxSource.generateBoxes('# Hello', {
        stripmd: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
