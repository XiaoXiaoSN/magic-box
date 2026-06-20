import { CodeBoxTemplate } from '@components/BoxTemplate';
import { expect } from 'vitest';

import { MarkdownTableBoxSource } from '../MarkdownTableBoxSource';

describe('MarkdownTableBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no trigger option is present', async () => {
      const boxes = await MarkdownTableBoxSource.generateBoxes(
        'name,age\nAlice,30',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('converts CSV to a Markdown table with ::mdtable option', async () => {
      const boxes = await MarkdownTableBoxSource.generateBoxes(
        'name,age\nAlice,30\nBob,25',
        { mdtable: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Markdown Table');
      expect(boxes[0].props.plaintextOutput).toBe(
        '| name | age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |',
      );
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });

    it('converts JSON array of objects to a Markdown table', async () => {
      const boxes = await MarkdownTableBoxSource.generateBoxes(
        '[{"a":1,"b":2}]',
        { mdtable: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '| a | b |\n| --- | --- |\n| 1 | 2 |',
      );
    });

    it('escapes pipe characters inside CSV cells', async () => {
      const boxes = await MarkdownTableBoxSource.generateBoxes('col\na|b', {
        mdtable: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '| col |\n| --- |\n| a\\|b |',
      );
    });

    it('returns an error box for invalid JSON-looking input', async () => {
      const boxes = await MarkdownTableBoxSource.generateBoxes('[bad]', {
        mdtable: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Markdown Table');
      expect(boxes[0].props.plaintextOutput).toContain('Error');
    });

    it('accepts ::markdowntable as an alias for the trigger option', async () => {
      const boxes = await MarkdownTableBoxSource.generateBoxes('x\n1', {
        markdowntable: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('| x |\n| --- |\n| 1 |');
    });

    it('handles quoted CSV fields with embedded commas', async () => {
      const boxes = await MarkdownTableBoxSource.generateBoxes(
        'name,note\nAlice,"hello, world"',
        { mdtable: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '| name | note |\n| --- | --- |\n| Alice | hello, world |',
      );
    });
  });
});
