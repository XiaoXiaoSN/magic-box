import { describe, expect, it } from 'vitest';

import { DotEnvBoxSource } from '../DotEnvBoxSource';

describe('DotEnvBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no matching option is provided', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes('API_KEY=abc', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when unrelated option is provided', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes('API_KEY=abc', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should convert env to JSON with ::dotenv option', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes(
        'API_KEY=abc123\nDEBUG=true',
        { dotenv: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Dotenv → JSON');
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ API_KEY: 'abc123', DEBUG: 'true' });
    });

    it('should skip comment lines and strip surrounding quotes', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes(
        '# comment\nNAME="John Doe"',
        { dotenv: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ NAME: 'John Doe' });
    });

    it('should convert JSON to env with ::dotenv option when input starts with {', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes(
        '{"PORT":"3000","MSG":"hello world"}',
        { dotenv: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → Dotenv');
      const output = boxes[0].props.plaintextOutput;
      expect(output).toContain('PORT=3000');
      // value with space must be double-quoted
      expect(output).toContain('MSG="hello world"');
    });

    it('should split on the first = only, preserving = in the value', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes(
        'URL=http://a.com?x=1',
        { dotenv: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed.URL).toBe('http://a.com?x=1');
    });

    it('should return an error box for invalid JSON-looking input', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes('{bad}', {
        dotenv: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('Error');
    });

    it('should also trigger on ::envjson option', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes('KEY=val', {
        envjson: true,
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ KEY: 'val' });
    });

    it('should quote values containing #', async () => {
      const boxes = await DotEnvBoxSource.generateBoxes('{"COLOR":"#ff0000"}', {
        dotenv: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('COLOR="#ff0000"');
    });
  });
});
