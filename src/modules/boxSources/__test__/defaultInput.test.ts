import { parseInput } from '@functions/parseOptions';
import type { BoxSourceContext } from '@modules/BoxSource';
import { describe, expect, it } from 'vitest';

import { boxSources } from '../index';

const headlessSources = boxSources.filter((source) => source.headless === true);
const interactiveSources = boxSources.filter(
  (source) => source.headless !== true,
);

const previewContext = (): BoxSourceContext => ({
  signal: new AbortController().signal,
  preview: true,
  now: Date.UTC(2024, 0, 1),
  locale: 'en',
  timezone: 'Asia/Taipei',
  timezoneOffset: 8,
  timezoneMode: 'fixed',
});

const runPreviewExample = async (source: (typeof boxSources)[number]) => {
  const [input, options] = parseInput(source.defaultInput);
  return source.generateBoxes(input, options, previewContext());
};

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

  it.each(
    headlessSources.map((source) => [source.name, source] as const),
  )('%s runs its default example through the headless preview path', async (_name, source) => {
    const boxes = await runPreviewExample(source);
    expect(boxes, source.id).not.toHaveLength(0);

    if (source.id === 'certificate-decode') {
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.isError).toBe(true);
      expect(boxes[0].props.plaintextOutput).toContain(
        'Unable to decode certificate',
      );
      return;
    }

    expect(
      boxes.every(
        (box) =>
          box.props.isError !== true && box.props.plaintextOutput.length > 0,
      ),
      source.id,
    ).toBe(true);
  });

  it.each(
    interactiveSources.map((source) => [source.name, source] as const),
  )('%s runs its default example through the interactive preview path', async (_name, source) => {
    const boxes = await runPreviewExample(source);

    if (source.id === 'local-ai') {
      expect(boxes).toHaveLength(1);
      expect(boxes[0].view).toBe('localAI');
      expect(boxes[0].props.plaintextOutput).toBe('');
      return;
    }

    expect(boxes, source.id).not.toHaveLength(0);
    expect(
      boxes.every((box) => box.props.plaintextOutput.length > 0),
      source.id,
    ).toBe(true);
  });
});
