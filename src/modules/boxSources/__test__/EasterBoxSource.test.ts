import { describe, expect, it } from 'vitest';

import { EasterBoxSource } from '../EasterBoxSource';

describe('EasterBoxSource', () => {
  describe('generateBoxes — gate', () => {
    it('returns [] when ::easter option is absent', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object has no easter key', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', { hash: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — easter dates', () => {
    it('2025 → Easter Sunday 2025-04-20', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', {
        easter: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Easter Sunday': '2025-04-20',
      });
    });

    it('2024 → Easter Sunday 2024-03-31', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2024', {
        easter: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Easter Sunday': '2024-03-31',
      });
    });

    it('2000 → Easter Sunday 2000-04-23', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2000', {
        easter: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Easter Sunday': '2000-04-23',
      });
    });

    it('1818 → Easter Sunday 1818-03-22 (earliest possible date)', async () => {
      const boxes = await EasterBoxSource.generateBoxes('1818', {
        easter: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Easter Sunday': '1818-03-22',
      });
    });
  });

  describe('generateBoxes — option value takes precedence', () => {
    it('::easter=2025 uses the option value, not input', async () => {
      const boxes = await EasterBoxSource.generateBoxes('ignored', {
        easter: '2025',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Easter Sunday': '2025-04-20',
      });
    });

    it('non-numeric option value falls back to input', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2024', {
        easter: 'notanumber',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'Easter Sunday': '2024-03-31',
      });
    });
  });

  describe('generateBoxes — related dates for 2025', () => {
    it('Good Friday 2025 → 2025-04-18 (Easter - 2 days)', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', {
        easter: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        'Good Friday': '2025-04-18',
      });
    });

    it('Ash Wednesday 2025 → 2025-03-05 (Easter - 46 days)', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', {
        easter: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        'Ash Wednesday': '2025-03-05',
      });
    });

    it('Month is "April" for 2025', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', {
        easter: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Month: 'April' });
    });

    it('Month is "March" for 2024', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2024', {
        easter: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Month: 'March' });
    });

    it('Lunar New Year 2025 → 2025-01-29', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', {
        cny: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        'Lunar New Year': '2025-01-29',
      });
    });
  });

  describe('generateBoxes — box metadata', () => {
    it('box name is "Easter"', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', {
        easter: true,
      });
      expect(boxes[0].props.name).toBe('Easter');
    });

    it('priority matches EasterBoxSource.priority', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', {
        easter: true,
      });
      expect(boxes[0].props.priority).toBe(EasterBoxSource.priority);
    });

    it('plaintext output contains key: value pairs', async () => {
      const boxes = await EasterBoxSource.generateBoxes('2025', {
        easter: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Easter Sunday: 2025-04-20');
      expect(text).toContain('Good Friday: 2025-04-18');
    });
  });

  describe('generateBoxes — out-of-range and invalid input', () => {
    it('year 1500 (below 1583) → single box with error mentioning year range', async () => {
      const boxes = await EasterBoxSource.generateBoxes('1500', {
        easter: true,
      });
      expect(boxes).toHaveLength(1);
      const text =
        boxes[0].props.plaintextOutput + JSON.stringify(boxes[0].props.options);
      expect(text).toMatch(/1583/);
      expect(text).toMatch(/9999/);
    });

    it('non-numeric input "abc" → single box with error', async () => {
      const boxes = await EasterBoxSource.generateBoxes('abc', {
        easter: true,
      });
      expect(boxes).toHaveLength(1);
      // must produce an error box, not an empty array
      expect(boxes[0].props.name).toBe('Easter');
    });

    it('empty input → single box with error', async () => {
      const boxes = await EasterBoxSource.generateBoxes('', { easter: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Easter');
    });
  });
});
