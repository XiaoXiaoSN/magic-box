import { describe, expect, it } from 'vitest';

import { UnitConverterBoxSource } from '../UnitConverterBoxSource';

describe('UnitConverterBoxSource', () => {
  describe('auto-detection without options', () => {
    it('converts "100 km" (length)', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes('100 km', null);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unit Converter (LENGTH)');
      expect(boxes[0].props.options).toMatchObject({
        Input: '100 km',
        Meters: '100,000 m',
        Miles: '62.137119 mi',
      });
    });

    it('converts "100 km to mi" with target unit highlighted', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes(
        '100 km to mi',
        null,
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Input: '100 km',
        'Target (Miles)': '62.137119 mi',
      });
    });

    it('converts "37 C" (temperature)', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes('37 C', null);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unit Converter (TEMPERATURE)');
      expect(boxes[0].props.options).toMatchObject({
        Input: '37 °C',
        Fahrenheit: '98.6 °F',
        Kelvin: '310.15 K',
      });
    });

    it('converts "500 MB in GB" (datasize)', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes(
        '500 MB in GB',
        null,
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Input: '500 MB',
        'Target (Gigabytes)': '0.488281 GB',
      });
    });

    it('converts "100 psi" (pressure)', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes('100 psi', null);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unit Converter (PRESSURE)');
      expect(boxes[0].props.options).toMatchObject({
        Input: '100 psi',
        Bars: '6.894757 bar',
      });
    });

    it('converts "100 kWh to J" (energy)', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes(
        '100 kWh to J',
        null,
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unit Converter (ENERGY)');
      expect(boxes[0].props.options).toMatchObject({
        Input: '100 kWh',
        'Target (Joules)': '360,000,000 J',
      });
    });

    it('converts "10 hp" (power)', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes('10 hp', null);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unit Converter (POWER)');
      expect(boxes[0].props.options).toMatchObject({
        Input: '10 hp',
        Watts: '7,456.99872 W',
      });
    });

    it('converts "100 Mbps" (datarate)', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes(
        '100 Mbps',
        null,
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unit Converter (DATARATE)');
      expect(boxes[0].props.options).toMatchObject({
        Input: '100 Mbps',
        'Bits per second': '100,000,000 bps',
      });
    });

    it('returns empty array for invalid unit or input', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes(
        'hello world',
        null,
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('option trigger ::unit', () => {
    it('supports ::unit option', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes('100 km', {
        unit: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unit Converter (LENGTH)');
    });
  });
});
