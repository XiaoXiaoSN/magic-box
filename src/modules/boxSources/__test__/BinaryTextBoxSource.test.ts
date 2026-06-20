import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { BinaryTextBoxSource } from '../BinaryTextBoxSource';

describe('BinaryTextBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(BinaryTextBoxSource.name).toBe('Binary Text');
      expect(BinaryTextBoxSource.tag).toBe('#');
      expect(BinaryTextBoxSource.kind).toBe('Encode');
      expect(typeof BinaryTextBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('hi', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('hi', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - encode', () => {
    it('encodes "hi" to correct 8-bit binary', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('hi', {
        binary: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Binary (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('01101000 01101001');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('encodes "A" to "01000001"', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('A', {
        binary: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('01000001');
    });

    it('encodes "€" (U+20AC, UTF-8: e2 82 ac) to three 8-bit groups', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('€', {
        binary: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('11100010 10000010 10101100');
    });

    it('accepts ::binaryencode option', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('A', {
        binaryencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('01000001');
    });

    it('accepts ::tobinary option', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('A', {
        tobinary: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('01000001');
    });

    it('does not show expand button', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('hi', {
        binary: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('generateBoxes - decode', () => {
    it('decodes space-separated binary "01101000 01101001" to "hi"', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes(
        '01101000 01101001',
        {
          binarydecode: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Binary (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('hi');
    });

    it('decodes contiguous binary "0110100001101001" to "hi"', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes(
        '0110100001101001',
        {
          binarydecode: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hi');
    });

    it('accepts ::frombinary option', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('01000001', {
        frombinary: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('A');
    });

    it('does not show expand button', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('01000001', {
        binarydecode: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('generateBoxes - invalid decode', () => {
    it('returns invalid box when bit count is not a multiple of 8', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('0110', {
        binarydecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('returns invalid box when input contains non-binary characters', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('012', {
        binarydecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });
  });

  describe('generateBoxes - both options', () => {
    it('returns 2 boxes when both encode and decode options are set', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('hi', {
        binary: true,
        binarydecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Binary (Encode)');
      expect(names).toContain('Binary (Decode)');
    });
  });
});
