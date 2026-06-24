import { describe, expect, it } from 'vitest';

import { IniBoxSource } from '../IniBoxSource';

describe('IniBoxSource', () => {
  describe('generateBoxes - option gating', () => {
    it('returns empty array when no matching option is provided', async () => {
      const boxes = await IniBoxSource.generateBoxes('[s]\nk=v', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await IniBoxSource.generateBoxes('[s]\nk=v', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('INI → JSON', () => {
    it('parses a basic section with scalar values', async () => {
      const boxes = await IniBoxSource.generateBoxes(
        '[server]\nhost = localhost\nport = 8080',
        { ini: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('INI → JSON');
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ server: { host: 'localhost', port: '8080' } });
    });

    it('handles comments and top-level keys before a section', async () => {
      const input = '; this is a comment\nname=app\n[db]\nuser=admin';
      const boxes = await IniBoxSource.generateBoxes(input, { ini: true });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ name: 'app', db: { user: 'admin' } });
    });

    it('strips one layer of double quotes from values', async () => {
      const boxes = await IniBoxSource.generateBoxes('msg = "hello world"', {
        ini: true,
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed.msg).toBe('hello world');
    });

    it('strips one layer of single quotes from values', async () => {
      const boxes = await IniBoxSource.generateBoxes("path = '/usr/local'", {
        ini: true,
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed.path).toBe('/usr/local');
    });

    it('sets language option to json', async () => {
      const boxes = await IniBoxSource.generateBoxes('[s]\nk=v', { ini: true });
      expect(boxes[0].props.options?.language).toBe('json');
    });
  });

  describe('JSON → INI', () => {
    it('serialises a nested JSON object to INI sections', async () => {
      const input = '{"server":{"host":"localhost","port":"8080"}}';
      const boxes = await IniBoxSource.generateBoxes(input, { ini: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → INI');
      const output = boxes[0].props.plaintextOutput;
      expect(output).toContain('[server]');
      expect(output).toContain('host=localhost');
      expect(output).toContain('port=8080');
    });

    it('places top-level scalars before sections', async () => {
      const input = '{"version":"1.0","db":{"host":"localhost"}}';
      const boxes = await IniBoxSource.generateBoxes(input, { ini: true });
      const output = boxes[0].props.plaintextOutput;
      const versionLine = output.indexOf('version=1.0');
      const sectionLine = output.indexOf('[db]');
      expect(versionLine).toBeGreaterThanOrEqual(0);
      expect(sectionLine).toBeGreaterThan(versionLine);
    });

    it('triggers on ::inijson option as well', async () => {
      const input = '{"k":"v"}';
      const boxes = await IniBoxSource.generateBoxes(input, { inijson: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → INI');
    });

    it('sets language option to ini', async () => {
      const input = '{"k":"v"}';
      const boxes = await IniBoxSource.generateBoxes(input, { ini: true });
      expect(boxes[0].props.options?.language).toBe('ini');
    });

    it('returns an error box for invalid JSON-looking input', async () => {
      const boxes = await IniBoxSource.generateBoxes('{bad json', {
        ini: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/error/i);
    });
  });

  describe('prototype pollution guard', () => {
    it('does not pollute Object.prototype via __proto__ section', async () => {
      const input = '[__proto__]\npolluted=evil';
      await IniBoxSource.generateBoxes(input, { ini: true });
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('does not pollute Object.prototype via top-level __proto__ key', async () => {
      const input = '__proto__=evil';
      await IniBoxSource.generateBoxes(input, { ini: true });
      expect(({} as Record<string, unknown>).__proto__).not.toBe('evil');
    });

    it('does not pollute via constructor key', async () => {
      const input = '[constructor]\nx=1';
      await IniBoxSource.generateBoxes(input, { ini: true });
      // the section should have been silently skipped
      const boxes = await IniBoxSource.generateBoxes(input, { ini: true });
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      // the forbidden section must not appear as an own key (reading
      // parsed.constructor returns the inherited Object constructor)
      expect(Object.hasOwn(parsed, 'constructor')).toBe(false);
    });

    it('produces a valid (empty) JSON object when all keys are forbidden', async () => {
      const input = '__proto__=a\nconstructor=b\nprototype=c';
      const boxes = await IniBoxSource.generateBoxes(input, { ini: true });
      expect(boxes).toHaveLength(1);
      // output should be a valid JSON object, just empty (or with no forbidden keys)
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(typeof parsed).toBe('object');
      // all keys forbidden → no own keys survive (reading parsed.__proto__
      // would return Object.prototype, so assert on own-key presence instead)
      expect(Object.hasOwn(parsed, '__proto__')).toBe(false);
      expect(Object.keys(parsed)).toHaveLength(0);
    });
  });

  describe('round-trip', () => {
    it('INI → JSON → INI preserves section and key/value content', async () => {
      const originalIni = '[app]\nname=magic\nversion=2';
      const toJsonBoxes = await IniBoxSource.generateBoxes(originalIni, {
        ini: true,
      });
      const jsonStr = toJsonBoxes[0].props.plaintextOutput;

      const toIniBoxes = await IniBoxSource.generateBoxes(jsonStr, {
        ini: true,
      });
      const roundTripped = toIniBoxes[0].props.plaintextOutput;
      expect(roundTripped).toContain('[app]');
      expect(roundTripped).toContain('name=magic');
      expect(roundTripped).toContain('version=2');
    });
  });
});
