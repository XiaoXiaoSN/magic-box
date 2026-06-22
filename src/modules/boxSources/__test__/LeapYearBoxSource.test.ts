import { describe, expect, it } from 'vitest';

import { LeapYearBoxSource } from '../LeapYearBoxSource';

describe('LeapYearBoxSource', () => {
  describe('no option → empty array', () => {
    it('returns [] when options is null', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options has no leapyear/isleap key', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('2024 — divisible by 4, not by 100 → leap', () => {
    it('returns one box', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('Leap Year is true', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Leap Year']).toBe('true');
    });

    it('February Days is 29', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['February Days']).toBe('29');
    });

    it('Days in Year is 366', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Days in Year']).toBe('366');
    });

    it('Reason mentions "divisible by 4" and "not by 100"', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: true,
      });
      const reason = boxes[0].props.options?.Reason as string;
      expect(reason).toMatch(/divisible by 4/i);
      expect(reason).toMatch(/not by 100|not.*100/i);
    });

    it('Next Leap Year is 2028', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Next Leap Year']).toBe('2028');
    });

    it('Previous Leap Year is 2020', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Previous Leap Year']).toBe('2020');
    });
  });

  describe('1900 — divisible by 100 but not 400 → not leap', () => {
    it('Leap Year is false', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('1900', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Leap Year']).toBe('false');
    });

    it('February Days is 28', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('1900', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['February Days']).toBe('28');
    });

    it('Days in Year is 365', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('1900', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Days in Year']).toBe('365');
    });

    it('Reason mentions divisible by 100 but not 400', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('1900', {
        leapyear: true,
      });
      const reason = boxes[0].props.options?.Reason as string;
      expect(reason).toMatch(/100/);
      expect(reason).toMatch(/not.*400|400.*not/i);
    });

    it('Next Leap Year is 1904', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('1900', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Next Leap Year']).toBe('1904');
    });

    it('Previous Leap Year is 1896', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('1900', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Previous Leap Year']).toBe('1896');
    });
  });

  describe('2000 — divisible by 400 → leap', () => {
    it('Leap Year is true', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2000', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Leap Year']).toBe('true');
    });

    it('February Days is 29', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2000', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['February Days']).toBe('29');
    });

    it('Reason mentions divisible by 400', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2000', {
        leapyear: true,
      });
      const reason = boxes[0].props.options?.Reason as string;
      expect(reason).toMatch(/400/);
    });
  });

  describe('2023 — not divisible by 4 → not leap', () => {
    it('Leap Year is false', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2023', {
        leapyear: true,
      });
      expect(boxes[0].props.options?.['Leap Year']).toBe('false');
    });

    it('Reason mentions not divisible by 4', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2023', {
        leapyear: true,
      });
      const reason = boxes[0].props.options?.Reason as string;
      expect(reason).toMatch(/not divisible by 4/i);
    });
  });

  describe('::isleap alias', () => {
    it('accepts isleap option key', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        isleap: true,
      });
      expect(boxes[0].props.options?.['Leap Year']).toBe('true');
    });
  });

  describe('option value as year (::leapyear=2024)', () => {
    it('uses the option value when it is a numeric string', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('', {
        leapyear: '2024',
      });
      expect(boxes[0].props.options?.['Leap Year']).toBe('true');
      expect(boxes[0].props.options?.['February Days']).toBe('29');
    });

    it('uses option value 1900 even when input is different', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: '1900',
      });
      expect(boxes[0].props.options?.['Leap Year']).toBe('false');
    });
  });

  describe('invalid input', () => {
    it('returns a box (not empty) for non-numeric input', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('abc', {
        leapyear: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('returns a box for empty input', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('', {
        leapyear: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('returns a box for input with spaces only', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('   ', {
        leapyear: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('plaintext output', () => {
    it('contains all expected keys in plaintext output', async () => {
      const boxes = await LeapYearBoxSource.generateBoxes('2024', {
        leapyear: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Year:');
      expect(text).toContain('Leap Year:');
      expect(text).toContain('Reason:');
      expect(text).toContain('Days in Year:');
      expect(text).toContain('February Days:');
      expect(text).toContain('Next Leap Year:');
      expect(text).toContain('Previous Leap Year:');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(LeapYearBoxSource.name).toBe('Leap Year');
      expect(LeapYearBoxSource.tag).toBe('#');
      expect(LeapYearBoxSource.kind).toBe('Calculate');
      expect(typeof LeapYearBoxSource.priority).toBe('number');
    });
  });
});
