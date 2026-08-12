import { describe, expect, it } from 'vitest';
import { ScientificNotationBoxSource } from '../ScientificNotationBoxSource';

describe('ScientificNotationBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no matching option key', async () => {
      const boxes = await ScientificNotationBoxSource.generateBoxes(
        '0.00012345',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is present', async () => {
      const boxes = await ScientificNotationBoxSource.generateBoxes(
        '0.00012345',
        { base64: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('triggers on ::scinote option', async () => {
      const boxes = await ScientificNotationBoxSource.generateBoxes(
        '0.00012345',
        { scinote: true },
      );
      expect(boxes).toHaveLength(1);
    });

    it('triggers on ::scientific option', async () => {
      const boxes = await ScientificNotationBoxSource.generateBoxes(
        '0.00012345',
        { scientific: true },
      );
      expect(boxes).toHaveLength(1);
    });

    it('returns error box for invalid input', async () => {
      const boxes = await ScientificNotationBoxSource.generateBoxes('abc', {
        scinote: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/valid number/i);
    });

    it('returns error box for empty input', async () => {
      const boxes = await ScientificNotationBoxSource.generateBoxes('', {
        scinote: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/valid number/i);
    });

    describe('0.00012345', () => {
      it('produces Scientific = 1.2345e-4', async () => {
        const boxes = await ScientificNotationBoxSource.generateBoxes(
          '0.00012345',
          { scinote: true },
        );
        expect(boxes[0].props.options?.Scientific).toBe('1.2345e-4');
      });

      it('produces Engineering = 123.45e-6', async () => {
        const boxes = await ScientificNotationBoxSource.generateBoxes(
          '0.00012345',
          { scinote: true },
        );
        expect(boxes[0].props.options?.Engineering).toBe('123.45e-6');
      });

      it('produces Decimal = 0.00012345', async () => {
        const boxes = await ScientificNotationBoxSource.generateBoxes(
          '0.00012345',
          { scinote: true },
        );
        expect(boxes[0].props.options?.Decimal).toBe('0.00012345');
      });
    });

    describe('123456', () => {
      it('produces Scientific = 1.23456e+5', async () => {
        const boxes = await ScientificNotationBoxSource.generateBoxes(
          '123456',
          { scinote: true },
        );
        expect(boxes[0].props.options?.Scientific).toBe('1.23456e+5');
      });
    });

    describe('1.5e3', () => {
      it('produces Decimal = 1500', async () => {
        const boxes = await ScientificNotationBoxSource.generateBoxes('1.5e3', {
          scinote: true,
        });
        expect(boxes[0].props.options?.Decimal).toBe('1500');
      });

      it('produces Scientific = 1.5e+3', async () => {
        const boxes = await ScientificNotationBoxSource.generateBoxes('1.5e3', {
          scinote: true,
        });
        expect(boxes[0].props.options?.Scientific).toBe('1.5e+3');
      });
    });

    describe('1000000', () => {
      it('produces Engineering with exponent that is a multiple of 3', async () => {
        const boxes = await ScientificNotationBoxSource.generateBoxes(
          '1000000',
          { scinote: true },
        );
        const eng = boxes[0].props.options?.Engineering as string;
        expect(eng).toBeDefined();
        // extract exponent value and verify it's a multiple of 3
        const match = eng.match(/e([+-]\d+)$/);
        expect(match).not.toBeNull();
        const expVal = Number.parseInt(match?.[1] ?? '', 10);
        expect(expVal % 3).toBe(0);
      });

      it('produces Engineering = 1e+6', async () => {
        const boxes = await ScientificNotationBoxSource.generateBoxes(
          '1000000',
          { scinote: true },
        );
        expect(boxes[0].props.options?.Engineering).toBe('1e+6');
      });
    });

    it('E-notation is uppercase version of Scientific', async () => {
      const boxes = await ScientificNotationBoxSource.generateBoxes(
        '0.00012345',
        { scinote: true },
      );
      const scientific = boxes[0].props.options?.Scientific as string;
      const eNotation = boxes[0].props.options?.['E-notation'] as string;
      expect(eNotation).toBe(scientific.toUpperCase());
    });

    it('sets priority matching source priority', async () => {
      const boxes = await ScientificNotationBoxSource.generateBoxes('42', {
        scinote: true,
      });
      expect(boxes[0].props.priority).toBe(
        ScientificNotationBoxSource.priority,
      );
    });
  });
});
