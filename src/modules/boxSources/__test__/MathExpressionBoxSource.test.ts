import { expect } from 'vitest';

import { MathExpressionBoxSource } from '../MathExpressionBoxSource';

describe('MathExpressionBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for empty input', async () => {
      expect(await MathExpressionBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for non-math expressions', async () => {
      expect(
        await MathExpressionBoxSource.checkMatch('hello world'),
      ).toBeUndefined();
      expect(await MathExpressionBoxSource.checkMatch('abc')).toBeUndefined();
    });

    it('should ignore dates, grouped identifiers, strings, and invalid results', async () => {
      for (const input of [
        '2024-01-01',
        '2024/01/01',
        '0912-345-678',
        '"2024-01-15"',
        'e-1',
        '1/0',
        '0/0',
        'f(x) = x^2',
        '3 in',
      ]) {
        expect(await MathExpressionBoxSource.checkMatch(input)).toBeUndefined();
      }
    });

    it('should let explicit math options override the input gate', async () => {
      expect(
        await MathExpressionBoxSource.checkMatch('2024-01-01', { math: true }),
      ).toEqual({ answer: '2022' });
      expect(
        await MathExpressionBoxSource.checkMatch('ignored', { math: '2 + 2' }),
      ).toEqual({ answer: '4' });
    });

    it('should return a bounded error box for explicit invalid input', async () => {
      const boxes = await MathExpressionBoxSource.generateBoxes('not math', {
        math: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'Invalid mathematical expression.',
      );
    });

    it('should return correct result for basic arithmetic', async () => {
      const result = await MathExpressionBoxSource.checkMatch('1000 + 2000');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('3000');
    });

    it('should handle complex expressions', async () => {
      let result = await MathExpressionBoxSource.checkMatch('2 * (3 + 4)');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('14');

      result = await MathExpressionBoxSource.checkMatch('sin(PI/2)');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('1');
    });

    it('should handle decimal numbers', async () => {
      const result = await MathExpressionBoxSource.checkMatch('1.5 * 2.5');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('3.75');
    });

    it('should expose unary boolean results in automatic mode', async () => {
      expect(await MathExpressionBoxSource.checkMatch('!false')).toEqual({
        answer: 'true',
      });
      expect(await MathExpressionBoxSource.checkMatch('true')).toBeUndefined();
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid math expression', async () => {
      const boxes = await MathExpressionBoxSource.generateBoxes('invalid math');
      expect(boxes).toHaveLength(0);
    });

    it('should generate correct box for valid math expression', async () => {
      const boxes = await MathExpressionBoxSource.generateBoxes(
        '2 + 2^10 + log(10, 10000)',
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Math Expression');
      expect(boxes[0].props.plaintextOutput).toBe('1026.25');
    });

    it('should set correct priority and component', async () => {
      const boxes = await MathExpressionBoxSource.generateBoxes('2 + 2');
      expect(boxes[0].props.priority).toBe(10); // PriorityMathExpression value
      expect(boxes[0].props.name).toBe('Math Expression');
      expect(boxes[0].props.plaintextOutput).toBe('4');
      expect(boxes[0].view).toBe('default');
    });
  });
});
