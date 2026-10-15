import { describe, expect, it, vi } from 'vitest';

import { Base64DecodeBoxSource } from '../Base64BoxSource';

describe('Base64BoxSource', () => {
  it('preserves Unicode, tabs, and newlines when decoding text', async () => {
    const encoded = 'Y2Fmw6kJbGluZQpsaW5l';
    const boxes = await Base64DecodeBoxSource.generateBoxes(encoded, null);

    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('café\tline\nline');
  });

  it('preserves a leading UTF-8 BOM through the decoder round-trip', async () => {
    const boxes = await Base64DecodeBoxSource.generateBoxes('77u/QQ==', null);

    expect(boxes[0].props.plaintextOutput).toBe('\ufeffA');
  });

  it('shows binary Base64 data as a stable hex fallback', async () => {
    const boxes = await Base64DecodeBoxSource.generateBoxes(
      'iVBORw0KGgo=',
      null,
    );

    expect(boxes[0].props.plaintextOutput).toBe(
      '<binary 8 bytes> (hex: 89504e470d0a1a0a)',
    );
    expect(boxes[0].props.plaintextOutput).not.toContain('\ufffd');
  });

  it('reads language aliases from parsed option values', async () => {
    const boxes = await Base64DecodeBoxSource.generateBoxes('SGVsbG8=', {
      lang: 'plaintext',
    });

    expect(boxes[0].props.options).toEqual({ language: 'plaintext' });
  });

  it('decodes MIME, URL-safe, and missing-padding input', async () => {
    const mime = await Base64DecodeBoxSource.generateBoxes('SGVs\r\nbG8', null);
    const urlSafe = await Base64DecodeBoxSource.generateBoxes('PDw_Pz4-', null);
    expect(mime[0].props.plaintextOutput).toBe('Hello');
    expect(urlSafe[0].props.plaintextOutput).toBe('<<??>>');
  });

  it('shares one initialization across concurrent encode and decode calls', async () => {
    vi.resetModules();
    const init = vi.fn(async () => {});
    vi.doMock('base64-box', () => ({
      default: init,
      decode: () => new Uint8Array([72, 101, 108, 108, 111]),
      encode: () => 'aGVsbG8=',
    }));

    try {
      const source = await import('../Base64BoxSource');
      const [decoded, encoded] = await Promise.all([
        source.Base64DecodeBoxSource.generateBoxes('SGVsbG8=', null),
        source.Base64EncodeBoxSource.generateBoxes('Hello'),
      ]);

      expect(decoded[0].props.plaintextOutput).toBe('Hello');
      expect(encoded[0].props.plaintextOutput).toBe('aGVsbG8=');
      expect(init).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock('base64-box');
      vi.resetModules();
    }
  });

  it('allows a later encode to retry after initialization fails', async () => {
    vi.resetModules();
    let attempts = 0;
    const init = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('load failed');
    });
    vi.doMock('base64-box', () => ({
      default: init,
      decode: () => new Uint8Array([72, 105]),
      encode: () => 'SGk=',
    }));

    try {
      const source = await import('../Base64BoxSource');
      await expect(
        source.Base64EncodeBoxSource.generateBoxes('Hi'),
      ).resolves.toEqual([]);

      const boxes = await source.Base64EncodeBoxSource.generateBoxes('Hi');
      expect(boxes[0].props.plaintextOutput).toBe('SGk=');
      expect(init).toHaveBeenCalledTimes(2);
    } finally {
      vi.doUnmock('base64-box');
      vi.resetModules();
    }
  });

  it('rejects oversized input before decoding, formatting, or loading WASM', async () => {
    vi.resetModules();
    const init = vi.fn(async () => {});
    vi.doMock('base64-box', () => ({
      default: init,
      decode: () => new Uint8Array([65]),
      encode: () => 'QQ==',
    }));

    try {
      const source = await import('../Base64BoxSource');
      const oversized = '/'.repeat(100_004);

      await expect(
        source.Base64DecodeBoxSource.generateBoxes(oversized, null),
      ).resolves.toEqual([]);
      await expect(
        source.Base64EncodeBoxSource.generateBoxes(oversized),
      ).resolves.toEqual([]);
      expect(init).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock('base64-box');
      vi.resetModules();
    }
  });
});
