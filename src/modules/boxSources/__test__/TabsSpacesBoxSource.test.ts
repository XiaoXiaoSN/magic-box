import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';
import { TabsSpacesBoxSource } from '../TabsSpacesBoxSource';

describe('TabsSpacesBoxSource', () => {
  describe('gate conditions', () => {
    it('returns [] when no option is set', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\tindented', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('', {
        tabs2spaces: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input exceeds MAX_INPUT', async () => {
      const huge = 'a'.repeat(100_001);
      const boxes = await TabsSpacesBoxSource.generateBoxes(huge, {
        tabs2spaces: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('tabs2spaces', () => {
    it('converts a single leading tab to 4 spaces (default width)', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\tindented', {
        tabs2spaces: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('    indented');
    });

    it('converts two leading tabs using width=2 option', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\t\tx', {
        tabs2spaces: '2',
      });
      expect(boxes[0].props.plaintextOutput).toBe('    x');
    });

    it('accepts ::untabify alias', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\tline', {
        untabify: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('    line');
    });

    it('does not touch interior tabs — only leading whitespace is affected', async () => {
      // 'a\tb' has no leading whitespace; interior tab must stay intact
      const boxes = await TabsSpacesBoxSource.generateBoxes('a\tb', {
        tabs2spaces: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a\tb');
    });

    it('handles multi-line input', async () => {
      const input = '\tline1\n\t\tline2\nno-indent';
      const boxes = await TabsSpacesBoxSource.generateBoxes(input, {
        tabs2spaces: '2',
      });
      expect(boxes[0].props.plaintextOutput).toBe(
        '  line1\n    line2\nno-indent',
      );
    });
  });

  describe('spaces2tabs', () => {
    it('converts 4 leading spaces to 1 tab', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('    code', {
        spaces2tabs: '4',
      });
      expect(boxes[0].props.plaintextOutput).toBe('\tcode');
    });

    it('keeps leftover spaces that do not fill a full tab width', async () => {
      // 5 spaces with width=4 → 1 tab + 1 leftover space
      const boxes = await TabsSpacesBoxSource.generateBoxes('     x', {
        spaces2tabs: '4',
      });
      expect(boxes[0].props.plaintextOutput).toBe('\t x');
    });

    it('accepts ::tabify alias', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('    val', {
        tabify: '4',
      });
      expect(boxes[0].props.plaintextOutput).toBe('\tval');
    });

    it('handles multi-line input', async () => {
      const input = '    a\n        b\nno-indent';
      const boxes = await TabsSpacesBoxSource.generateBoxes(input, {
        spaces2tabs: '4',
      });
      expect(boxes[0].props.plaintextOutput).toBe('\ta\n\t\tb\nno-indent');
    });
  });

  describe('box shape', () => {
    it('uses CodeBoxTemplate', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\tx', {
        tabs2spaces: true,
      });
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });

    it('names the box "Tabs / Spaces"', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\tx', {
        tabs2spaces: true,
      });
      expect(boxes[0].props.name).toBe('Tabs / Spaces');
    });
  });
});
