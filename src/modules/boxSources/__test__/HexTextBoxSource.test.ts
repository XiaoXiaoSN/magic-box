import { expect } from 'vitest';

import { HexTextBoxSource } from '../HexTextBoxSource';

describe('HexTextBoxSource', () => {
  describe('generateBoxes — no match', () => {
    it('should return [] when no option keys are given', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('Hi', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return [] for empty input even with ::hex', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('', { hex: true });
      expect(boxes).toHaveLength(0);
    });

    it('should return [] for whitespace-only input', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('   ', { hex: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode (::hex / ::tohex)', () => {
    it('should encode "Hi" to "4869"', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('Hi', { hex: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Text to Hex');
      expect(boxes[0].props.plaintextOutput).toBe('4869');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBeUndefined();
    });

    it('should encode "Hi" using ::tohex alias', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('Hi', { tohex: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('4869');
    });

    it('should encode "café" to "636166c3a9" (UTF-8 multi-byte for é)', async () => {
      // c=63, a=61, f=66, é=c3 a9
      const boxes = await HexTextBoxSource.generateBoxes('café', { hex: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('636166c3a9');
    });
  });

  describe('decode (::hexdecode / ::fromhex)', () => {
    it('should decode "4869" to "Hi"', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('4869', {
        hexdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Hex to Text');
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });

    it('should decode using ::fromhex alias', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('4869', {
        fromhex: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });

    it('should strip leading "0x" and spaces: "0x48 69" → "Hi"', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('0x48 69', {
        hexdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });

    it('should return error box for odd-length hex "abc"', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('abc', {
        hexdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/odd/i);
    });

    it('should return error box for invalid hex chars "zz"', async () => {
      const boxes = await HexTextBoxSource.generateBoxes('zz', {
        hexdecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid hex/i);
    });
  });

  describe('round-trip', () => {
    it('should round-trip "Hello, 世界!"', async () => {
      const original = 'Hello, 世界!';
      const encBoxes = await HexTextBoxSource.generateBoxes(original, {
        hex: true,
      });
      expect(encBoxes).toHaveLength(1);
      const hexStr = encBoxes[0].props.plaintextOutput;

      const decBoxes = await HexTextBoxSource.generateBoxes(hexStr, {
        hexdecode: true,
      });
      expect(decBoxes).toHaveLength(1);
      expect(decBoxes[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('both options', () => {
    it('should return 2 boxes when both ::hex and ::hexdecode are set', async () => {
      // "4869" is valid hex, so decode succeeds; encode of "4869" is also valid
      const boxes = await HexTextBoxSource.generateBoxes('4869', {
        hex: true,
        hexdecode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Text to Hex');
      expect(boxes[1].props.name).toBe('Hex to Text');
    });
  });
});
