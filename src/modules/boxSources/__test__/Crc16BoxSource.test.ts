import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Crc16BoxSource } from '../Crc16BoxSource';

describe('Crc16BoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Crc16BoxSource.name).toBe('CRC-16');
      expect(Crc16BoxSource.tag).toBe('#');
      expect(Crc16BoxSource.kind).toBe('Encode');
      expect(typeof Crc16BoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - gate', () => {
    it('returns empty array when crc16 option is absent', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when options object has no crc16 key', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input with crc16 option', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('', { crc16: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('   ', { crc16: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - canonical check values for "123456789"', () => {
    it('returns exactly one box', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', {
        crc16: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('box uses KeyValueBoxTemplate', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', {
        crc16: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box is named CRC-16', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', {
        crc16: true,
      });
      expect(boxes[0].props.name).toBe('CRC-16');
    });

    // canonical CRC-16/CCITT-FALSE check value for "123456789"
    it('CCITT-FALSE option value is 0x29b1', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', {
        crc16: true,
      });
      expect(boxes[0].props.options?.['CCITT-FALSE']).toBe('0x29b1');
    });

    // canonical CRC-16/MODBUS check value for "123456789"
    it('Modbus option value is 0x4b37', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', {
        crc16: true,
      });
      expect(boxes[0].props.options?.Modbus).toBe('0x4b37');
    });

    it('plaintextOutput is non-empty and contains CCITT-FALSE result', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', {
        crc16: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toBeTruthy();
      expect(text).toContain('CCITT-FALSE: 0x29b1');
    });

    it('plaintextOutput contains Modbus result', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('123456789', {
        crc16: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('Modbus: 0x4b37');
    });
  });

  describe('generateBoxes - priority', () => {
    it('box carries the source priority', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('hello', {
        crc16: true,
      });
      expect(boxes[0].props.priority).toBe(Crc16BoxSource.priority);
    });
  });

  describe('generateBoxes - UTF-8 input', () => {
    it('processes non-ASCII input without throwing', async () => {
      const boxes = await Crc16BoxSource.generateBoxes('héllo wörld', {
        crc16: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['CCITT-FALSE']).toMatch(
        /^0x[0-9a-f]{4}$/,
      );
      expect(boxes[0].props.options?.Modbus).toMatch(/^0x[0-9a-f]{4}$/);
    });
  });
});
