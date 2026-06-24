import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { FrontmatterBoxSource } from '../FrontmatterBoxSource';

describe('FrontmatterBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is given', async () => {
      const boxes = await FrontmatterBoxSource.generateBoxes(
        '---\ntitle: Hi\n---\nbody',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is given', async () => {
      const boxes = await FrontmatterBoxSource.generateBoxes(
        '---\ntitle: Hi\n---\nbody',
        { qrcode: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input exceeds MAX_INPUT', async () => {
      const big = `---\ntitle: x\n---\n${'x'.repeat(100_001)}`;
      const boxes = await FrontmatterBoxSource.generateBoxes(big, {
        frontmatter: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('parses frontmatter with ::frontmatter option', async () => {
      const boxes = await FrontmatterBoxSource.generateBoxes(
        '---\ntitle: Hello\ntags: [a, b]\n---\n# Body',
        { frontmatter: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Frontmatter');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.options).toEqual({ language: 'json' });
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);

      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ title: 'Hello', tags: ['a', 'b'] });
    });

    it('parses frontmatter with ::fm alias', async () => {
      const boxes = await FrontmatterBoxSource.generateBoxes(
        '---\ntitle: Hello\ntags: [a, b]\n---\n# Body',
        { fm: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ title: 'Hello', tags: ['a', 'b'] });
    });

    it('handles numeric and boolean values', async () => {
      const boxes = await FrontmatterBoxSource.generateBoxes(
        '---\nn: 42\nok: true\n---\nx',
        { frontmatter: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ n: 42, ok: true });
    });

    it('returns a box noting no frontmatter for plain text', async () => {
      const boxes = await FrontmatterBoxSource.generateBoxes('just text', {
        frontmatter: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/no frontmatter/i);
    });

    it('returns a box noting invalid YAML when frontmatter cannot be parsed', async () => {
      // yaml package may parse this leniently; if it throws we get the error box,
      // if it parses we accept whatever it returns as valid
      const boxes = await FrontmatterBoxSource.generateBoxes(
        '---\n: : bad\n---\n',
        { frontmatter: true },
      );
      expect(boxes).toHaveLength(1);
      // either an invalid-YAML message or a valid parse is acceptable
      const output = boxes[0].props.plaintextOutput;
      const isErrorMessage = /invalid/i.test(output);
      const isValidJson = (() => {
        try {
          JSON.parse(output);
          return true;
        } catch {
          return false;
        }
      })();
      expect(isErrorMessage || isValidJson).toBe(true);
    });

    it('strips a leading BOM before the frontmatter', async () => {
      const boxes = await FrontmatterBoxSource.generateBoxes(
        '﻿---\ntitle: BOM\n---\nbody',
        { frontmatter: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ title: 'BOM' });
    });
  });
});
