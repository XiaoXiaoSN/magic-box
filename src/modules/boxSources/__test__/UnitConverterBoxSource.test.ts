import { describe, expect, it } from 'vitest';

import { PowerConvertBoxSource } from '../PowerConvertBoxSource';
import { SpeedConvertBoxSource } from '../SpeedConvertBoxSource';
import {
  POWER_UNIT_DEFINITIONS,
  parseStrictNumber,
  SPEED_UNIT_DEFINITIONS,
} from '../UnitConversionData';
import { UnitConverterBoxSource } from '../UnitConverterBoxSource';

describe('parseStrictNumber', () => {
  it('rejects nonzero literals that underflow to zero', () => {
    expect(parseStrictNumber('1e-324')).toBeNull();
    expect(parseStrictNumber('-1e-324')).toBeNull();
  });

  it('accepts zero literals and the smallest finite subnormal', () => {
    expect(parseStrictNumber('0e-999')).toBe(0);
    expect(parseStrictNumber('-0.000e-999')).toBe(-0);
    expect(parseStrictNumber('5e-324')).toBe(5e-324);
  });
});

describe('UnitConverterBoxSource', () => {
  it('uses a single-glyph tag that fits the box-tag chip', () => {
    expect(UnitConverterBoxSource.tag).toBe('⇄');
  });

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

    it.each([
      'constructor',
      'toString',
      '__proto__',
    ])('returns empty array for inherited property name %s', async (unit) => {
      const boxes = await UnitConverterBoxSource.generateBoxes(
        `5 ${unit}`,
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

  describe('case-sensitive SI symbols', () => {
    it.each([
      ['500 mW', 'Watts', '0.5 W'],
      ['500 MW', 'Watts', '500,000,000 W'],
      ['5 mPa', 'Pascals', '0.005 Pa'],
      ['5 MPa', 'Bars', '50 bar'],
      ['100 Mb', 'Bits', '100,000,000 b'],
      ['100 MB', 'Bytes', '104,857,600 B'],
      ['1013 mb', 'Bars', '1.013 bar'],
    ])('preserves the case in %s', async (input, key, expected) => {
      const boxes = await UnitConverterBoxSource.generateBoxes(input, null);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ [key]: expected });
    });

    it('does not interpret uppercase T as metric tons', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes('5 T', null);
      expect(boxes).toHaveLength(0);
    });

    it('rejects an ambiguous lower-case power symbol', async () => {
      const boxes = await UnitConverterBoxSource.generateBoxes('5 mw', null);
      expect(boxes).toHaveLength(0);
    });
  });

  it('uses the exact knots ratio shared with SpeedConvert', async () => {
    const boxes = await UnitConverterBoxSource.generateBoxes('100 kn', null);
    expect(boxes[0].props.options).toMatchObject({
      'Kilometers per hour': '185.2 km/h',
    });
  });

  it('keeps every shared power and speed unit available in both entrypoints', async () => {
    for (const definition of POWER_UNIT_DEFINITIONS) {
      for (const raw of [definition.symbol, ...definition.aliases]) {
        const unitBoxes = await UnitConverterBoxSource.generateBoxes(
          `1 ${raw}`,
          { unit: true },
        );
        const dedicatedBoxes = await PowerConvertBoxSource.generateBoxes(
          `1 ${raw}`,
          { power: true },
        );
        expect(unitBoxes, `unit converter: ${raw}`).toHaveLength(1);
        expect(dedicatedBoxes, `power converter: ${raw}`).toHaveLength(1);
      }
    }

    for (const definition of SPEED_UNIT_DEFINITIONS) {
      for (const raw of [definition.symbol, ...definition.aliases]) {
        const unitBoxes = await UnitConverterBoxSource.generateBoxes(
          `1 ${raw}`,
          { unit: true },
        );
        const dedicatedBoxes = await SpeedConvertBoxSource.generateBoxes(
          `1 ${raw}`,
          { speed: true },
        );
        expect(unitBoxes, `unit converter: ${raw}`).toHaveLength(1);
        expect(dedicatedBoxes, `speed converter: ${raw}`).toHaveLength(1);
      }
    }
  });

  it('supports singular duration, mass, and speed aliases', async () => {
    for (const input of ['1 hour', '1 minute', '1 day', '5 pounds', '5 kmh']) {
      const boxes = await UnitConverterBoxSource.generateBoxes(input, null);
      expect(boxes, input).toHaveLength(1);
    }
  });

  it('requires a separator for single-letter units during auto-detection', async () => {
    for (const input of ['4k', '1f', '3d']) {
      const boxes = await UnitConverterBoxSource.generateBoxes(input, null);
      expect(boxes, input).toHaveLength(0);
    }
  });

  it('keeps single-letter unit parsing available behind an explicit directive', async () => {
    const boxes = await UnitConverterBoxSource.generateBoxes('4k', {
      unit: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({ Input: '4 K' });
  });

  it('rejects ambiguous numeric punctuation while accepting grouped integers', async () => {
    expect(
      await UnitConverterBoxSource.generateBoxes('1,5 km', null),
    ).toHaveLength(0);
    expect(
      await UnitConverterBoxSource.generateBoxes('1.234.567 km', null),
    ).toHaveLength(0);
    expect(
      await UnitConverterBoxSource.generateBoxes('1,000 km', null),
    ).toHaveLength(1);
  });

  it('preserves exact safe integers for binary byte units', async () => {
    const boxes = await UnitConverterBoxSource.generateBoxes('1 GB', null);
    expect(boxes[0].props.options).toMatchObject({
      Bytes: '1,073,741,824 B',
    });
  });

  it('rejects temperatures below absolute zero', async () => {
    const boxes = await UnitConverterBoxSource.generateBoxes('-500 C', null);
    expect(boxes).toHaveLength(0);
  });

  it('checks Kelvin source bounds before converting to Celsius', async () => {
    for (const input of ['-1e-324 K', '-1e-20 K', '-1e-13 K']) {
      const boxes = await UnitConverterBoxSource.generateBoxes(input, null);
      expect(boxes, input).toHaveLength(0);
    }

    for (const input of ['0 K', '+0 K']) {
      const boxes = await UnitConverterBoxSource.generateBoxes(input, null);
      expect(boxes, input).toHaveLength(1);
    }
  });

  it('reports an incompatible target and does not duplicate a requested target', async () => {
    const incompatible = await UnitConverterBoxSource.generateBoxes(
      '100 km to kg',
      null,
    );
    expect(incompatible[0].props.options).toMatchObject({
      Error: 'Target unit "kg" is incompatible with length',
    });

    const requested = await UnitConverterBoxSource.generateBoxes(
      '100 km to mi',
      null,
    );
    const options = requested[0].props.options as Record<string, string>;
    expect(options['Target (Miles)']).toBe('62.137119 mi');
    expect(options.Miles).toBeUndefined();
  });

  it('uses the millimeter-of-mercury conversion constant', async () => {
    const boxes = await UnitConverterBoxSource.generateBoxes('760 mmhg', null);
    expect(boxes[0].props.options).toMatchObject({
      Pascals: '101,325.014435 Pa',
    });
  });

  it('rejects oversized input before running the unit expression regex', async () => {
    const boxes = await UnitConverterBoxSource.generateBoxes(
      `1 ${'in'.repeat(40)}!`,
      null,
    );
    expect(boxes).toHaveLength(0);
  });

  it('requires whitespace around word separators while keeping compact operators', async () => {
    expect(
      await UnitConverterBoxSource.generateBoxes('100 km to mi', null),
    ).toHaveLength(1);
    expect(
      await UnitConverterBoxSource.generateBoxes('100 kmto mi', null),
    ).toHaveLength(0);
    expect(
      await UnitConverterBoxSource.generateBoxes('100 km->mi', null),
    ).toHaveLength(1);
    expect(
      await UnitConverterBoxSource.generateBoxes('100 km=mi', null),
    ).toHaveLength(1);
  });
});
