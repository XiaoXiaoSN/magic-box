import { expect } from 'vitest';

import { PercentChangeBoxSource } from '../PercentChangeBoxSource';

describe('PercentChangeBoxSource', () => {
  const opts = (key: string) => ({ [key]: true });

  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '120 to 150',
        null,
      );
      expect(boxes).toEqual([]);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes('120 to 150', {
        qrcode: true,
      });
      expect(boxes).toEqual([]);
    });
  });

  describe('::pctchange trigger', () => {
    it('120 to 150 → Change 30, Percent Change 25, Direction increase', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '120 to 150',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.From).toBe('120');
      expect(kv.To).toBe('150');
      expect(kv.Change).toBe('30');
      expect(kv['Percent Change']).toBe('25');
      expect(kv.Direction).toBe('increase');
    });

    it('150 to 120 → Change -30, Percent Change -20, Direction decrease', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '150 to 120',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Change).toBe('-30');
      expect(kv['Percent Change']).toBe('-20');
      expect(kv.Direction).toBe('decrease');
    });

    it('100 to 100 → Percent Change 0, Direction no change', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '100 to 100',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Percent Change']).toBe('0');
      expect(kv.Direction).toBe('no change');
    });

    it('50 to 75 → Percent Change 50', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '50 to 75',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Percent Change']).toBe('50');
    });

    it('200 to 50 → Percent Change -75', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '200 to 50',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Percent Change']).toBe('-75');
    });
  });

  describe('::percentchange alias', () => {
    it('accepts ::percentchange option key', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '120 to 150',
        opts('percentchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Percent Change']).toBe('25');
    });
  });

  describe('separator variants', () => {
    it('comma separator "120,150" → same as "120 to 150"', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '120,150',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Change).toBe('30');
      expect(kv['Percent Change']).toBe('25');
    });

    it('space separator "120 150" → same as "120 to 150"', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '120 150',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Change).toBe('30');
      expect(kv['Percent Change']).toBe('25');
    });
  });

  describe('division by zero', () => {
    it('0 to 5 → Percent Change contains "undefined"', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '0 to 5',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Percent Change']).toContain('undefined');
    });

    it('0 to 5 → no Ratio or Of keys', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '0 to 5',
        opts('pctchange'),
      );
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Ratio).toBeUndefined();
      expect(kv.Of).toBeUndefined();
    });
  });

  describe('invalid input', () => {
    it('"hello" → returns a usage hint box', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        'hello',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Usage).toBeTruthy();
    });

    it('single number → returns a usage hint box', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '42',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Usage).toBeTruthy();
    });

    it('three numbers → returns a usage hint box', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '1 2 3',
        opts('pctchange'),
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Usage).toBeTruthy();
    });
  });

  describe('output shape', () => {
    it('box name is "Percent Change"', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '120 to 150',
        opts('pctchange'),
      );
      expect(boxes[0].props.name).toBe('Percent Change');
    });

    it('box has Ratio and Of keys when from !== 0', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '120 to 150',
        opts('pctchange'),
      );
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Ratio).toBeDefined();
      expect(kv.Of).toBeDefined();
    });

    it('plaintextOutput contains key:value lines', async () => {
      const boxes = await PercentChangeBoxSource.generateBoxes(
        '120 to 150',
        opts('pctchange'),
      );
      expect(boxes[0].props.plaintextOutput).toContain('Percent Change: 25');
      expect(boxes[0].props.plaintextOutput).toContain('Change: 30');
    });
  });
});
