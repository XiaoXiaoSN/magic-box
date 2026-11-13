// @vitest-environment node

import { parseInput } from '@functions/parseOptions';
import JSON5 from 'json5';
import { describe, expect, it } from 'vitest';

import { CssToJsBoxSource } from '../CssToJsBoxSource';
import { getBoxSource } from '../index';

const convert = (input: string) =>
  CssToJsBoxSource.generateBoxes(input, { cssjs: true });

describe('CSS to JS', () => {
  it('requires an owned directive', async () => {
    expect(await CssToJsBoxSource.generateBoxes('color: red;')).toEqual([]);
    expect(
      await CssToJsBoxSource.generateBoxes('color: red;', { json: true }),
    ).toEqual([]);
    expect(
      await CssToJsBoxSource.generateBoxes('color: red;', { csstojs: true }),
    ).toHaveLength(1);
  });

  it('converts complete declarations into a valid style literal', async () => {
    const [box] = await convert('background-color: red; font-size: 14px;');
    expect(box.props.name).toBe('CSS to JS');
    expect(box.view).toBe('code');
    expect(box.props.options).toEqual({ language: 'javascript' });
    expect(JSON5.parse(box.props.plaintextOutput)).toEqual({
      backgroundColor: 'red',
      fontSize: '14px',
    });
  });

  it('preserves CSS strings, escaped quotes, comments, and data URLs', async () => {
    const input = String.raw`/* theme: dark; */ font-family: "Open Sans", sans-serif;
      content: 'a;("b")'; background-image: url("data:image/svg+xml;a,b");
      --escaped: "a\";b"; color: /* annotation; */ red;`;
    const [box] = await convert(input);
    expect(box.props.isError).not.toBe(true);
    expect(JSON5.parse(box.props.plaintextOutput)).toEqual({
      fontFamily: '"Open Sans", sans-serif',
      content: '\'a;("b")\'',
      backgroundImage: 'url("data:image/svg+xml;a,b")',
      '--escaped': String.raw`"a\";b"`,
      color: 'red',
    });
  });

  it('preserves custom properties and React vendor prefixes in both directions', async () => {
    const input =
      '--Brand-color: red; color: var(--Brand-color); -ms-transform: none; -webkit-box-shadow: none;';
    const [forward] = await convert(input);
    expect(JSON5.parse(forward.props.plaintextOutput)).toEqual({
      '--Brand-color': 'red',
      color: 'var(--Brand-color)',
      msTransform: 'none',
      WebkitBoxShadow: 'none',
    });
    const [reverse] = await convert(forward.props.plaintextOutput);
    expect(reverse.props.plaintextOutput).toBe(
      '--Brand-color: red;\ncolor: var(--Brand-color);\n-ms-transform: none;\n-webkit-box-shadow: none;',
    );
  });

  it('preserves comment token boundaries and unquoted URL contents', async () => {
    const [box] = await convert(
      'font-family: Times/**/New/**/Roman; background-image: url(https://example.com/*/image[.png);',
    );
    expect(JSON5.parse(box.props.plaintextOutput)).toEqual({
      fontFamily: 'Times/**/New/**/Roman',
      backgroundImage: 'url(https://example.com/*/image[.png)',
    });
  });

  it('keeps the last declaration after intervening longhands', async () => {
    const [box] = await convert('margin: 1px; margin-left: 2px; margin: 3px;');
    expect(Object.entries(JSON5.parse(box.props.plaintextOutput))).toEqual([
      ['marginLeft', '2px'],
      ['margin', '3px'],
    ]);
  });

  it('supports quoted keys, single quotes, comments, and trailing commas', async () => {
    const [box] = await convert(`{
      "backgroundColor": "rgba(0,0,0,0.5)",
      fontFamily: 'Arial, sans-serif', // fallback
      content: "'hello, world'",
      '--theme': 'a:b,c',
    }`);
    expect(box.props.name).toBe('JS to CSS');
    expect(box.props.options).toEqual({ language: 'css' });
    expect(box.props.plaintextOutput).toBe(
      "background-color: rgba(0,0,0,0.5);\nfont-family: Arial, sans-serif;\ncontent: 'hello, world';\n--theme: a:b,c;",
    );
  });

  it('serializes React numeric lengths, unitless values, zero and custom properties', async () => {
    const [box] = await convert(
      '{ width: 10, marginTop: -2, opacity: 0.5, lineHeight: 1.5, zIndex: 3, flexGrow: 2, WebkitLineClamp: 2, WebkitFlexGrow: 3, gridArea: 2, lineClamp: 4, padding: 0, "--gap": 4, fontSize: "12px", cssFloat: "left" }',
    );
    expect(box.props.plaintextOutput).toBe(
      'width: 10px;\nmargin-top: -2px;\nopacity: 0.5;\nline-height: 1.5;\nz-index: 3;\nflex-grow: 2;\n-webkit-line-clamp: 2;\n-webkit-flex-grow: 3;\ngrid-area: 2;\nline-clamp: 4;\npadding: 0;\n--gap: 4;\nfont-size: 12px;\nfloat: left;',
    );
  });

  it.each([
    'color: red; malformed',
    'color: red !important;',
    '{ color: getColor() }',
    '{ ...other }',
    '{ color: null }',
    '{ color: true }',
    '{ color: {} }',
    '{ width: Infinity }',
    '{ width: NaN }',
  ])('reports invalid or unsupported input: %s', async (input) => {
    const [box] = await convert(input);
    expect(box.props.isError).toBe(true);
    expect(box.props.plaintextOutput.length).toBeGreaterThan(0);
  });

  it.each(['', '   ', ';;;', '{}'])('omits empty input: %s', async (input) => {
    expect(await convert(input)).toEqual([]);
  });

  it('bounds input and handles long colon-free identifiers', async () => {
    expect((await convert('a'.repeat(100_001)))[0].props.isError).toBe(true);
    expect((await convert(`{${'a'.repeat(99_999)}`))[0].props.isError).toBe(
      true,
    );
  });

  it('runs its default and aliases through the lazy headless registry', async () => {
    const source = getBoxSource('css-to-js');
    expect(source?.headless).toBe(true);
    for (const raw of [
      CssToJsBoxSource.defaultInput,
      'color: blue;\n::csstojs',
    ]) {
      const [input, options] = parseInput(raw);
      expect(source?.canHandle?.(input, options)).toBe(true);
      const boxes = await source?.generateBoxes(input, options);
      expect(boxes).toHaveLength(1);
      expect(boxes?.[0].props.isError).not.toBe(true);
    }
    expect(await source?.generateBoxes('hello', null)).toEqual([]);
  });
});
