import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { PopcountBoxSource } from '../PopcountBoxSource';

describe('PopcountBoxSource', () => {
  describe('option gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('::popcount option', () => {
    it('activates on ::popcount', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {
        popcount: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('activates on ::bitcount', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {
        bitcount: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('255 (0xff = 11111111)', () => {
    it('has Set Bits = 8', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Set Bits']).toBe('8');
    });

    it('has Bit Length = 8', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Bit Length']).toBe('8');
    });

    it('has Trailing Zeros = 0', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Trailing Zeros']).toBe('0');
    });

    it('has correct Decimal, Binary, Hex fields', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {
        popcount: true,
      });
      const opts = boxes[0].props.options;
      expect(opts?.Decimal).toBe('255');
      expect(opts?.Binary).toBe('0b11111111');
      expect(opts?.Hex).toBe('0xff');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('255', {
        popcount: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });

  describe('0 edge case', () => {
    it('has Set Bits = 0', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('0', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Set Bits']).toBe('0');
    });

    it('has Bit Length = 0', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('0', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Bit Length']).toBe('0');
    });

    it('has Trailing Zeros = 0', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('0', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Trailing Zeros']).toBe('0');
    });
  });

  describe('8 (0b1000)', () => {
    it('has Set Bits = 1', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('8', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Set Bits']).toBe('1');
    });

    it('has Trailing Zeros = 3', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('8', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Trailing Zeros']).toBe('3');
    });
  });

  describe('hex input 0xff', () => {
    it('has Set Bits = 8', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('0xff', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Set Bits']).toBe('8');
    });
  });

  describe('binary input 0b1010', () => {
    it('has Set Bits = 2', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('0b1010', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Set Bits']).toBe('2');
    });

    it('has Trailing Zeros = 1', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('0b1010', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Trailing Zeros']).toBe('1');
    });
  });

  describe('64-bit all-ones: 0xffffffffffffffff', () => {
    it('has Set Bits = 64 (BigInt — no overflow)', async () => {
      const boxes = await PopcountBoxSource.generateBoxes(
        '0xffffffffffffffff',
        {
          popcount: true,
        },
      );
      expect(boxes[0].props.options?.['Set Bits']).toBe('64');
    });

    it('has Bit Length = 64', async () => {
      const boxes = await PopcountBoxSource.generateBoxes(
        '0xffffffffffffffff',
        {
          popcount: true,
        },
      );
      expect(boxes[0].props.options?.['Bit Length']).toBe('64');
    });

    it('has Trailing Zeros = 0', async () => {
      const boxes = await PopcountBoxSource.generateBoxes(
        '0xffffffffffffffff',
        {
          popcount: true,
        },
      );
      expect(boxes[0].props.options?.['Trailing Zeros']).toBe('0');
    });
  });

  describe('power of two: 1024 (0b10000000000)', () => {
    it('has Set Bits = 1', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('1024', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Set Bits']).toBe('1');
    });

    it('has Bit Length = 11', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('1024', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Bit Length']).toBe('11');
    });

    it('has Trailing Zeros = 10', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('1024', {
        popcount: true,
      });
      expect(boxes[0].props.options?.['Trailing Zeros']).toBe('10');
    });
  });

  describe('invalid inputs', () => {
    it('returns an error box for "abc"', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('abc', {
        popcount: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Error).toBeTruthy();
    });

    it('returns an error box for "-5"', async () => {
      // -5 starts with '-', not matched by decimal/hex/binary patterns → error box
      const boxes = await PopcountBoxSource.generateBoxes('-5', {
        popcount: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Error).toBeTruthy();
    });

    it('returns an error box for empty string', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('', {
        popcount: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Error).toBeTruthy();
    });
  });

  describe('box metadata', () => {
    it('box name is Popcount', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('1', {
        popcount: true,
      });
      expect(boxes[0].props.name).toBe('Popcount');
    });

    it('priority matches source priority', async () => {
      const boxes = await PopcountBoxSource.generateBoxes('1', {
        popcount: true,
      });
      expect(boxes[0].props.priority).toBe(PopcountBoxSource.priority);
    });
  });

  describe('static metadata', () => {
    it('has expected name, tag, kind', () => {
      expect(PopcountBoxSource.name).toBe('Popcount');
      expect(PopcountBoxSource.tag).toBe('#');
      expect(PopcountBoxSource.kind).toBe('Calculate');
    });
  });
});
