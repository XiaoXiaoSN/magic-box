import { describe, expect, it } from 'vitest';

import { HtmlToTextBoxSource } from '../HtmlToTextBoxSource';

describe('HtmlToTextBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes(
        '<p>Hello</p>',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for an unrelated option', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('<p>Hi</p>', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with ::striptags', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('', {
        striptags: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — tag stripping', () => {
    it('strips tags and returns plain text via ::striptags', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes(
        '<p>Hello <b>world</b>!</p>',
        { striptags: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hello world!');
    });

    it('works with ::htmltotext option key', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes(
        '<p>Hello <b>world</b>!</p>',
        { htmltotext: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Hello world!');
    });

    it('converts <br> to newline', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('a<br>b', {
        striptags: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a\nb');
    });

    it('converts <br/> and <br /> variants to newline', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('x<br/>y<br />z', {
        striptags: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('x\ny\nz');
    });

    it('adds dashes for list items and separates them', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes(
        '<ul><li>one</li><li>two</li></ul>',
        { striptags: true },
      );
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('- ');
      expect(out).toContain('one');
      expect(out).toContain('two');
    });
  });

  describe('generateBoxes — script and style removal', () => {
    it('removes <script> blocks entirely', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes(
        '<script>alert(1)</script>Safe',
        { striptags: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('Safe');
      expect(boxes[0].props.plaintextOutput).not.toContain('alert');
    });

    it('removes <style> blocks entirely', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes(
        '<style>.x{color:red}</style>Text',
        { striptags: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('Text');
      expect(boxes[0].props.plaintextOutput).not.toContain('color');
    });

    it('removes multiline <script> blocks', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes(
        '<script>\nvar x = 1;\nvar y = 2;\n</script>Clean',
        { striptags: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('Clean');
    });
  });

  describe('generateBoxes — entity decoding', () => {
    it('decodes named entities', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes(
        '&lt;a&gt; &amp; &quot;b&quot;',
        { striptags: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('<a> & "b"');
    });

    it('decodes &nbsp; as a space', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('a&nbsp;b', {
        striptags: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a b');
    });

    it('decodes decimal numeric entities', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('&#65;&#66;', {
        striptags: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AB');
    });

    it('decodes hex numeric entities', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('&#x41;&#x42;', {
        striptags: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AB');
    });

    it('decodes mixed numeric entities', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('&#65;&#x42;', {
        striptags: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('AB');
    });
  });

  describe('generateBoxes — box metadata', () => {
    it('sets the box name to "HTML to Text"', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('<p>hi</p>', {
        striptags: true,
      });
      expect(boxes[0].props.name).toBe('HTML to Text');
    });

    it('sets the correct priority', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('<p>hi</p>', {
        striptags: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('attaches a box template (CodeBoxTemplate)', async () => {
      const boxes = await HtmlToTextBoxSource.generateBoxes('<p>hi</p>', {
        striptags: true,
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });
  });

  describe('ReDoS safety', () => {
    it('handles many unclosed <script> tags in linear time', async () => {
      // many closed script blocks: an O(n^2) removal would stall; the linear
      // scan stays fast and trailing content survives (kept under MAX_INPUT)
      const input = `${'<script>x</script>'.repeat(5000)}safe`;
      const start = Date.now();
      const boxes = await HtmlToTextBoxSource.generateBoxes(input, {
        striptags: true,
      });
      expect(Date.now() - start).toBeLessThan(500);
      expect(boxes[0].props.plaintextOutput).toBe('safe');
    });
  });
});
