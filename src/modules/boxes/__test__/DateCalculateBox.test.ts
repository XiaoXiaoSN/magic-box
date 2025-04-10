import { DefaultBox } from '@components/Boxes';
import { expect } from '@jest/globals';

import { DateCalculateBoxSource } from '../DateCalculateBox';

describe('DateCalculateBoxSource', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkAddSubtractPattern', () => {
    it('should return undefined for non-matching input', () => {
      expect(DateCalculateBoxSource.checkAddSubtractPattern('')).toBeUndefined();
      expect(DateCalculateBoxSource.checkAddSubtractPattern('invalid')).toBeUndefined();
      expect(DateCalculateBoxSource.checkAddSubtractPattern('2024/01/01 + 20d')).toBeUndefined();
    });

    it('should handle "now + days" format', () => {
      const result = DateCalculateBoxSource.checkAddSubtractPattern('now + 20d');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-01-01');
      expect(result?.toDate).toBe('2024-01-21');
      expect(result?.days).toBe(20);
      expect(result?.operation).toBe('+');
    });

    it('should handle "now - days" format', () => {
      const result = DateCalculateBoxSource.checkAddSubtractPattern('now - 10d');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-01-01');
      expect(result?.toDate).toBe('2023-12-22');
      expect(result?.days).toBe(10);
      expect(result?.operation).toBe('-');
    });

    it('should handle "specific date + days" format', () => {
      const result = DateCalculateBoxSource.checkAddSubtractPattern('2024-10-31 + 30d');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-10-31');
      expect(result?.toDate).toBe('2024-11-30');
      expect(result?.days).toBe(30);
      expect(result?.operation).toBe('+');
    });

    it('should handle "specific date - days" format', () => {
      const result = DateCalculateBoxSource.checkAddSubtractPattern('2024-10-31 - 30d');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-10-31');
      expect(result?.toDate).toBe('2024-10-01');
      expect(result?.days).toBe(30);
      expect(result?.operation).toBe('-');
    });
  });

  describe('checkDateDiffPattern', () => {
    it('should return undefined for non-matching input', () => {
      expect(DateCalculateBoxSource.checkDateDiffPattern('')).toBeUndefined();
      expect(DateCalculateBoxSource.checkDateDiffPattern('invalid')).toBeUndefined();
      expect(DateCalculateBoxSource.checkDateDiffPattern('2024/01/01 to 2025/01/01')).toBeUndefined();
    });

    it('should handle "now to specific date" format', () => {
      const result = DateCalculateBoxSource.checkDateDiffPattern('now to 2024-12-31');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-01-01');
      expect(result?.toDate).toBe('2024-12-31');
      expect(result?.days).toBe(365);
      expect(result?.operation).toBe('diff');
    });

    it('should handle "specific date to specific date" format', () => {
      const result = DateCalculateBoxSource.checkDateDiffPattern('2024-01-01 to 2024-12-31');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2024-01-01');
      expect(result?.toDate).toBe('2024-12-31');
      expect(result?.days).toBe(365);
      expect(result?.operation).toBe('diff');
    });

    it('should handle "specific date to now" format', () => {
      const result = DateCalculateBoxSource.checkDateDiffPattern('2023-01-01 to now');
      expect(result).toBeDefined();
      expect(result?.fromDate).toBe('2023-01-01');
      expect(result?.toDate).toBe('2024-01-01');
      expect(result?.days).toBe(365);
      expect(result?.operation).toBe('diff');
    });

    it('should be case insensitive for "to" keyword', () => {
      const result = DateCalculateBoxSource.checkDateDiffPattern('now TO 2024-12-31');
      expect(result).toBeDefined();
      expect(result?.operation).toBe('diff');
    });
  });

  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(DateCalculateBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for invalid date format', () => {
      expect(DateCalculateBoxSource.checkMatch('2024/01/01 + 20d')).toBeUndefined();
      expect(DateCalculateBoxSource.checkMatch('today + 20d')).toBeUndefined();
      expect(DateCalculateBoxSource.checkMatch('now + 20')).toBeUndefined();
    });

    it('should handle add/subtract pattern', () => {
      const result = DateCalculateBoxSource.checkMatch('now + 20d');
      expect(result).toBeDefined();
      expect(result?.operation).toBe('+');
    });

    it('should handle date diff pattern', () => {
      const result = DateCalculateBoxSource.checkMatch('now to 2024-12-31');
      expect(result).toBeDefined();
      expect(result?.operation).toBe('diff');
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid input', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('invalid input');
      expect(boxes).toHaveLength(0);
    });

    it('should generate correct box for addition format', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('now + 20d');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Date Calculate');
      expect(boxes[0].props.plaintextOutput).toBe('2024-01-21');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].component).toBe(DefaultBox);
    });

    it('should generate correct box for subtraction format', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('2024-10-31 - 30d');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Date Calculate');
      expect(boxes[0].props.plaintextOutput).toBe('2024-10-01');
    });

    it('should generate correct box for difference format', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('now to 2024-12-31');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Date Calculate');
      expect(boxes[0].props.plaintextOutput).toBe('365 days');
    });

    it('should set correct options in box props', async () => {
      const boxes = await DateCalculateBoxSource.generateBoxes('now + 20d');
      expect(boxes[0].props.options).toEqual({
        fromDate: '2024-01-01',
        toDate: '2024-01-21',
        days: '20',
        operation: '+',
      });
    });
  });
});
