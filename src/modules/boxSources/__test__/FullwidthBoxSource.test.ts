import { describe, expect, it } from 'vitest';
import { FullwidthBoxSource } from '../FullwidthBoxSource';

describe('FullwidthBoxSource', () => {
  describe('generateBoxes — guard conditions', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('Hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input is empty string', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('', {
        fullwidth: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — ASCII to fullwidth', () => {
    it('converts ASCII letters with +0xFEE0 offset', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('Hello', {
        fullwidth: true,
      });
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput;
      // 'H' (0x48) should become U+FF28
      expect(output.codePointAt(0)).toBe('H'.charCodeAt(0) + 0xfee0);
      expect(output).toBe('Ｈｅｌｌｏ');
    });

    it('maps ASCII space to ideographic space U+3000', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('a b', {
        fullwidth: true,
      });
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput;
      // index 1 should be U+3000
      expect(output.codePointAt(1)).toBe(0x3000);
      expect(output).toBe('ａ　ｂ');
    });

    it('accepts ::tofullwidth alias', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('Hi', {
        tofullwidth: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Fullwidth');
    });
  });

  describe('decode — fullwidth to ASCII', () => {
    it('converts fullwidth letters back to ASCII', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('Ｈｉ', {
        halfwidth: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });

    it('accepts ::fromfullwidth alias', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('Ｈｉ', {
        fromfullwidth: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Halfwidth');
    });
  });

  describe('round-trip', () => {
    it('halfwidth(fullwidth(input)) === original for ASCII printable + space', async () => {
      const original = 'Hello 123!';

      const encoded = await FullwidthBoxSource.generateBoxes(original, {
        fullwidth: true,
      });
      expect(encoded).toHaveLength(1);
      const fullwidthStr = encoded[0].props.plaintextOutput;

      const decoded = await FullwidthBoxSource.generateBoxes(fullwidthStr, {
        halfwidth: true,
      });
      expect(decoded).toHaveLength(1);
      expect(decoded[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('both options produce two boxes', () => {
    it('returns a Fullwidth box and a Halfwidth box', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('Hi', {
        fullwidth: true,
        halfwidth: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Fullwidth');
      expect(boxes[1].props.name).toBe('Halfwidth');
    });
  });

  describe('box metadata', () => {
    it('sets priority and disables expand button', async () => {
      const boxes = await FullwidthBoxSource.generateBoxes('Hello', {
        fullwidth: true,
      });
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });
});
