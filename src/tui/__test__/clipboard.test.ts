import { describe, expect, it } from 'vitest';
import { clipboardSequence } from '../clipboard';

describe('opt-in terminal clipboard', () => {
  it('encodes Unicode and input escape sequences as inert base64', () => {
    const text = '你好\n\u001b]52;c;bad\u0007';
    expect(clipboardSequence(text)).toBe(
      `\u001b]52;c;${Buffer.from(text).toString('base64')}\u0007`,
    );
  });
  it('rejects oversized clipboard payloads', () => {
    expect(() => clipboardSequence('x'.repeat(100_001))).toThrow('100 KB');
  });
});
