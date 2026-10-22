import { HtmlEntityBoxSource } from '@modules/boxSources/HtmlEntityBoxSource';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('HtmlEntityBoxSource', () => {
  afterEach(() => {
    vi.doUnmock('entities/decode');
  });

  it('only auto-matches entity-shaped candidates and keeps markup as text', async () => {
    expect(HtmlEntityBoxSource.canHandle('plain text', null)).toBe(false);
    expect(HtmlEntityBoxSource.canHandle('<b>text</b>', null)).toBe(false);
    expect(HtmlEntityBoxSource.canHandle('<b>&amp;</b>', null)).toBe(true);

    const [box] = await HtmlEntityBoxSource.generateBoxes('<b>&amp;</b>', null);
    expect(box.props.plaintextOutput).toBe('<b>&</b>');
  });

  it('decodes a valid entity once and leaves unknown names unchanged', async () => {
    const [box] = await HtmlEntityBoxSource.generateBoxes(
      '&amp;lt; &NotEqualTilde; &notanentity;',
      {
        htmldecode: true,
      },
    );
    expect(box.props.plaintextOutput).toBe('&lt; ≂̸ &notanentity;');
  });

  it('preserves unknown semicolon entities during explicit legacy decoding', async () => {
    await expect(
      HtmlEntityBoxSource.generateBoxes('&notanentity;', null),
    ).resolves.toEqual([]);
    const [box] = await HtmlEntityBoxSource.generateBoxes('&notanentity;', {
      htmldecode: true,
    });
    expect(box.props.plaintextOutput).toBe('&notanentity;');
  });

  it('supports legacy semicolonless references only when explicitly requested', async () => {
    expect(await HtmlEntityBoxSource.generateBoxes('&amp', null)).toEqual([]);
    const [box] = await HtmlEntityBoxSource.generateBoxes('&amp', {
      htmldecode: true,
    });
    expect(box.props.plaintextOutput).toBe('&');
  });

  it('uses HTML numeric-reference replacement rules', async () => {
    const [box] = await HtmlEntityBoxSource.generateBoxes(
      '&#0; &#xD800; &#x110000; &#128; &#x1F600;',
      { htmldecode: true },
    );
    expect(box.props.plaintextOutput).toBe('� � � € 😀');
  });

  it('encodes the five HTML syntax characters in one pass', async () => {
    const [box] = await HtmlEntityBoxSource.generateBoxes(`&<>"' &lt;`, {
      htmlencode: true,
    });
    expect(box.props.plaintextOutput).toBe('&amp;&lt;&gt;&quot;&#39; &amp;lt;');
  });

  it('encodes non-ASCII code points as hexadecimal references in all mode', async () => {
    const [box] = await HtmlEntityBoxSource.generateBoxes('A中文😀', {
      htmlencode: 'all',
    });
    expect(box.props.plaintextOutput).toBe('A&#x4E2D;&#x6587;&#x1F600;');
  });

  it('keeps encode and decode results separate and validates encode modes', async () => {
    const boxes = await HtmlEntityBoxSource.generateBoxes('&amp;', {
      htmldecode: true,
      htmlencode: true,
    });
    expect(boxes.map((box) => box.props.plaintextOutput)).toEqual([
      '&',
      '&amp;amp;',
    ]);

    const [invalid] = await HtmlEntityBoxSource.generateBoxes('text', {
      htmlencode: 'named',
    });
    expect(invalid.props.plaintextOutput).toContain('Unknown htmlencode mode');

    const [oversized] = await HtmlEntityBoxSource.generateBoxes('text', {
      htmlencode: 'x'.repeat(33),
    });
    expect(oversized.props.plaintextOutput).toContain(
      'Unknown htmlencode mode',
    );
    expect(oversized.props.plaintextOutput).not.toContain('x'.repeat(33));
  });

  it('does not load the entity table for encoding and returns a bounded error', async () => {
    let imported = 0;
    vi.doMock('entities/decode', async () => {
      imported += 1;
      return vi.importActual('entities/decode');
    });
    await HtmlEntityBoxSource.generateBoxes('plain text', { htmlencode: true });
    expect(imported).toBe(0);

    const [box] = await HtmlEntityBoxSource.generateBoxes(
      'x'.repeat(100 * 1024 + 1),
      {
        htmldecode: true,
      },
    );
    expect(box.props.plaintextOutput).toContain('up to 100 KiB');
    expect(imported).toBe(0);
  });
});
