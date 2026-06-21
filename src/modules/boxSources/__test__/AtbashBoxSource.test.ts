import { expect } from 'vitest';

import { AtbashBoxSource } from '../AtbashBoxSource';

describe('AtbashBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when atbash option is absent', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('Hello, World!', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when options object lacks atbash key', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('Hello, World!', {});
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array for empty input', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('', { atbash: true });
      expect(boxes).toHaveLength(0);
    });

    it('should cipher Hello, World! to Svool, Dliow!', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('Hello, World!', {
        atbash: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Atbash');
      expect(boxes[0].props.plaintextOutput).toBe('Svool, Dliow!');
      expect(boxes[0].props.priority).toBe(10);
    });

    it('should cipher lowercase abc to zyx', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('abc', {
        atbash: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('zyx');
    });

    it('should cipher uppercase ABC to ZYX', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('ABC', {
        atbash: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('ZYX');
    });

    it('should be self-inverse: applying atbash twice returns original', async () => {
      const original = 'Hello, World!';
      const first = await AtbashBoxSource.generateBoxes(original, {
        atbash: true,
      });
      const ciphered = first[0].props.plaintextOutput as string;
      const second = await AtbashBoxSource.generateBoxes(ciphered, {
        atbash: true,
      });
      expect(second[0].props.plaintextOutput).toBe(original);
    });

    it('should leave digits and punctuation unchanged', async () => {
      const boxes = await AtbashBoxSource.generateBoxes('123!', {
        atbash: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('123!');
    });
  });
});
