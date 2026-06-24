import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Rot47BoxSource } from '../Rot47BoxSource';

describe('Rot47BoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('Hello, World!', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('Hello, World!', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - empty input', () => {
    it('returns empty array for empty string', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('', { rot47: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('   ', { rot47: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - known vector', () => {
    it('produces canonical ROT47 output for "Hello, World!"', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('Hello, World!', {
        rot47: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('w6==@[ (@C=5P');
      expect(boxes[0].props.name).toBe('ROT47');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('produces correct ROT47 for "ABC"', async () => {
      // A(65)→p, B(66)→q, C(67)→r
      const boxes = await Rot47BoxSource.generateBoxes('ABC', { rot47: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('pqr');
    });
  });

  describe('generateBoxes - self-inverse property', () => {
    it('rot47(rot47(x)) === x for "Hello, World!"', async () => {
      const first = await Rot47BoxSource.generateBoxes('Hello, World!', {
        rot47: true,
      });
      const encoded = first[0].props.plaintextOutput as string;
      const second = await Rot47BoxSource.generateBoxes(encoded, {
        rot47: true,
      });
      expect(second[0].props.plaintextOutput).toBe('Hello, World!');
    });

    it('rot47(rot47(x)) === x for arbitrary printable ASCII', async () => {
      const input =
        '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const first = await Rot47BoxSource.generateBoxes(input, { rot47: true });
      const second = await Rot47BoxSource.generateBoxes(
        first[0].props.plaintextOutput as string,
        { rot47: true },
      );
      expect(second[0].props.plaintextOutput).toBe(input);
    });
  });

  describe('generateBoxes - boundary characters', () => {
    it('preserves spaces (code 32, below range 33-126)', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('A B', { rot47: true });
      expect(boxes).toHaveLength(1);
      // A→p, space→space, B→q
      expect(boxes[0].props.plaintextOutput).toBe('p q');
    });

    it('preserves newline and tab (control characters below 33)', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('A\nB\tC', {
        rot47: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('p\nq\tr');
    });

    it('preserves non-ASCII characters (codes > 126)', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('héllo', {
        rot47: true,
      });
      expect(boxes).toHaveLength(1);
      // lowercase h(104)→9, é unchanged (code 233), l→=, l→=, o→@
      expect(boxes[0].props.plaintextOutput).toBe('9é==@');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Rot47BoxSource.name).toBe('ROT47');
      expect(Rot47BoxSource.tag).toBe('#');
      expect(Rot47BoxSource.kind).toBe('Encode');
      expect(typeof Rot47BoxSource.priority).toBe('number');
    });
  });
});
