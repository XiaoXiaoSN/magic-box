import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CodeBoxTemplate from '../CodeBoxTemplate';

// renders the template and waits for the lazy highlighter to resolve
async function renderHighlighter(
  plaintextOutput: string,
  language: string,
): Promise<HTMLElement> {
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

  return waitFor(() => screen.getByTestId('magic-box-result-text'), {
    timeout: 3000,
  });
}

function expectRenderedCode(
  result: HTMLElement,
  plaintextOutput: string,
  language: string,
): void {
  expect(result.textContent).toBe(plaintextOutput);
  expect(result.querySelector('code')).toHaveClass(`language-${language}`);
}

describe('<CodeBoxTemplate />', () => {
  it('renders json content', async () => {
    const output = '{"key":1}';
    expectRenderedCode(await renderHighlighter(output, 'json'), output, 'json');
  });

  it('renders yaml content', async () => {
    const output = 'key: value';
    expectRenderedCode(await renderHighlighter(output, 'yaml'), output, 'yaml');
  });

  it('renders xml content', async () => {
    const output = '<root><item>1</item></root>';
    expectRenderedCode(await renderHighlighter(output, 'xml'), output, 'xml');
  });

  it('renders diff content', async () => {
    const output = '@@ -1 +1 @@\n-old\n+new';
    const result = await renderHighlighter(output, 'diff');
    expectRenderedCode(result, output, 'diff');
  });

  it('renders toml content (falls back to plaintext)', async () => {
    const output = 'key = "value"';
    expectRenderedCode(
      await renderHighlighter(output, 'toml'),
      output,
      'plaintext',
    );
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

    const result = await waitFor(
      () => screen.getByTestId('magic-box-result-text'),
      { timeout: 3000 },
    );
    expectRenderedCode(result, 'key: value', 'yaml');
  });
});
