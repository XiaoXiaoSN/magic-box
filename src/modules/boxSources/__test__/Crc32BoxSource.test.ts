import { describe, expect, it } from 'vitest';

import { Crc32BoxSource } from '../Crc32BoxSource';

describe('Crc32BoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no crc option is provided', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated option is provided', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {
        sha256: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - known CRC-32 vectors', () => {
    it('"hello" → Hex 3610a686', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {
        crc32: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options).not.toBeNull();
      expect((options as Record<string, string>).Hex).toBe('3610a686');
    });

    it('"hello" Decimal equals parseInt(hex, 16)', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {
        crc32: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe(String(parseInt(opts.Hex, 16)));
    });

    it('"The quick brown fox jumps over the lazy dog" → Hex 414fa339', async () => {
      const boxes = await Crc32BoxSource.generateBoxes(
        'The quick brown fox jumps over the lazy dog',
        { crc32: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Hex).toBe('414fa339');
      expect(opts.Decimal).toBe(String(0x414fa339));
    });

    // canonical CRC-32 check value per ISO 3309 / ITU-T V.42
    it('"123456789" → Hex cbf43926 (canonical check value)', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('123456789', {
        crc32: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Hex).toBe('cbf43926');
      expect(opts.Decimal).toBe(String(0xcbf43926));
    });

    it('::crc alias also triggers the box', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', { crc: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Hex).toBe('3610a686');
    });
  });

  describe('generateBoxes - input cap', () => {
    it('returns empty array when input exceeds MAX_INPUT (100 000 chars)', async () => {
      const huge = 'a'.repeat(100_001);
      const boxes = await Crc32BoxSource.generateBoxes(huge, { crc32: true });
      expect(boxes).toHaveLength(0);
    });

    it('accepts input at the boundary (100 000 chars)', async () => {
      const boundary = 'a'.repeat(100_000);
      const boxes = await Crc32BoxSource.generateBoxes(boundary, {
        crc32: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('box structure', () => {
    it('box name is "CRC32"', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {
        crc32: true,
      });
      expect(boxes[0].props.name).toBe('CRC32');
    });

    it('box priority matches source priority', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {
        crc32: true,
      });
      expect(boxes[0].props.priority).toBe(Crc32BoxSource.priority);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Crc32BoxSource.name).toBe('CRC32');
      expect(Crc32BoxSource.tag).toBe('#');
      expect(Crc32BoxSource.kind).toBe('Hash');
      expect(typeof Crc32BoxSource.priority).toBe('number');
    });
  });
});
