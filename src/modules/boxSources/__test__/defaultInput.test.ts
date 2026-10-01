import { parseInput } from '@functions/parseOptions';
import { describe, expect, it } from 'vitest';

import { boxSources } from '../index';

// `parseInput` only extracts `::option` directives that start a line. A
// defaultInput written as `hello ::base32` therefore reaches the source with
// no options and the tools-page preview shows nothing.
describe('every BoxSource defaultInput', () => {
  it.each(
    boxSources.map((source) => [source.name, source] as const),
  )('%s puts its directives on their own line', (_name, source) => {
    const [input, options] = parseInput(source.defaultInput);
    expect(input).not.toMatch(/(?:^|\s)::\w/);
    if (source.defaultInput.includes('::')) {
      expect(Object.keys(options ?? {})).not.toHaveLength(0);
    }
  });
});
