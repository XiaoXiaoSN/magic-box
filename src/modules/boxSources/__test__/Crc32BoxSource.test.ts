import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Crc32BoxSource } from '../Crc32BoxSource';

describe('Crc32BoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no crc32 option is provided', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - empty input', () => {
    it('returns empty array for empty string', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('', { crc32: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only string', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('   ', { crc32: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - known CRC-32 vectors', () => {
    it('produces canonical check value cbf43926 for "123456789"', async () => {
      // canonical CRC-32 check value per ISO 3309 / ITU-T V.42
      const boxes = await Crc32BoxSource.generateBoxes('123456789', {
        crc32: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Hex: 'cbf43926',
        Decimal: (0xcbf43926).toString(10),
        Uppercase: 'CBF43926',
      });
    });

    it('produces 414fa339 for the quick-brown-fox sentence', async () => {
      const input = 'The quick brown fox jumps over the lazy dog';
      const boxes = await Crc32BoxSource.generateBoxes(input, { crc32: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Hex: '414fa339',
        Uppercase: '414FA339',
      });
    });
  });

  describe('generateBoxes - output format', () => {
    it('Hex is exactly 8 lowercase hex characters for "hello"', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {
        crc32: true,
      });
      expect(boxes).toHaveLength(1);
      const { Hex, Uppercase, Decimal } = boxes[0].props.options as Record<
        string,
        string
      >;
      expect(Hex).toMatch(/^[0-9a-f]{8}$/);
      expect(Uppercase).toBe(Hex.toUpperCase());
      expect(Number.parseInt(Decimal, 10)).toBe(Number.parseInt(Hex, 16));
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {
        crc32: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await Crc32BoxSource.generateBoxes('hello', {
        crc32: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Crc32BoxSource.name).toBe('CRC-32');
      expect(Crc32BoxSource.tag).toBe('#');
      expect(Crc32BoxSource.kind).toBe('Encode');
      expect(Crc32BoxSource.priority).toBe(10);
    });
  });
});
