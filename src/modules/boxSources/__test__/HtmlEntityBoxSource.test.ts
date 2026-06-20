import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { HtmlEntityBoxSource } from '../HtmlEntityBoxSource';

describe('HtmlEntityBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('<b>hi</b>', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('<b>hi</b>', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - ::htmlencode', () => {
    it('produces exactly one encode box', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes(
        '<a href="x">A & B</a>',
        { htmlencode: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('HTML Encode');
      expect(boxes[0].props.plaintextOutput).toBe(
        '&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;',
      );
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('encodes & before < to avoid double-encoding', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('&<>', {
        htmlencode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('&amp;&lt;&gt;');
    });

    it('encodes single quotes', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes("it's", {
        htmlencode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('it&#39;s');
    });
  });

  describe('generateBoxes - ::htmldecode', () => {
    it('produces exactly one decode box', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes(
        '&lt;b&gt;hi&amp;bye&lt;/b&gt;',
        { htmldecode: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('HTML Decode');
      expect(boxes[0].props.plaintextOutput).toBe('<b>hi&bye</b>');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('decodes &amp; last so &amp;lt; becomes &lt; not <', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('&amp;lt;', {
        htmldecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('&lt;');
    });

    it('decodes double-quotes', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes(
        'say &quot;hi&quot;',
        {
          htmldecode: true,
        },
      );
      expect(boxes[0].props.plaintextOutput).toBe('say "hi"');
    });
  });

  describe('generateBoxes - ::htmlentity / ::htmlentities', () => {
    it('produces two boxes for ::htmlentity', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('<x>', {
        htmlentity: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('HTML Encode');
      expect(boxes[1].props.name).toBe('HTML Decode');
    });

    it('produces two boxes for ::htmlentities', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('<x>', {
        htmlentities: true,
      });
      expect(boxes).toHaveLength(2);
    });
  });

  describe('generateBoxes - numeric entity decode', () => {
    it('decodes decimal numeric entities', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('&#65;&#66;', {
        htmldecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AB');
    });

    it('decodes hex numeric entities', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('&#x41;&#x42;', {
        htmldecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AB');
    });

    it('decodes mixed decimal and hex', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('&#65;&#x42;', {
        htmldecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AB');
    });
  });

  describe('generateBoxes - empty input', () => {
    it('returns encode box with empty string on empty input when triggered', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('', {
        htmlencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('');
    });

    it('returns decode box with empty string on empty input when triggered', async () => {
      const boxes = await HtmlEntityBoxSource.generateBoxes('', {
        htmldecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HtmlEntityBoxSource.name).toBe('HTML Entity');
      expect(HtmlEntityBoxSource.tag).toBe('&');
      expect(HtmlEntityBoxSource.kind).toBe('Encode');
      expect(typeof HtmlEntityBoxSource.priority).toBe('number');
    });
  });
});
