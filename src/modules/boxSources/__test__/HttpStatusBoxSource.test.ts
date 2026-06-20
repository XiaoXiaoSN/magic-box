import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { HttpStatusBoxSource } from '../HttpStatusBoxSource';

describe('HttpStatusBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('404', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options object is empty', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('404', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('404', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('input validation', () => {
    it('returns [] for non-numeric input', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('abc', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for a 2-digit number', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('99', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for a 4-digit number', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('1000', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for a 6xx code (out of range)', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('600', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('::httpstatus trigger', () => {
    it('resolves 404 to Not Found / Client Error', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('404', {
        httpstatus: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('HTTP Status');
      expect(boxes[0].props.options).toMatchObject({
        Code: '404',
        Name: 'Not Found',
        Category: 'Client Error',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('resolves 200 to OK / Success', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('200', {
        httpstatus: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Name: 'OK',
        Category: 'Success',
      });
    });

    it('resolves 301 to Moved Permanently / Redirection', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('301', {
        httpstatus: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Name: 'Moved Permanently',
        Category: 'Redirection',
      });
    });

    it('resolves 500 to Internal Server Error / Server Error', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('500', {
        httpstatus: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Name: 'Internal Server Error',
        Category: 'Server Error',
      });
    });

    it("resolves 418 to I'm a Teapot", async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('418', {
        httpstatus: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Name: "I'm a Teapot",
        Category: 'Client Error',
      });
    });

    it('resolves unknown-but-valid 999 to Unknown name with correct category', async () => {
      // 999 starts with 9, which is outside 1-5 range so regex rejects it
      // use 599 instead — valid 5xx but not in the table
      const boxes = await HttpStatusBoxSource.generateBoxes('599', {
        httpstatus: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Code: '599',
        Name: 'Unknown',
        Category: 'Server Error',
      });
    });
  });

  describe('::http trigger (alias)', () => {
    it('also works with ::http option key', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('200', {
        http: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Code: '200',
        Name: 'OK',
        Category: 'Success',
      });
    });
  });

  describe('priority', () => {
    it('sets priority from source constant', async () => {
      const boxes = await HttpStatusBoxSource.generateBoxes('200', {
        httpstatus: true,
      });
      expect(boxes[0].props.priority).toBe(HttpStatusBoxSource.priority);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HttpStatusBoxSource.name).toBe('HTTP Status');
      expect(HttpStatusBoxSource.tag).toBe('#');
      expect(HttpStatusBoxSource.kind).toBe('Reference');
      expect(typeof HttpStatusBoxSource.priority).toBe('number');
    });
  });
});
