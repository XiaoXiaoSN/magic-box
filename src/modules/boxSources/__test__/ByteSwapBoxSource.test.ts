import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { ByteSwapBoxSource } from '../ByteSwapBoxSource';

describe('ByteSwapBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(ByteSwapBoxSource.name).toBe('Byte Swap');
      expect(ByteSwapBoxSource.tag).toBe('#');
      expect(ByteSwapBoxSource.kind).toBe('Convert');
      expect(typeof ByteSwapBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - trigger guard', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0x12345678', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0x12345678', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - ::byteswap trigger', () => {
    it('swaps 0x12345678 to 0x78563412', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0x12345678', {
        byteswap: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('0x12345678');
      expect(opts.Swapped).toBe('0x78563412');
      expect(opts.Bytes).toBe('4');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0x12345678', {
        byteswap: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority from ByteSwapBoxSource.priority', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0x12345678', {
        byteswap: true,
      });
      expect(boxes[0].props.priority).toBe(ByteSwapBoxSource.priority);
    });
  });

  describe('generateBoxes - ::endian alias', () => {
    it('works with ::endian option', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0x12345678', {
        endian: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Swapped).toBe('0x78563412');
    });
  });

  describe('generateBoxes - input without 0x prefix', () => {
    it('accepts hex without 0x prefix and normalizes output', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('deadbeef', {
        byteswap: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('0xdeadbeef');
      expect(opts.Swapped).toBe('0xefbeadde');
    });
  });

  describe('generateBoxes - 2-byte big-endian / little-endian', () => {
    it('0x00ff → Swapped 0xff00, As BE 255, As LE 65280', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0x00ff', {
        byteswap: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('0x00ff');
      expect(opts.Swapped).toBe('0xff00');
      expect(opts.Bytes).toBe('2');
      expect(opts['As BE']).toBe('255');
      expect(opts['As LE']).toBe('65280');
    });
  });

  describe('generateBoxes - 8-byte round-trip', () => {
    it('swapping twice returns the original value', async () => {
      const original = '0x0102030405060708';
      const firstPass = await ByteSwapBoxSource.generateBoxes(original, {
        byteswap: true,
      });
      const swappedHex = (firstPass[0].props.options as Record<string, string>)
        .Swapped;

      const secondPass = await ByteSwapBoxSource.generateBoxes(swappedHex, {
        byteswap: true,
      });
      const roundTripped = (
        secondPass[0].props.options as Record<string, string>
      ).Swapped;

      // strip leading 0x before comparing to original lowercase hex
      expect(roundTripped).toBe('0x0102030405060708');
    });
  });

  describe('generateBoxes - error cases', () => {
    it('odd-length hex returns an error box mentioning even number of digits', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0xabc', {
        byteswap: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/even number of digits/i);
    });

    it('invalid characters return an error box mentioning hex', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('xyz', {
        byteswap: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/hex/i);
    });
  });

  describe('generateBoxes - plaintextOutput', () => {
    it('plaintext output contains key: value pairs', async () => {
      const boxes = await ByteSwapBoxSource.generateBoxes('0x1234', {
        byteswap: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Input: 0x1234');
      expect(text).toContain('Swapped: 0x3412');
    });
  });
});
