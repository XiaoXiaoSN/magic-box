import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { BinaryTextBoxSource } from '../BinaryTextBoxSource';

describe('BinaryTextBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('Hi', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are provided', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('Hi', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with ::binary', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('', {
        binary: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with ::binary', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('   ', {
        binary: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — ::binary / ::tobinary', () => {
    it('encodes "Hi" to correct binary via ::binary (H=72=01001000, i=105=01101001)', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('Hi', {
        binary: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('01001000 01101001');
    });

    it('encodes "Hi" identically via ::tobinary', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('Hi', {
        tobinary: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('01001000 01101001');
    });

    it('encodes "A" (65=01000001)', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('A', {
        binary: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('01000001');
    });

    it('sets box name to "Text to Binary"', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('A', {
        binary: true,
      });
      expect(boxes[0].props.name).toBe('Text to Binary');
    });

    it('uses DefaultBoxTemplate and hides expand button', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('A', {
        binary: true,
      });
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('decode — ::binarydecode / ::frombinary', () => {
    it('decodes space-separated binary "01001000 01101001" to "Hi"', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes(
        '01001000 01101001',
        { binarydecode: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });

    it('decodes contiguous binary without spaces to "Hi"', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes(
        '0100100001101001',
        { binarydecode: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });

    it('decodes via ::frombinary alias', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes(
        '01001000 01101001',
        { frombinary: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hi');
    });

    it('sets box name to "Binary to Text"', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('01000001', {
        binarydecode: true,
      });
      expect(boxes[0].props.name).toBe('Binary to Text');
    });

    it('returns error box for invalid binary containing non-0/1 digits', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('0102', {
        binarydecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid binary/i);
    });

    it('returns error box when bit count is not a multiple of 8', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('0100100', {
        binarydecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid binary/i);
    });
  });

  describe('round-trip', () => {
    it('round-trips "Hello!" through encode then decode', async () => {
      const encBoxes = await BinaryTextBoxSource.generateBoxes('Hello!', {
        binary: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;

      const decBoxes = await BinaryTextBoxSource.generateBoxes(encoded, {
        binarydecode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe('Hello!');
    });
  });

  describe('both options together', () => {
    it('returns 2 boxes when both ::binary and ::binarydecode are set', async () => {
      const boxes = await BinaryTextBoxSource.generateBoxes('01000001', {
        binary: true,
        binarydecode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Text to Binary');
      expect(names).toContain('Binary to Text');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(BinaryTextBoxSource.name).toBe('Text to Binary');
      expect(BinaryTextBoxSource.tag).toBe('#');
      expect(BinaryTextBoxSource.kind).toBe('Encode');
      expect(typeof BinaryTextBoxSource.priority).toBe('number');
    });
  });
});
