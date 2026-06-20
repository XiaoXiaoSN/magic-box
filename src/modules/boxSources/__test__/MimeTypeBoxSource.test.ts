import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';
import { MimeTypeBoxSource } from '../MimeTypeBoxSource';

describe('MimeTypeBoxSource', () => {
  it('returns [] when no mime option is present', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('png', null);
    expect(boxes).toEqual([]);
  });

  it('returns [] when unrelated option is present', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('png', { foo: true });
    expect(boxes).toEqual([]);
  });

  it('looks up MIME type for extension "png"', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('png', { mime: true });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({
      Extension: 'png',
      'MIME Type': 'image/png',
    });
    expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
  });

  it('strips leading dot from extension ".json"', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('.json', {
      mime: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({
      Extension: 'json',
      'MIME Type': 'application/json',
    });
  });

  it('resolves "jpg" to image/jpeg', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('jpg', { mime: true });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({
      Extension: 'jpg',
      'MIME Type': 'image/jpeg',
    });
  });

  it('accepts ::mimetype option key', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('png', {
      mimetype: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({ 'MIME Type': 'image/png' });
  });

  it('resolves MIME type "application/json" to extensions containing "json"', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('application/json', {
      mime: true,
    });
    expect(boxes).toHaveLength(1);
    const extensions = (boxes[0].props.options as Record<string, string>)
      .Extensions;
    expect(extensions).toContain('json');
  });

  it('resolves "image/jpeg" to extensions containing both "jpg" and "jpeg"', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('image/jpeg', {
      mime: true,
    });
    expect(boxes).toHaveLength(1);
    const extensions = (boxes[0].props.options as Record<string, string>)
      .Extensions;
    expect(extensions).toContain('jpg');
    expect(extensions).toContain('jpeg');
  });

  it('returns a no-match box for unknown extension "xyz"', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('xyz', { mime: true });
    expect(boxes).toHaveLength(1);
    const mimeValue = (boxes[0].props.options as Record<string, string>)[
      'MIME Type'
    ];
    expect(mimeValue).toMatch(/unknown/i);
  });

  it('returns a no-match box for unknown MIME type "application/x-unknown"', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes(
      'application/x-unknown',
      { mime: true },
    );
    expect(boxes).toHaveLength(1);
    const extsValue = (boxes[0].props.options as Record<string, string>)
      .Extensions;
    expect(extsValue).toMatch(/no match|not found|unknown/i);
  });

  it('sets priority correctly', async () => {
    const boxes = await MimeTypeBoxSource.generateBoxes('png', { mime: true });
    expect(boxes[0].props.priority).toBe(MimeTypeBoxSource.priority);
  });
});
