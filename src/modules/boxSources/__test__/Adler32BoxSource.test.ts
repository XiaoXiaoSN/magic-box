import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Adler32BoxSource } from '../Adler32BoxSource';

describe('Adler32BoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Adler32BoxSource.name).toBe('Adler-32');
      expect(Adler32BoxSource.tag).toBe('#');
      expect(Adler32BoxSource.kind).toBe('Hash');
      expect(typeof Adler32BoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - option gate', () => {
    it('returns empty array when no option provided', async () => {
      const boxes = await Adler32BoxSource.generateBoxes('Wikipedia', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Adler32BoxSource.generateBoxes('Wikipedia', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input', async () => {
      const boxes = await Adler32BoxSource.generateBoxes('', { adler32: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - canonical vector: Wikipedia', () => {
    it('produces correct Decimal and Hex for "Wikipedia" via ::adler32', async () => {
      const boxes = await Adler32BoxSource.generateBoxes('Wikipedia', {
        adler32: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // canonical adler-32 of 'Wikipedia' is 0x11E60398 = 300286872
      expect(opts.Decimal).toBe('300286872');
      expect(opts.Hex).toBe('11e60398');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await Adler32BoxSource.generateBoxes('Wikipedia', {
        adler32: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets the box name to Adler-32', async () => {
      const boxes = await Adler32BoxSource.generateBoxes('Wikipedia', {
        adler32: true,
      });
      expect(boxes[0].props.name).toBe('Adler-32');
    });
  });

  describe('generateBoxes - canonical vector: "a"', () => {
    it('produces correct checksum for single character "a"', async () => {
      // utf-8 byte 97 → a=98, b=98 → (98<<16|98) = 6422626 = 0x00620062
      const boxes = await Adler32BoxSource.generateBoxes('a', {
        adler32: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('6422626');
      expect(opts.Hex).toBe('00620062');
    });
  });

  describe('generateBoxes - ::adler alias', () => {
    it('::adler alias triggers the same computation as ::adler32', async () => {
      const boxes = await Adler32BoxSource.generateBoxes('Wikipedia', {
        adler: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Decimal).toBe('300286872');
      expect(opts.Hex).toBe('11e60398');
    });
  });

  describe('generateBoxes - priority', () => {
    it('sets priority on the box', async () => {
      const boxes = await Adler32BoxSource.generateBoxes('Wikipedia', {
        adler32: true,
      });
      expect(boxes[0].props.priority).toBe(Adler32BoxSource.priority);
    });
  });
});
