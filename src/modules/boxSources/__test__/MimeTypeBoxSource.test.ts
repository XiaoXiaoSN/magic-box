import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { MimeTypeBoxSource } from '../MimeTypeBoxSource';

describe('MimeTypeBoxSource', () => {
  describe('no trigger option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('png', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated option is provided', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('png', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('forward lookup (extension -> mime)', () => {
    it('resolves bare extension png to image/png with correct category', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('png', {
        mimetype: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'MIME Type': 'image/png',
        Category: 'image',
        Extension: 'png',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('resolves extension with leading dot (.json)', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('.json', {
        mimetype: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'MIME Type': 'application/json',
        Extension: 'json',
      });
    });

    it('extracts extension from a compound filename (archive.tar.gz)', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('archive.tar.gz', {
        mimetype: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'MIME Type': 'application/gzip',
        Extension: 'gz',
      });
    });

    it('is case-insensitive for extension input (PNG uppercase)', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('PNG', {
        mimetype: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'MIME Type': 'image/png',
      });
    });

    it('returns unknown box for unrecognised extension xyzzy', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('xyzzy', {
        mimetype: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Extension: 'xyzzy',
        'MIME Type': 'unknown',
        Category: 'unknown',
      });
    });
  });

  describe('reverse lookup (mime -> extensions)', () => {
    it('returns extensions for a known mime type (image/png)', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('image/png', {
        mimetype: true,
      });
      expect(boxes).toHaveLength(1);
      const exts: string = boxes[0].props.options?.Extensions as string;
      expect(exts).toContain('png');
    });

    it('lists multiple extensions for text/html', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('text/html', {
        mimetype: true,
      });
      const exts: string = boxes[0].props.options?.Extensions as string;
      expect(exts).toContain('html');
      expect(exts).toContain('htm');
    });

    it('returns "none known" for an unrecognised mime type', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes(
        'application/x-unknown-format',
        { mimetype: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Extensions).toBe('none known');
    });
  });

  describe('::mime alias', () => {
    it('triggers on ::mime option key', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('png', {
        mime: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        'MIME Type': 'image/png',
      });
    });
  });

  describe('box metadata', () => {
    it('sets priority to 10', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('png', {
        mimetype: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('sets box name to "MIME Type"', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('png', {
        mimetype: true,
      });
      expect(boxes[0].props.name).toBe('MIME Type');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await MimeTypeBoxSource.generateBoxes('png', {
        mimetype: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });
});
