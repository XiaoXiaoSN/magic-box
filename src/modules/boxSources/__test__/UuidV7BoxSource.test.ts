import { describe, expect, it } from 'vitest';

import { UuidV7BoxSource } from '../UuidV7BoxSource';

const validUuidV7Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('UuidV7BoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no trigger option is present', async () => {
      const boxes = await UuidV7BoxSource.generateBoxes('uuidv7');
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated options', async () => {
      const boxes = await UuidV7BoxSource.generateBoxes('', { uuid: true });
      expect(boxes).toHaveLength(0);
    });

    it('generates one box with a valid v7 UUID on ::uuidv7', async () => {
      const boxes = await UuidV7BoxSource.generateBoxes('', { uuidv7: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('UUID v7');
      expect(boxes[0].props.plaintextOutput).toMatch(validUuidV7Regex);
    });

    it('generates one box with a valid v7 UUID on ::uuid7 alias', async () => {
      const boxes = await UuidV7BoxSource.generateBoxes('', { uuid7: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(validUuidV7Regex);
    });

    it('two consecutive generations both match the v7 format', async () => {
      const [boxes1, boxes2] = await Promise.all([
        UuidV7BoxSource.generateBoxes('', { uuidv7: true }),
        UuidV7BoxSource.generateBoxes('', { uuidv7: true }),
      ]);
      expect(boxes1[0].props.plaintextOutput).toMatch(validUuidV7Regex);
      expect(boxes2[0].props.plaintextOutput).toMatch(validUuidV7Regex);
    });

    it('two consecutive generations produce different values', async () => {
      const boxes1 = await UuidV7BoxSource.generateBoxes('', { uuidv7: true });
      const boxes2 = await UuidV7BoxSource.generateBoxes('', { uuidv7: true });
      // astronomically unlikely to collide; guards against a frozen clock + zero-random bug
      expect(boxes1[0].props.plaintextOutput).not.toBe(
        boxes2[0].props.plaintextOutput,
      );
    });

    it('input text is ignored — only the option triggers generation', async () => {
      const boxes = await UuidV7BoxSource.generateBoxes('anything here', {
        uuidv7: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(validUuidV7Regex);
    });
  });
});
