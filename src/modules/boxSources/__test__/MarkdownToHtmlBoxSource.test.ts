import { describe, expect, it } from 'vitest';

import { MarkdownToHtmlBoxSource } from '../MarkdownToHtmlBoxSource';

describe('MarkdownToHtmlBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes(
        '# Title',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is provided', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('# Title', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('', {
        md2html: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('converts atx heading with ::md2html option', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('# Title', {
        md2html: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('<h1>Title</h1>');
    });

    it('converts atx heading with ::markdownhtml option', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('## Section', {
        markdownhtml: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('<h2>Section</h2>');
    });

    it('converts bold with **', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('**bold**', {
        md2html: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<strong>bold</strong>');
    });

    it('converts bold with __', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('__bold__', {
        md2html: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<strong>bold</strong>');
    });

    it('converts italic with *', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('*italic*', {
        md2html: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<em>italic</em>');
    });

    it('converts italic with _', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('_italic_', {
        md2html: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<em>italic</em>');
    });

    it('converts inline code', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes(
        'inline `code` here',
        { md2html: true },
      );
      expect(boxes[0].props.plaintextOutput).toContain('<code>code</code>');
    });

    it('converts links', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes(
        '[link](https://x.com)',
        { md2html: true },
      );
      expect(boxes[0].props.plaintextOutput).toContain(
        '<a href="https://x.com">link</a>',
      );
    });

    it('html-escapes text content (& and <)', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('a < b & c', {
        md2html: true,
      });
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('&lt;');
      expect(html).toContain('&amp;');
      expect(html).not.toContain('<b');
    });

    it('wraps unordered list items in <ul>', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes(
        '- one\n- two',
        { md2html: true },
      );
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('<ul>');
      const liMatches = html.match(/<li>/g);
      expect(liMatches).toHaveLength(2);
      expect(html).toContain('<li>one</li>');
      expect(html).toContain('<li>two</li>');
    });

    it('wraps ordered list items in <ol>', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes(
        '1. first\n2. second',
        { md2html: true },
      );
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>first</li>');
      expect(html).toContain('<li>second</li>');
    });

    it('escapes fenced code block content and does not apply inline rules inside', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes(
        '```\n<x>\n```',
        { md2html: true },
      );
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('<pre><code>');
      expect(html).toContain('&lt;x&gt;');
      // the raw tag must not appear in output
      expect(html).not.toContain('<x>');
    });

    it('sets CodeBoxTemplate on the returned box', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('# H', {
        md2html: true,
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });

    it('sets priority on the returned box', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('# H', {
        md2html: true,
      });
      expect(boxes[0].props.priority).toBe(MarkdownToHtmlBoxSource.priority);
    });

    it('wraps plain text in a paragraph', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes('Hello world', {
        md2html: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('<p>Hello world</p>');
    });

    it('handles multiple blocks separated by blank lines', async () => {
      const boxes = await MarkdownToHtmlBoxSource.generateBoxes(
        '# Title\n\nSome text.',
        { md2html: true },
      );
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<p>Some text.</p>');
    });

    it('handles all heading levels h1–h6', async () => {
      for (let level = 1; level <= 6; level++) {
        const hashes = '#'.repeat(level);
        const boxes = await MarkdownToHtmlBoxSource.generateBoxes(
          `${hashes} Heading`,
          { md2html: true },
        );
        expect(boxes[0].props.plaintextOutput).toBe(
          `<h${level}>Heading</h${level}>`,
        );
      }
    });
  });
});
