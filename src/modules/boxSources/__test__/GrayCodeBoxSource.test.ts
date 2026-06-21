import { describe, expect, it } from 'vitest';
import { GrayCodeBoxSource } from '../GrayCodeBoxSource';

describe('GrayCodeBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no option is present', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('4', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated option is present', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('4', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    // encode: 4 (100) XOR 2 (010) = 6 (110)
    it('encodes 4 to Gray (binary) 110 via ::gray', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('4', { gray: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Gray (binary)']).toBe('110');
      expect(boxes[0].props.options?.['Gray (decimal)']).toBe('6');
      expect(boxes[0].props.options?.Decimal).toBe('4');
      expect(boxes[0].props.options?.Binary).toBe('100');
    });

    it('encodes 4 to Gray (binary) 110 via ::graycode', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('4', {
        graycode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Gray (binary)']).toBe('110');
    });

    // encode: 0 XOR 0 = 0
    it('encodes 0 to Gray (binary) 0', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('0', { gray: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Gray (binary)']).toBe('0');
    });

    // encode: 7 (111) XOR 3 (011) = 4 (100)
    it('encodes 7 to Gray (binary) 100', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('7', { gray: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Gray (binary)']).toBe('100');
      expect(boxes[0].props.options?.['Gray (decimal)']).toBe('4');
    });

    it('decodes Gray binary 110 back to decimal 4 via ::graydecode', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('110', {
        graydecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Decimal).toBe('4');
      expect(boxes[0].props.options?.['Gray (binary)']).toBe('110');
      expect(boxes[0].props.options?.Binary).toBe('100');
    });

    // round-trip for n=4: encode then decode
    it('round-trips n=4: decode(encode(4)) === 4', async () => {
      const encBoxes = await GrayCodeBoxSource.generateBoxes('4', {
        gray: true,
      });
      const grayBin = encBoxes[0].props.options?.['Gray (binary)'] as string;
      const decBoxes = await GrayCodeBoxSource.generateBoxes(grayBin, {
        graydecode: true,
      });
      expect(decBoxes[0].props.options?.Decimal).toBe('4');
    });

    // round-trip for n=7: encode then decode
    it('round-trips n=7: decode(encode(7)) === 7', async () => {
      const encBoxes = await GrayCodeBoxSource.generateBoxes('7', {
        gray: true,
      });
      const grayBin = encBoxes[0].props.options?.['Gray (binary)'] as string;
      const decBoxes = await GrayCodeBoxSource.generateBoxes(grayBin, {
        graydecode: true,
      });
      expect(decBoxes[0].props.options?.Decimal).toBe('7');
    });

    it('returns empty array for invalid encode input (non-numeric)', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('abc', {
        gray: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for invalid decode input (non-binary digits)', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('102', {
        graydecode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('plaintextOutput for encode is the Gray binary string', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('4', { gray: true });
      expect(boxes[0].props.plaintextOutput).toBe('110');
    });

    it('plaintextOutput for decode is the decoded decimal string', async () => {
      const boxes = await GrayCodeBoxSource.generateBoxes('110', {
        graydecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('4');
    });
  });
});
