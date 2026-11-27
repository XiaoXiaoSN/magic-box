import { act, render, screen, waitFor } from '@testing-library/react';
import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';
import { describe, expect, it, vi } from 'vitest';

import CodeBoxTemplate from '../CodeBoxTemplate';

const { highlight } = vi.hoisted(() => ({ highlight: vi.fn() }));
vi.mock('react-syntax-highlighter/dist/esm/light', async (importOriginal) => {
  const { default: Light } =
    await importOriginal<
      typeof import('react-syntax-highlighter/dist/esm/light')
    >();
  function ObservedHighlighter(props: SyntaxHighlighterProps) {
    highlight();
    return <Light {...props} />;
  }
  return {
    default: Object.assign(ObservedHighlighter, {
      registerLanguage: Light.registerLanguage,
    }),
  };
});

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

  it.each([
    'toml',
    'plaintext',
    'text',
  ])('renders %s without language detection', async (language) => {
    const output = 'key: value';
    highlight.mockClear();
    const result = await renderHighlighter(output, language);
    expectRenderedCode(result, output, 'plaintext');
    expect(result.querySelectorAll('span')).toHaveLength(0);
    expect(highlight).not.toHaveBeenCalled();
  });

  it.each([
    JSON.stringify(Array(25_000).fill(1), null, 2),
    JSON.stringify(Array(25_000).fill(1)),
    `key: ${'value\n'.repeat(601)}`,
  ])('keeps large output in a single text node with all text intact', async (output) => {
    highlight.mockClear();
    const result = await renderHighlighter(output, 'json');
    expectRenderedCode(result, output, 'plaintext');
    expect(result.querySelector('code')?.childNodes).toHaveLength(1);
    expect(highlight).not.toHaveBeenCalled();
  });

  it('reuses highlighting when unrelated card properties change', async () => {
    const { rerender } = render(
      <CodeBoxTemplate
        name="JSON"
        onClick={vi.fn()}
        options={{ language: 'json' }}
        plaintextOutput='{"a":1}'
      />,
    );
    await screen.findByTestId('magic-box-result-text');
    highlight.mockClear();
    rerender(
      <CodeBoxTemplate
        disabled
        name="JSON"
        onClick={vi.fn()}
        options={{ language: 'json' }}
        plaintextOutput='{"a":1}'
        selected
      />,
    );
    expect(highlight).not.toHaveBeenCalled();
    rerender(
      <CodeBoxTemplate
        disabled
        name="JSON"
        onClick={vi.fn()}
        options={{ language: 'json' }}
        plaintextOutput='{"a":2}'
        selected
      />,
    );
    expect(highlight).toHaveBeenCalledTimes(1);
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
