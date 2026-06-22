import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { ObjectIdBoxSource } from '../ObjectIdBoxSource';

const VALID_ID = '507f1f77bcf86cd799439011';

describe('ObjectIdBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(VALID_ID, null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(VALID_ID, {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — valid ObjectId (::objectid)', () => {
    it('parses 507f1f77bcf86cd799439011 correctly', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(VALID_ID, {
        objectid: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.['Timestamp (hex)']).toBe('507f1f77');
      // 0x507f1f77 === 1350508407
      expect(options?.['Timestamp (unix)']).toBe('1350508407');
      expect(options?.['Timestamp (UTC)']).toBe('2012-10-17T21:13:27.000Z');
      expect(options?.['Random / Machine']).toBe('bcf86cd799');
      // parseInt('439011', 16) === 4427793
      expect(options?.Counter).toBe('4427793');
      expect(options?.ObjectId).toBe('507f1f77bcf86cd799439011');

      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.priority).toBe(10);
    });

    it('accepts ::oid option alias', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(VALID_ID, {
        oid: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Timestamp (unix)']).toBe('1350508407');
    });
  });

  describe('generateBoxes — uppercase normalization', () => {
    it('normalizes uppercase hex to lowercase and parses identically', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(
        '507F1F77BCF86CD799439011',
        { objectid: true },
      );
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.ObjectId).toBe('507f1f77bcf86cd799439011');
      expect(options?.['Timestamp (unix)']).toBe('1350508407');
      expect(options?.['Timestamp (UTC)']).toBe('2012-10-17T21:13:27.000Z');
      expect(options?.Counter).toBe('4427793');
    });
  });

  describe('generateBoxes — ObjectId("...") wrapper', () => {
    it('strips the wrapper and parses correctly', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(
        'ObjectId("507f1f77bcf86cd799439011")',
        { objectid: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.ObjectId).toBe('507f1f77bcf86cd799439011');
      expect(boxes[0].props.options?.['Timestamp (unix)']).toBe('1350508407');
    });

    it("strips ObjectId('...') single-quote variant", async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(
        "ObjectId('507f1f77bcf86cd799439011')",
        { objectid: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.ObjectId).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns an error box for a too-short hex string', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes('123', {
        objectid: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Reason).toBe(
        'a 24-character hex ObjectId is required',
      );
    });

    it('returns an error box for non-hex characters', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(
        'xyzxyzxyzxyzxyzxyzxyzxyz',
        { objectid: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Reason).toBe(
        'a 24-character hex ObjectId is required',
      );
    });

    it('returns an error box for empty string', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes('', {
        objectid: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.ObjectId).toBe('(invalid)');
    });
  });

  describe('generateBoxes — all-zero ObjectId', () => {
    it('parses 000000000000000000000000 as epoch', async () => {
      const boxes = await ObjectIdBoxSource.generateBoxes(
        '000000000000000000000000',
        { objectid: true },
      );
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.['Timestamp (unix)']).toBe('0');
      expect(options?.['Timestamp (UTC)']).toBe('1970-01-01T00:00:00.000Z');
      expect(options?.Counter).toBe('0');
    });
  });
});
