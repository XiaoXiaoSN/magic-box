import { DefaultBox } from '@components/Boxes';
import { expect } from '@jest/globals';

import { MathExpressionBoxSource } from '../MathExpressionBox';

describe('MathExpressionBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(MathExpressionBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for non-math expressions', () => {
      expect(MathExpressionBoxSource.checkMatch('hello world')).toBeUndefined();
      expect(MathExpressionBoxSource.checkMatch('abc')).toBeUndefined();
    });

    it('should return correct result for basic arithmetic', () => {
      const result = MathExpressionBoxSource.checkMatch('1000 + 2000');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('3000');
    });

    it('should handle complex expressions', () => {
      let result = MathExpressionBoxSource.checkMatch('2 * (3 + 4)');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('14');

      result = MathExpressionBoxSource.checkMatch('sin(PI/2)');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('1');
    });

    it('should handle decimal numbers', () => {
      const result = MathExpressionBoxSource.checkMatch('1.5 * 2.5');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('3.75');
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid math expression', async () => {
      const boxes = await MathExpressionBoxSource.generateBoxes('invalid math');
      expect(boxes).toHaveLength(0);
    });

    it('should generate correct box for valid math expression', async () => {
      const boxes = await MathExpressionBoxSource.generateBoxes('2 + 2^10 + log(10, 10000)');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Math Expression');
      expect(boxes[0].props.stdout).toBe('1026.25');
    });

    it('should set correct priority and component', async () => {
      const boxes = await MathExpressionBoxSource.generateBoxes('2 + 2');
      expect(boxes[0].props.priority).toBe(10); // PriorityMathExpression value
      expect(boxes[0].props.name).toBe('Math Expression');
      expect(boxes[0].props.stdout).toBe('4');
      expect(boxes[0].component).toBe(DefaultBox);
    });
  });
});
