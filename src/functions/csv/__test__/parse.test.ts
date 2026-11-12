import { describe, expect, it } from 'vitest';

import { parseDelimited } from '../parse';

const rows = (text: string, delimiter = ',') =>
  parseDelimited(text, delimiter).rows;

describe('parseDelimited', () => {
  it('splits records and fields', () => {
    expect(rows('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('reads quoted delimiters, line breaks and doubled quotes', () => {
    expect(rows('a,b\n"x,y","say ""hi"""\n"line\nbreak",z')).toEqual([
      ['a', 'b'],
      ['x,y', 'say "hi"'],
      ['line\nbreak', 'z'],
    ]);
  });

  it('accepts CRLF, CR and LF record ends', () => {
    expect(rows('a,b\r\n1,2\r3,4\n5,6')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
    ]);
  });

  it('keeps a quoted CRLF inside the field', () => {
    expect(rows('a\n"x\r\ny"')).toEqual([['a'], ['x\r\ny']]);
  });

  it('opens a final empty field after a trailing delimiter', () => {
    expect(rows('a,b,\n1,2,')).toEqual([
      ['a', 'b', ''],
      ['1', '2', ''],
    ]);
  });

  it('skips blank and all-empty records but keeps empty cells', () => {
    expect(rows('a,b\n\n,\n1,\n')).toEqual([
      ['a', 'b'],
      ['1', ''],
    ]);
  });

  it('trims spaces around unquoted fields and outside quotes only', () => {
    expect(rows('a , b\n " x " ,  y  ')).toEqual([
      ['a', 'b'],
      [' x ', 'y'],
    ]);
  });

  it('keeps tab padding meaningful when tab is the delimiter', () => {
    expect(rows('a\t\tc', '\t')).toEqual([['a', '', 'c']]);
  });

  it('treats a quote inside an unquoted field as text', () => {
    expect(rows('height,note\n5\'11",ok')).toEqual([
      ['height', 'note'],
      ['5\'11"', 'ok'],
    ]);
  });

  it('keeps text after a closing quote instead of dropping it', () => {
    expect(rows('"5" inch,x')).toEqual([['5 inch', 'x']]);
  });

  it('reports where an unterminated quote opened', () => {
    const parsed = parseDelimited('a,b\n1,"open\n2,3', ',');
    expect(parsed.unterminatedQuoteAt).toBe(6);
    expect(parsed.rows.at(-1)).toEqual(['1', 'open\n2,3']);
  });

  it('stops after maxRecords and says so', () => {
    const parsed = parseDelimited('a\nb\nc', ',', 2);
    expect(parsed.rows).toEqual([['a'], ['b']]);
    expect(parsed.truncated).toBe(true);
    expect(parseDelimited('a\nb', ',', 2).truncated).toBe(false);
  });

  it('returns no records for empty text', () => {
    expect(rows('')).toEqual([]);
  });
});
