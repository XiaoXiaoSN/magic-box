import { BoxBuilder } from '@modules/Box';
import { describe, expect, it } from 'vitest';
import { moveSelection, terminalResults, terminalText } from '../model';

describe('renderer-neutral terminal data', () => {
  it('preserves output without web templates or callbacks', () => {
    const boxes = [
      new BoxBuilder('JSON', '{"ok":true}').setView('code').build(),
    ];
    expect(terminalResults(boxes)).toEqual([
      { name: 'JSON', output: '{"ok":true}', tag: undefined, kind: undefined },
    ]);
  });
  it('wraps navigation and handles an empty result list', () => {
    expect(moveSelection(0, -1, 3)).toBe(2);
    expect(moveSelection(2, 1, 3)).toBe(0);
    expect(moveSelection(0, -1, 0)).toBe(0);
  });
  it('strips terminal controls while retaining Unicode and whitespace', () => {
    expect(terminalText('你好\tworld\n\u001b]52;c;bad\u0007')).toBe(
      '你好\tworld\n]52;c;bad',
    );
  });
});
