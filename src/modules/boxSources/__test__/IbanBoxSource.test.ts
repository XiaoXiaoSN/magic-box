import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { expect } from 'vitest';

import { IbanBoxSource } from '../IbanBoxSource';

describe('IbanBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no ::iban option is present', async () => {
      const boxes = await IbanBoxSource.generateBoxes(
        'GB82 WEST 1234 5698 7654 32',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when a different option is present', async () => {
      const boxes = await IbanBoxSource.generateBoxes(
        'GB82 WEST 1234 5698 7654 32',
        { qr: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — structural validation', () => {
    it('returns [] for malformed input "12XX"', async () => {
      const boxes = await IbanBoxSource.generateBoxes('12XX', { iban: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for plaintext "hello"', async () => {
      const boxes = await IbanBoxSource.generateBoxes('hello', { iban: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — valid IBANs', () => {
    it('validates GB82 (UK) — mod-97 passes, Valid true', async () => {
      const boxes = await IbanBoxSource.generateBoxes(
        'GB82 WEST 1234 5698 7654 32',
        { iban: true },
      );
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.IBAN).toBe('GB82WEST12345698765432');
      expect(options?.Country).toBe('GB');
      expect(options?.['Check Digits']).toBe('82');
      expect(options?.Valid).toBe('true');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('validates DE89 (Germany) — mod-97 passes, Valid true', async () => {
      const boxes = await IbanBoxSource.generateBoxes(
        'DE89 3704 0044 0532 0130 00',
        { iban: true },
      );
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.IBAN).toBe('DE89370400440532013000');
      expect(options?.Country).toBe('DE');
      expect(options?.['Check Digits']).toBe('89');
      expect(options?.Valid).toBe('true');
    });

    it('validates FR14 (France, alphanumeric BBAN) — mod-97 passes, Valid true', async () => {
      const boxes = await IbanBoxSource.generateBoxes(
        'FR14 2004 1010 0505 0001 3M02 606',
        { iban: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Valid).toBe('true');
      expect(boxes[0].props.options?.Country).toBe('FR');
    });
  });

  describe('generateBoxes — invalid checksum', () => {
    it('returns Valid "false" for GB82 WEST 1234 5698 7654 33 (wrong check digit)', async () => {
      const boxes = await IbanBoxSource.generateBoxes(
        'GB82 WEST 1234 5698 7654 33',
        { iban: true },
      );
      // structurally valid but mod-97 fails → box is returned with Valid false
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Valid).toBe('false');
    });
  });
});
