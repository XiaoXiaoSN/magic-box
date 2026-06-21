import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Crc8BoxSource } from '../Crc8BoxSource';

describe('Crc8BoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is provided', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - empty input', () => {
    it('returns [] for empty string with ::crc8', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('', { crc8: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with ::crc8', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('   ', { crc8: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - canonical check values for "123456789"', () => {
    it('returns one CRC-8 box', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', {
        crc8: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('box name is CRC-8', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', {
        crc8: true,
      });
      expect(boxes[0].props.name).toBe('CRC-8');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', {
        crc8: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('SMBUS check value is 0xf4 (canonical CRC-8/SMBUS)', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', {
        crc8: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.SMBUS).toBe('0xf4');
    });

    it('Maxim check value is 0xa1 (canonical CRC-8/MAXIM)', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', {
        crc8: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Maxim).toBe('0xa1');
    });

    it('plaintextOutput is non-empty and contains SMBUS: 0xf4', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', {
        crc8: true,
      });
      const pt = boxes[0].props.plaintextOutput;
      expect(pt.length).toBeGreaterThan(0);
      expect(pt).toContain('SMBUS: 0xf4');
    });

    it('plaintextOutput contains Maxim: 0xa1', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('123456789', {
        crc8: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('Maxim: 0xa1');
    });
  });

  describe('generateBoxes - priority', () => {
    it('box priority matches source priority', async () => {
      const boxes = await Crc8BoxSource.generateBoxes('hello', { crc8: true });
      expect(boxes[0].props.priority).toBe(Crc8BoxSource.priority);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Crc8BoxSource.name).toBe('CRC-8');
      expect(Crc8BoxSource.tag).toBe('#');
      expect(Crc8BoxSource.kind).toBe('Encode');
      expect(typeof Crc8BoxSource.priority).toBe('number');
    });
  });
});
