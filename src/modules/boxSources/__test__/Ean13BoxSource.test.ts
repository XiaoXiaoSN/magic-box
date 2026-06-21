import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Ean13BoxSource } from '../Ean13BoxSource';

describe('Ean13BoxSource', () => {
  describe('metadata', () => {
    it('has expected name, tag, kind, and numeric priority', () => {
      expect(Ean13BoxSource.name).toBe('EAN-13 / UPC-A');
      expect(Ean13BoxSource.tag).toBe('#');
      expect(Ean13BoxSource.kind).toBe('Validate');
      expect(typeof Ean13BoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes — option guard', () => {
    it('returns [] when no option keys are present', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('4006381333931', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are present', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('4006381333931', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('triggers on ::ean13', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('4006381333931', {
        ean13: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('triggers on ::ean', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('4006381333931', {
        ean: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('triggers on ::upc', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('036000291452', {
        upc: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes — valid EAN-13 barcodes', () => {
    it('validates 4006381333931 as EAN-13 with check digit 1', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('4006381333931', {
        ean13: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Type).toBe('EAN-13');
      expect(options?.Valid).toBe('true');
      expect(options?.['Check Digit']).toBe('1');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('validates 5901234123457 as EAN-13 with check digit 7', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('5901234123457', {
        ean13: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Type).toBe('EAN-13');
      expect(options?.Valid).toBe('true');
      expect(options?.['Check Digit']).toBe('7');
    });
  });

  describe('generateBoxes — valid UPC-A barcode', () => {
    it('validates 036000291452 as UPC-A with check digit 2', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('036000291452', {
        upc: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Type).toBe('UPC-A');
      expect(options?.Valid).toBe('true');
      expect(options?.['Check Digit']).toBe('2');
    });
  });

  describe('generateBoxes — invalid check digit', () => {
    it('flags 4006381333930 (wrong check digit) as invalid', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('4006381333930', {
        ean13: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Valid).toBe('false');
      expect(options?.['Check Digit']).toBe('1');
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns a box mentioning length for a 5-digit input', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('12345', {
        ean13: true,
      });
      expect(boxes).toHaveLength(1);
      const plaintext = boxes[0].props.plaintextOutput;
      expect(plaintext).toMatch(/length/i);
    });

    it('returns a box mentioning digits for non-digit input', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('abc', { ean13: true });
      expect(boxes).toHaveLength(1);
      const plaintext = boxes[0].props.plaintextOutput;
      expect(plaintext).toMatch(/digit/i);
    });

    it('strips spaces and hyphens before validation', async () => {
      // 036000291452 with spaces and hyphens — still valid UPC-A
      const boxes = await Ean13BoxSource.generateBoxes('0360 00-291452', {
        upc: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Valid).toBe('true');
      expect(options?.Input).toBe('036000291452');
    });
  });

  describe('generateBoxes — plaintextOutput format', () => {
    it('renders key: value lines (not JSON)', async () => {
      const boxes = await Ean13BoxSource.generateBoxes('4006381333931', {
        ean13: true,
      });
      const plaintext = boxes[0].props.plaintextOutput;
      expect(plaintext).toContain('Input: 4006381333931');
      expect(plaintext).toContain('Type: EAN-13');
      expect(plaintext).toContain('Valid: true');
      expect(plaintext).toContain('Check Digit: 1');
      expect(plaintext).not.toContain('{');
    });
  });
});
