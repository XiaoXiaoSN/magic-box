import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { UnicodeNormalizeBoxSource } from '../UnicodeNormalizeBoxSource';

describe('UnicodeNormalizeBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no trigger option is present', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('café', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options exist but no normalize key', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('café', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await UnicodeNormalizeBoxSource.generateBoxes('', {
        normalize: 'nfc',
      });
      expect(boxes).toHaveLength(0);
    });

    describe('NFD decomposition', () => {
      // 'café' with precomposed é (U+00E9) has length 4.
      // NFD decomposes é → e + U+0301 (combining acute accent), giving length 5.
      it('decomposes precomposed é under NFD', async () => {
        const input = 'café'; // café, length 4 (NFC form)
        const boxes = await UnicodeNormalizeBoxSource.generateBoxes(input, {
          normalize: 'nfd',
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options;
        expect(opts?.Form).toBe('NFD');
        expect(opts?.['Input Length']).toBe('4');
        expect(opts?.['Output Length']).toBe('5');
        expect(opts?.Changed).toBe('true');
        expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      });
    });

    describe('NFC recomposition', () => {
      // 'café' with decomposed é (e + U+0301) has length 5.
      // NFC recomposes back to é (U+00E9), giving length 4.
      it('recomposes decomposed é under NFC', async () => {
        const input = 'café'; // e + combining acute, length 5 (NFD form)
        const boxes = await UnicodeNormalizeBoxSource.generateBoxes(input, {
          normalize: 'nfc',
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options;
        expect(opts?.Form).toBe('NFC');
        expect(opts?.Normalized).toBe('café');
        expect(opts?.['Input Length']).toBe('5');
        expect(opts?.['Output Length']).toBe('4');
        expect(opts?.Changed).toBe('true');
      });
    });

    describe('already-normalized input', () => {
      it('ASCII hello under NFC is unchanged', async () => {
        const boxes = await UnicodeNormalizeBoxSource.generateBoxes('hello', {
          normalize: 'nfc',
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options;
        expect(opts?.Changed).toBe('false');
        expect(opts?.['Input Length']).toBe(opts?.['Output Length']);
      });
    });

    describe('NFKC compatibility normalization', () => {
      // fullwidth Latin capital A (U+FF21) normalizes to ASCII A (U+0041) under NFKC
      it('converts fullwidth A to ASCII A', async () => {
        const boxes = await UnicodeNormalizeBoxSource.generateBoxes('Ａ', {
          normalize: 'nfkc',
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options;
        expect(opts?.Form).toBe('NFKC');
        expect(opts?.Normalized).toBe('A');
        expect(opts?.Changed).toBe('true');
      });
    });

    describe('default form fallback', () => {
      it('uses NFC when option value is a bare flag (true)', async () => {
        const boxes = await UnicodeNormalizeBoxSource.generateBoxes('x', {
          normalize: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Form).toBe('NFC');
      });

      it('uses NFC for unrecognized form string', async () => {
        const boxes = await UnicodeNormalizeBoxSource.generateBoxes('x', {
          normalize: 'xyz',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Form).toBe('NFC');
      });
    });

    describe('unicodenormalize alias', () => {
      it('triggers on ::unicodenormalize option key', async () => {
        const boxes = await UnicodeNormalizeBoxSource.generateBoxes('hello', {
          unicodenormalize: 'nfd',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Form).toBe('NFD');
      });
    });
  });
});
