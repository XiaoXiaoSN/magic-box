import { describe, expect, it } from 'vitest';

import { Rot47BoxSource } from '../Rot47BoxSource';

describe('Rot47BoxSource', () => {
  describe('generateBoxes - option gate', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('Hello, World!', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when rot47 option is absent', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('Hello, World!', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input even with rot47 option', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('', { rot47: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - known vector', () => {
    it('transforms "Hello, World!" to the correct ROT47 output', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('Hello, World!', {
        rot47: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('ROT47');
      expect(boxes[0].props.plaintextOutput).toBe('w6==@[ (@C=5P');
    });

    it('is self-inverse: applying rot47 twice returns the original', async () => {
      const first = await Rot47BoxSource.generateBoxes('Hello, World!', {
        rot47: true,
      });
      const encoded = first[0].props.plaintextOutput as string;

      const second = await Rot47BoxSource.generateBoxes(encoded, {
        rot47: true,
      });
      expect(second[0].props.plaintextOutput).toBe('Hello, World!');
    });

    it('leaves spaces and non-ASCII characters unchanged', async () => {
      // space (32) and non-ASCII are outside 33-126, so they pass through
      const boxes = await Rot47BoxSource.generateBoxes('a b', { rot47: true });
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput as string;
      // the space in the middle must survive unchanged
      expect(output[1]).toBe(' ');
    });

    it('rotates digit "0" (code 48) to "_" (code 95)', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('0', { rot47: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('_');
    });
  });

  describe('generateBoxes - box properties', () => {
    it('sets priority from source priority', async () => {
      const boxes = await Rot47BoxSource.generateBoxes('test', { rot47: true });
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
