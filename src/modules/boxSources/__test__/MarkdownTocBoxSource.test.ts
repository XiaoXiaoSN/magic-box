import { MarkdownTocBoxSource } from '@modules/boxSources/MarkdownTocBoxSource';
import { describe, expect, it, vi } from 'vitest';

const markdownItMock = vi.hoisted(() => ({
  constructions: 0,
  failNextConstruction: false,
  imports: 0,
}));

vi.mock('markdown-it', async (importOriginal) => {
  const actual = await importOriginal<typeof import('markdown-it')>();
  markdownItMock.imports++;

  return {
    ...actual,
    default: class extends actual.default {
      constructor(...args: ConstructorParameters<typeof actual.default>) {
        markdownItMock.constructions++;
        if (markdownItMock.failNextConstruction) {
          markdownItMock.failNextConstruction = false;
          throw new Error('markdown parser initialization failed');
        }
        super(...args);
      }
    },
  };
});

describe('MarkdownTocBoxSource', () => {
  it('loads the parser after input guards and retries failed initialization', async () => {
    expect(markdownItMock.imports).toBe(0);
    await MarkdownTocBoxSource.generateBoxes('# Ignored', null);
    await MarkdownTocBoxSource.generateBoxes('x'.repeat(100_001), {
      toc: true,
    });
    expect(markdownItMock.imports).toBe(0);

    markdownItMock.failNextConstruction = true;
    await expect(
      MarkdownTocBoxSource.generateBoxes('# Retry', { toc: true }),
    ).rejects.toThrow('markdown parser initialization failed');
    const boxes = await MarkdownTocBoxSource.generateBoxes('# Retry', {
      toc: true,
    });

    expect(markdownItMock.imports).toBe(1);
    expect(markdownItMock.constructions).toBe(2);
    expect(boxes[0].props.plaintextOutput).toBe('- [Retry](#retry)');
  });

  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes(
        '# Title\n## Section',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object has no toc/tableofcontents key', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes(
        '# Title\n## Section',
        { foo: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with ::toc option', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes('', { toc: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('basic toc generation', () => {
    it('generates a nested toc from h1/h2/h3 headings', async () => {
      const input = '# Title\n## Section A\n### Sub\n## Section B';
      const boxes = await MarkdownTocBoxSource.generateBoxes(input, {
        toc: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Markdown TOC');
      expect(boxes[0].props.plaintextOutput).toBe(
        '- [Title](#title)\n  - [Section A](#section-a)\n    - [Sub](#sub)\n  - [Section B](#section-b)',
      );
    });

    it('accepts ::tableofcontents as the trigger option', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes('# Hello', {
        tableofcontents: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('- [Hello](#hello)');
    });

    it('normalizes indentation so shallowest heading is at indent 0', async () => {
      // starts at h2, so h2 should be indent 0 and h3 indent 2
      const input = '## A\n### B';
      const boxes = await MarkdownTocBoxSource.generateBoxes(input, {
        toc: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('- [A](#a)\n  - [B](#b)');
    });
  });

  describe('duplicate heading disambiguation', () => {
    it('appends -1 to the second occurrence of a duplicate heading', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes('## A\n## A', {
        toc: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('- [A](#a)\n- [A](#a-1)');
    });

    it('appends -1, -2 for three identical headings', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes(
        '## A\n## A\n## A',
        { toc: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe(
        '- [A](#a)\n- [A](#a-1)\n- [A](#a-2)',
      );
    });

    it('treats constructor as an ordinary slug and counts duplicates', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes(
        '## constructor\n## constructor',
        { toc: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe(
        '- [constructor](#constructor)\n- [constructor](#constructor-1)',
      );
    });
  });

  describe('fenced code block exclusion', () => {
    it('ignores headings inside backtick fences', async () => {
      const input = '```\n# NotAHeading\n```\n# Real';
      const boxes = await MarkdownTocBoxSource.generateBoxes(input, {
        toc: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('- [Real](#real)');
    });

    it('ignores headings inside tilde fences', async () => {
      const input = '~~~\n# NotAHeading\n~~~\n# Real';
      const boxes = await MarkdownTocBoxSource.generateBoxes(input, {
        toc: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('- [Real](#real)');
    });
  });

  describe('slug generation', () => {
    it('strips special characters from slug', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes(
        '## Hello, World!',
        { toc: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe(
        '- [Hello, World!](#hello-world)',
      );
    });

    it('handles headings with numbers', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes('## Step 1', {
        toc: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('- [Step 1](#step-1)');
    });
  });

  describe('no headings found', () => {
    it('returns a box mentioning no headings when input has no ATX headings', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes('just text', {
        toc: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/no headings/i);
    });
  });

  describe('box metadata', () => {
    it('sets priority from source priority field', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes('# Hi', {
        toc: true,
      });
      expect(boxes[0].props.priority).toBe(MarkdownTocBoxSource.priority);
    });

    it('sets language option to markdown for CodeBoxTemplate', async () => {
      const boxes = await MarkdownTocBoxSource.generateBoxes('# Hi', {
        toc: true,
      });
      expect(boxes[0].props.options).toMatchObject({ language: 'markdown' });
    });

    it('does not close a 4-backtick fence with a 3-backtick line', async () => {
      // the inner 3-backtick line must not end the 4-backtick block
      const md = '````\n# fake\n```\n# still fake\n````\n# real';
      const boxes = await MarkdownTocBoxSource.generateBoxes(md, { toc: true });
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('[real]');
      expect(out).not.toContain('fake');
    });
  });

  it('builds Unicode anchors and reads every CRLF heading', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '# 安裝\r\n## 使用方式\r\n## Last',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [安裝](#安裝)\n  - [使用方式](#使用方式)\n  - [Last](#last)',
    );
  });

  it('matches GitHub whitespace anchors and strips inline markup from labels', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## A & B\n## Use `code` and [link](https://example.test)',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [A & B](#a--b)\n- [Use code and link](#use-code-and-link)',
    );
  });

  it('preserves intraword underscores in visible labels and slugs', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes('## foo_bar_baz', {
      toc: true,
    });
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [foo\\_bar\\_baz](#foo_bar_baz)',
    );
  });

  it('strips emphasis and links with balanced parentheses from destinations', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## [**link**](https://example.test/a_(b_(c)))',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe('- [link](#link)');
  });

  it('strips nested emphasis sharing a three-marker closing run', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## **bold *italic***',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [bold italic](#bold-italic)',
    );
  });

  it('strips inverse nested emphasis sharing a three-marker closing run', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## *italic **bold***',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [italic bold](#italic-bold)',
    );
  });

  it('applies the rule of three to adjacent delimiter runs', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## *foo**bar***\n## *foo**bar*',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [foobar](#foobar)\n- [foo\\*\\*bar](#foobar-1)',
    );
  });

  it('keeps delimiters literal when link precedence prevents emphasis', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes('## *[foo*](bar)', {
      toc: true,
    });
    expect(boxes[0].props.plaintextOutput).toBe('- [\\*foo\\*](#foo)');
  });

  it('extracts resolved references, image alt text, autolinks, and strikethrough', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## [reference][target] ![alt *text*](image.png) <https://example.com> ~~gone~~\n\n[target]: /url',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [reference alt text https://example.com gone](#reference-alt-text-httpsexamplecom-gone)',
    );
  });

  it('preserves unresolved reference syntax as visible text', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## [missing][reference]',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [\\[missing\\]\\[reference\\]](#missingreference)',
    );
  });

  it('supports emphasis delimiter runs longer than three markers', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## ****bold****\n## foo******bar*********baz',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [bold](#bold)\n- [foobar\\*\\*\\*baz](#foobarbaz)',
    );
  });

  it('keeps unmatched emphasis delimiters literal', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## **unclosed\n## unclosed*',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [\\*\\*unclosed](#unclosed)\n- [unclosed\\*](#unclosed-1)',
    );
  });

  it('keeps escaped markup and code-span text literal in the label', async () => {
    const delimiter = String.fromCharCode(96);
    const input =
      '## \\*literal\\* ' +
      delimiter +
      'code_text' +
      delimiter +
      ' [**link**](https://example.test/a_(b))';
    const boxes = await MarkdownTocBoxSource.generateBoxes(input, {
      toc: true,
    });
    expect(boxes[0].props.plaintextOutput).toBe(
      '- [\\*literal\\* code\\_text link](#literal-code_text-link)',
    );
  });

  it('strips HTML tags and comments from labels', async () => {
    const boxes = await MarkdownTocBoxSource.generateBoxes(
      '## Text <!-- hidden --> <em>HTML</em>',
      { toc: true },
    );
    expect(boxes[0].props.plaintextOutput).toBe('- [Text  HTML](#text--html)');
  });

  it('handles a maximum-length unmatched bracket heading', async () => {
    const heading = '['.repeat(99_997);
    const boxes = await MarkdownTocBoxSource.generateBoxes(`## ${heading}`, {
      toc: true,
    });
    expect(boxes[0].props.plaintextOutput).toHaveLength(200_001);
  });
});
