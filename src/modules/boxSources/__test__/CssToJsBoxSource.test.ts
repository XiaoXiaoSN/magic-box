import { describe, expect, it } from 'vitest';

import { CssToJsBoxSource } from '../CssToJsBoxSource';

describe('CssToJsBoxSource', () => {
  describe('generateBoxes — option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes('color: red;', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are provided', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes('color: red;', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('CSS → JS conversion', () => {
    it('converts basic CSS declarations to a JS object', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes(
        'background-color: red; font-size: 14px;',
        { cssjs: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('CSS to JS');
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('backgroundColor: "red"');
      expect(out).toContain('fontSize: "14px"');
    });

    it('handles vendor prefix -webkit-box-shadow → WebkitBoxShadow', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes(
        '-webkit-box-shadow: none;',
        { csstojs: true },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('WebkitBoxShadow: "none"');
    });

    it('skips empty declarations gracefully', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes(';;;', {
        cssjs: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('sets priority from source priority', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes('color: blue;', {
        cssjs: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('JS → CSS conversion', () => {
    it('converts a JS object literal to CSS declarations', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes(
        '{ backgroundColor: "red", fontSize: "14px" }',
        { cssjs: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JS to CSS');
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('background-color: red;');
      expect(out).toContain('font-size: 14px;');
    });

    it('converts vendor prefix WebkitBoxShadow → -webkit-box-shadow', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes(
        '{ WebkitBoxShadow: "0 0 5px rgba(0,0,0,0.5)" }',
        { cssjs: true },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('-webkit-box-shadow:');
    });

    it('sets priority from source priority', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes('{ color: "blue" }', {
        cssjs: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('handles empty string without crashing', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes('', { cssjs: true });
      expect(boxes).toHaveLength(0);
    });

    it('handles whitespace-only input without crashing', async () => {
      const boxes = await CssToJsBoxSource.generateBoxes('   ', {
        cssjs: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('handles garbage input without crashing', async () => {
      // no valid declarations → empty object output → returns []
      const boxes = await CssToJsBoxSource.generateBoxes(
        'this is not css at all!!!',
        { cssjs: true },
      );
      // may return [] or a box with empty output — must not throw
      expect(Array.isArray(boxes)).toBe(true);
    });

    it('respects MAX_INPUT cap', async () => {
      const huge = 'a'.repeat(100_001);
      const boxes = await CssToJsBoxSource.generateBoxes(huge, { cssjs: true });
      expect(boxes).toHaveLength(0);
    });
  });
});
