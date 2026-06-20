import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CodeBoxTemplate from '../CodeBoxTemplate';

// renders the template and waits for the lazy highlighter to resolve
async function renderHighlighter(
  plaintextOutput: string,
  language: string,
): Promise<void> {
  act(() => {
    render(
      <CodeBoxTemplate
        name="Test"
        onClick={(): void => {}}
        options={{ language }}
        plaintextOutput={plaintextOutput}
      />,
    );
  });

  await waitFor(
    () => {
      expect(screen.getByTestId('magic-box-result-text')).toBeTruthy();
    },
    { timeout: 3000 },
  );
}

describe('<CodeBoxTemplate />', () => {
  it('renders json content', async () => {
    await renderHighlighter('{"key":1}', 'json');
  });

  it('renders yaml content', async () => {
    await renderHighlighter('key: value', 'yaml');
  });

  it('renders xml content', async () => {
    await renderHighlighter('<root><item>1</item></root>', 'xml');
  });

  it('renders toml content (falls back to plaintext)', async () => {
    await renderHighlighter('key = "value"', 'toml');
  });

  it('defaults to yaml when no language option is provided', async () => {
    act(() => {
      render(
        <CodeBoxTemplate
          name="Test"
          onClick={(): void => {}}
          options={null}
          plaintextOutput="key: value"
        />,
      );
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('magic-box-result-text')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });
});
