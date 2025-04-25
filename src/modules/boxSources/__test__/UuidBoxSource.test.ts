import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { expect } from '@jest/globals';

import { UuidBoxSource } from '../UuidBoxSource';

describe('UuidBoxSource', () => {
  const validUUIDv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  describe('checkMatch', () => {
    it('should match "uuid" command', () => {
      let match = UuidBoxSource.checkMatch('uuid');
      expect(match).toBeDefined();

      match = UuidBoxSource.checkMatch('uuid  ');
      expect(match).toBeDefined();

      match = UuidBoxSource.checkMatch('  uuid ');
      expect(match).toBeDefined();
    });

    it('should match case-insensitive', () => {
      const match = UuidBoxSource.checkMatch('UUID');
      expect(match).toBeDefined();
    });

    it('should not match invalid formats', () => {
      expect(UuidBoxSource.checkMatch('uuidv4')).toBeUndefined();
      expect(UuidBoxSource.checkMatch('guid')).toBeUndefined();
      expect(UuidBoxSource.checkMatch('')).toBeUndefined();
      expect(UuidBoxSource.checkMatch('random-uuid')).toBeUndefined();
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for non-matching input', async () => {
      const boxes = await UuidBoxSource.generateBoxes('not a uuid command');
      expect(boxes).toHaveLength(0);
    });

    it('should generate valid UUID box for matching input', async () => {
      const boxes = await UuidBoxSource.generateBoxes('uuid');
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.name).toBe('UUID');
      expect(box.props.plaintextOutput).toMatch(validUUIDv4Regex);
      expect(box.props.plaintextOutput.length).toBe(36);
      expect(box.component).toBe(DefaultBoxTemplate);
    });

    it('should generate different UUIDs for each call', async () => {
      const boxes1 = await UuidBoxSource.generateBoxes('uuid');
      const boxes2 = await UuidBoxSource.generateBoxes('uuid');

      expect(boxes1[0].props.plaintextOutput).not.toBe(boxes2[0].props.plaintextOutput);
    });

    describe('case sensitivity', () => {
      it('should generate lowercase UUID for lowercase input', async () => {
        const boxes = await UuidBoxSource.generateBoxes('uuid');
        expect(boxes[0].props.plaintextOutput).toMatch(/^[0-9a-f-]+$/);
      });

      it('should generate uppercase UUID for uppercase input', async () => {
        const boxes = await UuidBoxSource.generateBoxes('UUID', { uppercase: true });
        expect(boxes[0].props.plaintextOutput).toMatch(/^[0-9A-F-]+$/);
      });
    });
  });
});
