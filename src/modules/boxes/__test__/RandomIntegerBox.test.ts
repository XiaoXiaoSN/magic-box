import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { expect } from '@jest/globals';

import { RandomIntegerBoxSource } from '../RandomIntegerBox';

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
      expect(RandomIntegerBoxSource.checkMatch('random 1')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random -1')).toBeUndefined();
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

    it('should not match when min >= max', () => {
      const match = RandomIntegerBoxSource.checkMatch('random 10-1');
      expect(match).toBeUndefined();
    });

    it('should not match invalid formats', () => {
      expect(RandomIntegerBoxSource.checkMatch('random-1-10')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random1-10')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('randomx')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random -1-10')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random 1--10')).toBeUndefined();
      expect(RandomIntegerBoxSource.checkMatch('random 1-10-10')).toBeUndefined();
    });
  });

  describe('generateBoxes', () => {
    it('should generate box with default range', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes('random');
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.name).toBe('Random Number');

      const value = parseInt(box.props.plaintextOutput, 10);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(100);
      expect(box.component).toBe(DefaultBoxTemplate);
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

    it('should return empty array for non-matching input', async () => {
      const boxes = await RandomIntegerBoxSource.generateBoxes('not a random command');
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
