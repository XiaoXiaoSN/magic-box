import { describe, expect, it } from 'vitest';

import { PropertiesBoxSource } from '../PropertiesBoxSource';

describe('PropertiesBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no matching option is provided', async () => {
      const boxes = await PropertiesBoxSource.generateBoxes(
        'server.host=localhost',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when unrelated options are provided', async () => {
      const boxes = await PropertiesBoxSource.generateBoxes(
        'server.host=localhost',
        { json: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('should convert properties to JSON with flat dotted keys', async () => {
      const boxes = await PropertiesBoxSource.generateBoxes(
        'server.host=localhost\nserver.port=8080',
        { properties: true },
      );

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Properties → JSON');

      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      // flat keys — dotted keys must NOT be nested
      expect(parsed['server.host']).toBe('localhost');
      expect(parsed['server.port']).toBe('8080');
      expect(parsed).not.toHaveProperty('server');
    });

    it('should skip comment lines (# and !) and handle colon separators', async () => {
      const input = '# comment\nname: app\n! bang comment\nkey=val';
      const boxes = await PropertiesBoxSource.generateBoxes(input, {
        properties: true,
      });

      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ name: 'app', key: 'val' });
    });

    it('should convert JSON object to .properties format', async () => {
      const boxes = await PropertiesBoxSource.generateBoxes(
        '{"a":"1","b":"2"}',
        { properties: true },
      );

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → Properties');
      expect(boxes[0].props.plaintextOutput).toContain('a=1');
      expect(boxes[0].props.plaintextOutput).toContain('b=2');
    });

    it('should skip __proto__ key to prevent prototype pollution', async () => {
      const boxes = await PropertiesBoxSource.generateBoxes('__proto__=evil', {
        properties: true,
      });

      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);

      // the forbidden key must not appear in the parsed output
      expect(Object.hasOwn(parsed, '__proto__')).toBe(false);
      // prototype must not have been polluted
      // biome-ignore lint/suspicious/noExplicitAny: verifying prototype pollution guard
      expect(({} as any).polluted).toBeUndefined();
      // the evil value must not have reached Object.prototype
      expect(Object.prototype).not.toHaveProperty('polluted');
    });

    it('should not crash on array-like input and return a properties→JSON box', async () => {
      // '[1,2]' does not start with '{', so treated as properties→JSON
      const boxes = await PropertiesBoxSource.generateBoxes('[1,2]', {
        properties: true,
      });
      expect(boxes).toHaveLength(1);
      // no crash; output is valid JSON (even if empty object)
      expect(() => JSON.parse(boxes[0].props.plaintextOutput)).not.toThrow();
    });

    it('should return an error box for JSON-looking input that is invalid JSON', async () => {
      const boxes = await PropertiesBoxSource.generateBoxes('{bad', {
        properties: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → Properties');
      expect(boxes[0].props.plaintextOutput).toMatch(/parse error/i);
    });

    it('should round-trip flat keys: properties → JSON → properties', async () => {
      const original = 'app.name=magic\napp.version=1.0';

      const toJsonBoxes = await PropertiesBoxSource.generateBoxes(original, {
        properties: true,
      });
      expect(toJsonBoxes).toHaveLength(1);

      const jsonStr = toJsonBoxes[0].props.plaintextOutput;
      const toPropsBoxes = await PropertiesBoxSource.generateBoxes(jsonStr, {
        properties: true,
      });
      expect(toPropsBoxes).toHaveLength(1);

      const output = toPropsBoxes[0].props.plaintextOutput;
      expect(output).toContain('app.name=magic');
      expect(output).toContain('app.version=1.0');
    });

    it('should trigger on ::propertiesjson option as well', async () => {
      const boxes = await PropertiesBoxSource.generateBoxes('key=value', {
        propertiesjson: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });
});
