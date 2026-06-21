import { MarkdownTocBoxSource } from '@modules/boxSources/MarkdownTocBoxSource';
import { describe, expect, it } from 'vitest';

describe('MarkdownTocBoxSource', () => {
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
  });
});
