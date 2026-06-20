import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { TemperatureBoxSource } from '@modules/boxSources/TemperatureBoxSource';
import { describe, expect, it } from 'vitest';

describe('TemperatureBoxSource', () => {
  describe('generateBoxes — no option', () => {
    it('returns [] when no temp option is provided', async () => {
      expect(
        await TemperatureBoxSource.generateBoxes('100C', null),
      ).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      expect(await TemperatureBoxSource.generateBoxes('100C', {})).toHaveLength(
        0,
      );
    });
  });

  describe('generateBoxes — Celsius input', () => {
    it('converts 100C correctly', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('100C', {
        temp: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Celsius).toBe('100');
      expect(options?.Fahrenheit).toBe('212');
      expect(options?.Kelvin).toBe('373.15');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('100C', {
        temp: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box name is Temperature', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('100C', {
        temp: true,
      });
      expect(boxes[0].props.name).toBe('Temperature');
    });
  });

  describe('generateBoxes — Fahrenheit input', () => {
    it('converts 32F correctly', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('32F', {
        temp: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Celsius).toBe('0');
      expect(options?.Fahrenheit).toBe('32');
      expect(options?.Kelvin).toBe('273.15');
    });

    it('converts 98.6F with Celsius rounding to whole number', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('98.6F', {
        temp: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Celsius).toBe('37');
    });
  });

  describe('generateBoxes — Kelvin input', () => {
    it('converts 0K correctly', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('0K', {
        temp: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Celsius).toBe('-273.15');
      expect(options?.Fahrenheit).toBe('-459.67');
      expect(options?.Kelvin).toBe('0');
    });
  });

  describe('generateBoxes — unit from option value', () => {
    it('treats bare number as Fahrenheit when ::temp=f', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('100', {
        temp: 'f',
      });
      expect(boxes).toHaveLength(1);
      // 100°F → ~37.78°C
      expect(boxes[0].props.options?.Celsius).toBe('37.78');
    });

    it('treats bare number as Celsius by default when option value is boolean true', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('0', {
        temp: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Celsius).toBe('0');
      expect(boxes[0].props.options?.Fahrenheit).toBe('32');
    });
  });

  describe('generateBoxes — ::temperature alias', () => {
    it('triggers on ::temperature option', async () => {
      const boxes = await TemperatureBoxSource.generateBoxes('100C', {
        temperature: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Celsius).toBe('100');
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns [] for non-numeric input', async () => {
      expect(
        await TemperatureBoxSource.generateBoxes('hello', { temp: true }),
      ).toHaveLength(0);
    });

    it('returns [] for empty string', async () => {
      expect(
        await TemperatureBoxSource.generateBoxes('', { temp: true }),
      ).toHaveLength(0);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(TemperatureBoxSource.name).toBe('Temperature');
      expect(TemperatureBoxSource.tag).toBe('#');
      expect(TemperatureBoxSource.kind).toBe('Convert');
      expect(typeof TemperatureBoxSource.priority).toBe('number');
    });
  });
});
