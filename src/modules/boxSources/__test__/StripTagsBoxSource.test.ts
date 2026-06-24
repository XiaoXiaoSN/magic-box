import { describe, expect, it } from 'vitest';

import { StripTagsBoxSource } from '../StripTagsBoxSource';

describe('StripTagsBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes(
        '<p>Hello</p>',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with option', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes('', {
        striptags: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input with option', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes('   ', {
        striptags: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('strips basic block tags and returns plain text', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes(
        '<p>Hello <b>world</b></p>',
        { striptags: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hello world');
    });

    it('strips anchor tags, keeping inner text', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes(
        '<a href="x">link</a>',
        { striptags: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('link');
    });

    it('decodes &amp; entity', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes(
        '<p>Tom &amp; Jerry</p>',
        { striptags: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Tom & Jerry');
    });

    it('decodes &lt; and &gt; entities in text nodes (no real tags)', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes('&lt;tag&gt;', {
        striptags: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('<tag>');
    });

    it('handles self-closing tags', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes('<br/>done', {
        striptags: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('done');
    });

    it('triggers on ::striphtml option key as well', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes('<p>Hello</p>', {
        striphtml: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hello');
    });

    it('sets correct box name and priority', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes('<p>Hello</p>', {
        striptags: true,
      });
      expect(boxes[0].props.name).toBe('Strip HTML Tags');
      expect(boxes[0].props.priority).toBe(10);
    });

    it('decodes decimal and hex numeric character references', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes(
        '<p>&#65;&#x42; &#33; C</p>',
        { striptags: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('AB ! C');
    });

    it('leaves out-of-range numeric references verbatim (no throw)', async () => {
      const boxes = await StripTagsBoxSource.generateBoxes('&#x110000;', {
        striptags: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('&#x110000;');
    });
  });
});
