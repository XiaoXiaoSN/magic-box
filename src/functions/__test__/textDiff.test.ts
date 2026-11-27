import { describe, expect, it } from 'vitest';
import { compareTexts } from '../textDiff';

describe('compareTexts', () => {
  it.each([
    ['x', '', '@@ +0 -1 @@\n- x'],
    ['', 'x', '@@ +1 -0 @@\n+ x'],
    ['', '', '@@ +0 -0 @@'],
  ])('treats empty text as zero lines when comparing %j and %j', (left, right, output) => {
    expect(compareTexts(left, right)).toEqual({ ok: true, output });
  });

  it('preserves blank lines and trailing newlines in nonempty text', () => {
    expect(compareTexts('a\r\n\r\nb\r\n', 'a\nb')).toEqual({
      ok: true,
      output: '@@ +0 -2 @@\n  a\n- \n  b\n- ',
    });
  });
});
