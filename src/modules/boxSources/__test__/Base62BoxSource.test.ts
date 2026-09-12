import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Base62BoxSource } from '../Base62BoxSource';

describe('Base62BoxSource', () => {
  describe('no option keys → empty array', () => {
    it('returns [] when no base62 option is provided', async () => {
      const boxes = await Base62BoxSource.generateBoxes('123456789', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] with unrelated options', async () => {
      const boxes = await Base62BoxSource.generateBoxes('123456789', {
        foo: 'bar',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode', () => {
    it('encodes 0 to "0"', async () => {
      const boxes = await Base62BoxSource.generateBoxes('0', { base62: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Decimal: '0',
        Base62: '0',
      });
    });

    it('encodes 61 to "z" (last single-char value)', async () => {
      const boxes = await Base62BoxSource.generateBoxes('61', { base62: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Decimal: '61',
        Base62: 'z',
      });
    });

    it('encodes 62 to "10"', async () => {
      const boxes = await Base62BoxSource.generateBoxes('62', { base62: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Decimal: '62',
        Base62: '10',
      });
    });

    it('encodes 123456789 and round-trips back', async () => {
      const encBoxes = await Base62BoxSource.generateBoxes('123456789', {
        base62: true,
      });
      expect(encBoxes).toHaveLength(1);
      const encoded = encBoxes[0].props.options?.Base62 as string;
      expect(encoded).toBeTruthy();

      const decBoxes = await Base62BoxSource.generateBoxes(encoded, {
        base62decode: true,
      });
      expect(decBoxes).toHaveLength(1);
      expect(decBoxes[0].props.options).toMatchObject({ Decimal: '123456789' });
    });

    it('uses KeyValueBoxTemplate for valid encode', async () => {
      const boxes = await Base62BoxSource.generateBoxes('62', { base62: true });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('returns error box for non-digit encode input', async () => {
      const boxes = await Base62BoxSource.generateBoxes('abc', {
        base62: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/non-negative integer/i);
    });

    it('accepts ::base62encode option alias', async () => {
      const boxes = await Base62BoxSource.generateBoxes('62', {
        base62encode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Base62: '10' });
    });
  });

  describe('decode', () => {
    it('decodes "10" to 62', async () => {
      const boxes = await Base62BoxSource.generateBoxes('10', {
        base62decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Base62: '10',
        Decimal: '62',
      });
    });

    it('decodes "z" to 61', async () => {
      const boxes = await Base62BoxSource.generateBoxes('z', {
        base62decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Base62: 'z',
        Decimal: '61',
      });
    });

    it('uses KeyValueBoxTemplate for valid decode', async () => {
      const boxes = await Base62BoxSource.generateBoxes('10', {
        base62decode: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('returns error box for invalid base62 chars', async () => {
      const boxes = await Base62BoxSource.generateBoxes('!!', {
        base62decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });
  });

  describe('BigInt round-trip for value > Number.MAX_SAFE_INTEGER', () => {
    // 9007199254740993 = 2^53 + 1, which Number.parseInt would lose precision on
    it('encodes and decodes 9007199254740993 exactly', async () => {
      const input = '9007199254740993';
      const encBoxes = await Base62BoxSource.generateBoxes(input, {
        base62: true,
      });
      expect(encBoxes).toHaveLength(1);
      const encoded = encBoxes[0].props.options?.Base62 as string;

      const decBoxes = await Base62BoxSource.generateBoxes(encoded, {
        base62decode: true,
      });
      expect(decBoxes).toHaveLength(1);
      expect(decBoxes[0].props.options?.Decimal).toBe(input);
    });
  });

  describe('both options → two boxes', () => {
    it('produces encode box then decode box when both options set', async () => {
      const boxes = await Base62BoxSource.generateBoxes('62', {
        base62: true,
        base62decode: true,
      });
      expect(boxes).toHaveLength(2);
      // first box is encode result
      expect(boxes[0].props.options).toMatchObject({
        Decimal: '62',
        Base62: '10',
      });
      // second box is decode result: '62' as base62 = 6*62 + 2 = 374
      expect(boxes[1].props.options).toMatchObject({
        Base62: '62',
        Decimal: '374',
      });
    });
  });

  describe('priority', () => {
    it('sets priority to 10', async () => {
      const boxes = await Base62BoxSource.generateBoxes('1', { base62: true });
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
