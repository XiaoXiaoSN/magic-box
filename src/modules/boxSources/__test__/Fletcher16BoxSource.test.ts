import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Fletcher16BoxSource } from '../Fletcher16BoxSource';

describe('Fletcher16BoxSource', () => {
  describe('generateBoxes - guard conditions', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('', {
        fletcher16: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('   ', {
        fletcher16: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - canonical Fletcher-16 vectors', () => {
    it('"abcde" produces checksum 51440 / 0xc8f0', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', {
        fletcher16: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Checksum: '51440',
        Hex: '0xc8f0',
      });
    });

    it('"abcdef" produces checksum 8279 / 0x2057', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcdef', {
        fletcher16: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Checksum: '8279',
        Hex: '0x2057',
      });
    });

    it('"abcdefgh" produces checksum 1575 / 0x0627', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcdefgh', {
        fletcher16: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Checksum: '1575',
        Hex: '0x0627',
      });
    });
  });

  describe('generateBoxes - box shape', () => {
    it('box name is "Fletcher-16"', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', {
        fletcher16: true,
      });
      expect(boxes[0].props.name).toBe('Fletcher-16');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', {
        fletcher16: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('options include Sum1 and Sum2 keys', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', {
        fletcher16: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts).toHaveProperty('Sum1');
      expect(opts).toHaveProperty('Sum2');
    });

    it('plaintext output contains k:v lines', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', {
        fletcher16: true,
      });
      const text = boxes[0].props.plaintextOutput as string;
      expect(text).toContain('Checksum: 51440');
      expect(text).toContain('Hex: 0xc8f0');
    });

    it('priority matches source priority', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', {
        fletcher16: true,
      });
      expect(boxes[0].props.priority).toBe(Fletcher16BoxSource.priority);
    });
  });

  describe('generateBoxes - ::fletcher alias', () => {
    it('::fletcher option triggers the box', async () => {
      const boxes = await Fletcher16BoxSource.generateBoxes('abcde', {
        fletcher: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Checksum: '51440',
        Hex: '0xc8f0',
      });
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Fletcher16BoxSource.name).toBe('Fletcher-16');
      expect(Fletcher16BoxSource.tag).toBe('#');
      expect(Fletcher16BoxSource.kind).toBe('Encode');
      expect(typeof Fletcher16BoxSource.priority).toBe('number');
    });
  });
});
