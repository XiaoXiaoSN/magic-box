import { describe, expect, it } from 'vitest';

import { ToHtmlBoxSource } from '../ToHtmlBoxSource';

describe('ToHtmlBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('# Title', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is provided', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('# Title', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('', {
        tohtml: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('converts atx heading with ::tohtml option', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('# Title', {
        tohtml: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('<h1>Title</h1>');
    });

    it('converts atx heading with ::2html option', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('## Section', {
        '2html': true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('<h2>Section</h2>');
    });

    it('converts bold with **', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('**bold**', {
        tohtml: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<strong>bold</strong>');
    });

    it('converts bold with __', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('__bold__', {
        tohtml: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<strong>bold</strong>');
    });

    it('converts italic with *', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('*italic*', {
        tohtml: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<em>italic</em>');
    });

    it('converts italic with _', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('_italic_', {
        tohtml: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<em>italic</em>');
    });

    it('converts inline code', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('inline `code` here', {
        tohtml: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<code>code</code>');
    });

    it('converts links', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes(
        '[link](https://x.com)',
        { tohtml: true },
      );
      expect(boxes[0].props.plaintextOutput).toContain(
        '<a href="https://x.com">link</a>',
      );
    });

    it('html-escapes text content (& and <)', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('a < b & c', {
        tohtml: true,
      });
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('&lt;');
      expect(html).toContain('&amp;');
      expect(html).not.toContain('<b');
    });

    it('wraps unordered list items in <ul>', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('- one\n- two', {
        tohtml: true,
      });
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('<ul>');
      const liMatches = html.match(/<li>/g);
      expect(liMatches).toHaveLength(2);
      expect(html).toContain('<li>one</li>');
      expect(html).toContain('<li>two</li>');
    });

    it('wraps ordered list items in <ol>', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('1. first\n2. second', {
        tohtml: true,
      });
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>first</li>');
      expect(html).toContain('<li>second</li>');
    });

    it('escapes fenced code block content and does not apply inline rules inside', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('```\n<x>\n```', {
        tohtml: true,
      });
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('<pre><code>');
      expect(html).toContain('&lt;x&gt;');
      // the raw tag must not appear in output
      expect(html).not.toContain('<x>');
    });

    it('sets CodeBoxTemplate on the returned box', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('# H', {
        tohtml: true,
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });

    it('sets priority on the returned box', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('# H', {
        tohtml: true,
      });
      expect(boxes[0].props.priority).toBe(ToHtmlBoxSource.priority);
    });

    it('wraps plain text in a paragraph', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('Hello world', {
        tohtml: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('<p>Hello world</p>');
    });

    it('preserves line breaks in general text input', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes('first\nsecond', {
        tohtml: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('<p>first<br>\nsecond</p>');
    });

    it('escapes raw HTML instead of passing executable markup through', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes(
        '<img src=x onerror=alert(1)>',
        { tohtml: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe(
        '<p>&lt;img src=x onerror=alert(1)&gt;</p>',
      );
    });

    it('handles multiple blocks separated by blank lines', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes(
        '# Title\n\nSome text.',
        { tohtml: true },
      );
      const html = boxes[0].props.plaintextOutput;
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<p>Some text.</p>');
    });

    it('handles all heading levels h1–h6', async () => {
      for (let level = 1; level <= 6; level++) {
        const hashes = '#'.repeat(level);
        const boxes = await ToHtmlBoxSource.generateBoxes(`${hashes} Heading`, {
          tohtml: true,
        });
        expect(boxes[0].props.plaintextOutput).toBe(
          `<h${level}>Heading</h${level}>`,
        );
      }
    });

    it('a language-tagged closing fence still closes the code block', async () => {
      const md = '```python\ncode\n```python\n# real';
      const boxes = await ToHtmlBoxSource.generateBoxes(md, {
        tohtml: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('<h1>real</h1>');
    });

    it('strips a javascript: href from a link', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes(
        '[x](javascript:alert(1))',
        { tohtml: true },
      );
      expect(boxes[0].props.plaintextOutput).not.toContain('javascript:');
    });

    it('blocks unsafe href schemes with embedded control whitespace', async () => {
      const boxes = await ToHtmlBoxSource.generateBoxes(
        '[x](java\tscript:alert(1))',
        { tohtml: true },
      );
      expect(boxes[0].props.plaintextOutput).toContain(
        'href="#unsafe-url-removed"',
      );
    });
  });
});
