import { describe, expect, it } from 'vitest';

import { TabsSpacesBoxSource } from '../TabsSpacesBoxSource';

describe('TabsSpacesBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option key is present', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\thello');
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with option', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('', {
        spaces: '2',
      });
      expect(boxes).toHaveLength(0);
    });

    it('converts one leading tab to 2 spaces with ::spaces=2', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\thello', {
        spaces: '2',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Tabs → Spaces');
      expect(boxes[0].props.plaintextOutput).toBe('  hello');
    });

    it('converts two leading tabs to 8 spaces with ::spaces=4', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\t\tx', {
        spaces: '4',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('        x');
    });

    it('converts 4 leading spaces to one tab with ::tabs=4', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('    code', {
        tabs: '4',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Spaces → Tabs');
      expect(boxes[0].props.plaintextOutput).toBe('\tcode');
    });

    it('leaves mid-line tabs untouched (no leading tab on that line)', async () => {
      // 'a\tb' has no leading whitespace, so output is unchanged
      const boxes = await TabsSpacesBoxSource.generateBoxes('a\tb', {
        spaces: '2',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\tb');
    });

    it('emits two boxes when both ::spaces and ::tabs are present', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\thello', {
        spaces: '2',
        tabs: '2',
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Tabs → Spaces');
      expect(names).toContain('Spaces → Tabs');
    });

    it('accepts ::untabify as alias for spaces conversion', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\thello', {
        untabify: '2',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Tabs → Spaces');
      expect(boxes[0].props.plaintextOutput).toBe('  hello');
    });

    it('accepts ::tabify as alias for tabs conversion', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('    hello', {
        tabify: '4',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Spaces → Tabs');
      expect(boxes[0].props.plaintextOutput).toBe('\thello');
    });

    it('uses default width of 4 when option value is boolean true', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\thello', {
        spaces: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('    hello');
    });

    it('sets priority on the produced box', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\thello', {
        spaces: '2',
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('attaches CodeBoxTemplate to the produced box', async () => {
      const boxes = await TabsSpacesBoxSource.generateBoxes('\thello', {
        spaces: '2',
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });
  });
});
