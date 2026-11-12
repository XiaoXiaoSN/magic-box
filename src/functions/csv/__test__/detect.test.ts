import { describe, expect, it } from 'vitest';

import {
  detectTableShape,
  looksLikeHeader,
  lostLeadingCell,
  resolveTableShape,
} from '../detect';

const delimiterOf = (text: string): string | null =>
  detectTableShape(text)?.delimiter ?? null;

describe('detectTableShape', () => {
  it.each([
    ['comma CSV', 'name,age\nAlice,30\nBob,25', ','],
    ['quoted comma', 'name,city\nBob,"Tokyo, Japan"\nAmy,Paris', ','],
    ['multi-line quoted field', 'name,note\nBob,"a\nb"\nAmy,c', ','],
    ['spreadsheet TSV', 'name\tage\nAlice\t30', '\t'],
    ['TSV with a comma in a cell', 'name\tnote\nBob\tSmith, Jr.', '\t'],
    ['European semicolon CSV', 'a;b;c\n1,5;2,3;x\n4;5;6', ';'],
    ['hand-typed CSV with spaces', 'name, age, city\nAlice, 30, Taipei', ','],
    ['CJK headers', '名稱\t價格\n蘋果\t30', '\t'],
    ['Excel sep= line', 'sep=;\na;b\n1;2', ';'],
  ])('recognizes %s', (_name, text, delimiter) => {
    expect(delimiterOf(text)).toBe(delimiter);
  });

  it.each([
    ['single line', 'name,age,city'],
    ['prose with commas', 'Hello, world\nGoodbye, moon'],
    [
      'sentences',
      'I like apples, bananas, and pears.\nShe likes cats, dogs, and birds.',
    ],
    ['number matrix (no header)', '1,2,3\n4,5,6'],
    ['coordinate pairs', '25.03,121.56\n35.68,139.69'],
    ['function calls', 'f(a,b)\ng(c,d)'],
    ['code lines', 'const a = [1, 2];\nconst b = [3, 4];'],
    ['statements ending in ;', 'foo;\nbar;'],
    ['YAML with commas', 'tags: a, b\nnames: c, d'],
    ['flow YAML', 'tags: [a, b]\nnames: [c, d]'],
    ['JSONL', '{"a":1,"b":2}\n{"a":3,"b":4}'],
    ['JSON array', '[\n  "a,b",\n  "c,d"\n]'],
    ['XML', '<a>x,y</a>\n<b>z,w</b>'],
    ['ragged rows', 'a,b\n1,2,3\n4'],
    ['unterminated quote', 'a,b\n"open,2\n3,4'],
    ['a column with no content', 'a,,c\n1,,3'],
    ['plain lines', 'apple\nbanana'],
    ['tab-indented block', 'if true; then\n\techo a\n\techo b\nfi'],
    ['tab-indented list under a heading', 'Steps\n\tone\n\ttwo'],
    [
      'log lines with comma milliseconds',
      '2024-01-01 10:00:00,123 INFO a\n2024-01-01 10:00:01,456 INFO b',
    ],
    ['thousands separators', 'Revenue 1,234,567\nCost 1,000,000'],
    ['prices', 'Price: 1,200\nTax: 1,050'],
  ])('stays silent on %s', (_name, text) => {
    expect(detectTableShape(text)).toBeNull();
  });

  it('still accepts numbers split by a real column', () => {
    expect(delimiterOf('id,code\n1,234\n5,678')).toBe(',');
  });

  it('reads only a bounded window of a large paste', () => {
    const csv = `name,age\n${'Alice,30\n'.repeat(20_000)}`;
    expect(delimiterOf(csv)).toBe(',');
    // ~40 long records: the 64 KiB window, not the record cap, ends the
    // scan, and it cuts through a quoted multi-line field
    const longNote = `"${'x'.repeat(1500)}\n${'y'.repeat(1500)}"`;
    const quoted = `name,note\n${`Bob,${longNote}\n`.repeat(40)}`;
    expect(quoted.length).toBeGreaterThan(64 * 1024);
    expect(delimiterOf(quoted)).toBe(',');
    expect(delimiterOf(`${quoted}"unterminated`)).toBe(',');
  });

  it('prefers tab over a comma that also splits evenly', () => {
    expect(delimiterOf('a,b\tc,d\n1,2\t3,4')).toBe('\t');
  });

  it('prefers the wider split between comma and semicolon', () => {
    expect(delimiterOf('a;b,c;d\n1;2,3;4')).toBe(';');
  });

  it('recovers the empty top-left cell input trimming removed', () => {
    // `\tQ1\tQ2\nNorth\t10\t20` after `parseInput` trims the leading tab
    expect(delimiterOf('Q1\tQ2\nNorth\t10\t20')).toBe('\t');
    expect(delimiterOf('Q1,Q2\nNorth,10,20')).toBeNull();
  });

  it('tolerates a last TSV row whose trailing tabs were trimmed', () => {
    expect(delimiterOf('a\tb\tc\n1\t2\t3\n4')).toBe('\t');
    expect(delimiterOf('a\tb\n1')).toBeNull();
  });
});

describe('resolveTableShape', () => {
  it('falls back to the most consistent split for ragged input', () => {
    expect(resolveTableShape('a;b\n1;2\n3;4;5').delimiter).toBe(';');
  });

  it('reads text without a delimiter as one column', () => {
    expect(resolveTableShape('apple\nbanana').delimiter).toBe(',');
  });

  it('skips the Excel sep= line', () => {
    expect(resolveTableShape('sep=|\na|b\n1|2')).toEqual({
      delimiter: '|',
      bodyStart: 6,
    });
  });
});

describe('looksLikeHeader', () => {
  it('treats an all-number first row as data', () => {
    expect(looksLikeHeader(['1', '2.5', '-3', '1,234', '50%'])).toBe(false);
    expect(looksLikeHeader(['2023', ''])).toBe(false);
  });

  it('treats any label as a header', () => {
    expect(looksLikeHeader(['id', '1'])).toBe(true);
    expect(looksLikeHeader(['', ''])).toBe(true);
  });
});

describe('lostLeadingCell', () => {
  it('only applies to a short tab-separated header over a full body', () => {
    const body = [
      ['Q1', 'Q2'],
      ['North', '10', '20'],
    ];
    expect(lostLeadingCell(body, '\t')).toBe(true);
    expect(lostLeadingCell(body, ',')).toBe(false);
    expect(lostLeadingCell([['a', 'b', 'c'], ['1']], '\t')).toBe(false);
  });
});
