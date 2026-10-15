import { expect } from 'vitest';

import { RandomIntegerBoxSource } from '../RandomIntegerBoxSource';

describe('RandomIntegerBoxSource', () => {
  describe('checkMatch', () => {
    it('should match "random" command', () => {
      const match = RandomIntegerBoxSource.checkMatch('random');
      expect(match).toBeDefined();
      expect(match).toEqual({ min: 0, max: 100 });
    });

    it('should match "random" with single number', () => {
      const match = RandomIntegerBoxSource.checkMatch('random 100');
      expect(match).toBeDefined();
      expect(match).toEqual({ min: 0, max: 100 });
    });

    it('should not match when single number is invalid', () => {
      expect(RandomIntegerBoxSource.checkMatch('random 0')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random -1')).toBeUndefined();
    });

    it('should match a single upper bound of one', () => {
      expect(RandomIntegerBoxSource.checkMatch('random 1')).toEqual({
        min: 0,
        max: 1,
      });
    });

    it('should match "random" with custom range', () => {
      const match = RandomIntegerBoxSource.checkMatch('random 1-10');
      expect(match).toBeDefined();
      expect(match).toEqual({ min: 1, max: 10 });
    });

    it('should match case-insensitive', () => {
      const match = RandomIntegerBoxSource.checkMatch('RANDOM 1-10');
      expect(match).toBeDefined();
      expect(match).toEqual({ min: 1, max: 10 });
    });

    it('should match with tilde separator', () => {
      const match = RandomIntegerBoxSource.checkMatch('random 1 ~ 10');
      expect(match).toBeDefined();
      expect(match).toEqual({ min: 1, max: 10 });
    });

    it('should swap reversed bounds', () => {
      const match = RandomIntegerBoxSource.checkMatch('random 6-1');
      expect(match).toEqual({ min: 1, max: 6 });
    });

    it('should accept an inclusive single-value range', () => {
      expect(RandomIntegerBoxSource.checkMatch('random 6-6')).toEqual({
        min: 6,
        max: 6,
      });
    });

    it('should reject bounds above Number.MAX_SAFE_INTEGER', () => {
      expect(
        RandomIntegerBoxSource.checkMatch('random 9007199254740992'),
      ).toBeUndefined();
    });

    it('accepts leading zeros on the safe integer boundary', () => {
      expect(
        RandomIntegerBoxSource.checkMatch('random 09007199254740991'),
      ).toEqual({ min: 0, max: Number.MAX_SAFE_INTEGER });
    });

    it('should not match invalid formats', () => {
      expect(RandomIntegerBoxSource.checkMatch('random-1-10')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random1-10')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('randomx')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random -1-10')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random 1--10')).toBeUndefined();
      expect(
        RandomIntegerBoxSource.checkMatch('random 1-10-10'),
      ).toBeUndefined();
    });
  });

  describe('generateBoxes', () => {
    it('should generate box with default range', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes('random');
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.name).toBe('Random Number');

      const value = parseInt(box.props.plaintextOutput, 10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
      expect(box.boxTemplate).toBeUndefined();
    });

    it('should generate box with custom range', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes('random 5-10');
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.name).toBe('Random Number');

      const value = parseInt(box.props.plaintextOutput, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
    });

    it('should generate box with single number', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes('random 50');
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.name).toBe('Random Number');

      const value = parseInt(box.props.plaintextOutput, 10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(50);
      expect(box.props.options).toEqual({
        min: '0',
        max: '50',
      });
    });

    it('should generate a value for the single-bound range 0-1', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes('random 1');
      expect(boxes).toHaveLength(1);
      expect(['0', '1']).toContain(boxes[0].props.plaintextOutput);
    });

    it('should generate within a reversed large safe range', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes(
        'random 9007199254740991-9007199254740990',
      );
      expect(boxes).toHaveLength(1);
      expect(BigInt(boxes[0].props.plaintextOutput) >= 9007199254740990n).toBe(
        true,
      );
      expect(BigInt(boxes[0].props.plaintextOutput) <= 9007199254740991n).toBe(
        true,
      );
    });

    it('returns an error box for an unsafe bound', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes(
        'random 1-9007199254740992',
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/MAX_SAFE_INTEGER/);
    });

    it('should return empty array for non-matching input', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes(
        'not a random command',
      );
      expect(boxes).toHaveLength(0);
    });

    it('should use provided options in generated box', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes('random 20-30');
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.options).toEqual({
        min: '20',
        max: '30',
      });
    });
  });
});
