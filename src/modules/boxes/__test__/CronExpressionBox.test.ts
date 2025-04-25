import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { expect } from '@jest/globals';

import { CronExpressionBoxSource } from '../CronExpressionBox';

describe('CronExpressionBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(CronExpressionBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for invalid cron expression', () => {
      expect(CronExpressionBoxSource.checkMatch('123')).toBeUndefined();
      expect(CronExpressionBoxSource.checkMatch('invalid cron')).toBeUndefined();
    });

    it('should return a match for valid cron expression', () => {
      const result = CronExpressionBoxSource.checkMatch('* * * * *');
      expect(result).toBeDefined();
      expect(result?.answer).toBe('Every minute');
    });

    it('should handle language options', () => {
      let result = CronExpressionBoxSource.checkMatch('* * * * *', { lang: 'zh' });
      expect(result).toBeDefined();
      expect(result?.answer).toBe('每分鐘');

      result = CronExpressionBoxSource.checkMatch('* * * * * *', { lang: 'ru' });
      expect(result).toBeDefined();
      expect(result?.answer).toBe('Каждую секунду');
    });
  });

  describe('generateBoxes', () => {
    it('should return an empty array for invalid cron expression', async () => {
      const boxes = await CronExpressionBoxSource.generateBoxes('invalid cron');
      expect(boxes).toHaveLength(0);
    });

    it('should return a box for valid cron expression', async () => {
      const boxes = await CronExpressionBoxSource.generateBoxes('* * * * *');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Cron Expression');
      expect(boxes[0].props.plaintextOutput).toBe('Every minute');
      expect(boxes[0].component).toBe(DefaultBoxTemplate);
    });
  });
});
