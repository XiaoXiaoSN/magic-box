import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import type { BoxSource } from '../../modules/BoxSource';
import { boxSources } from '../../modules/boxSources';
import DirectiveAutocomplete, {
  buildDirectiveCatalog,
  DirectiveChips,
  filterDirectiveCatalog,
  getDirectiveContext,
} from './DirectiveAutocomplete';

const source = (id: string, optionKeys: readonly string[]): BoxSource => ({
  defaultInput: '',
  description: `${id} description`,
  generateBoxes: async () => [],
  id,
  kind: 'Test',
  name: id,
  optionKeys,
  tag: '·',
});

const InputHarness = ({ initialValue }: { initialValue: string }) => {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  return (
    <LocaleProvider>
      <DirectiveAutocomplete
        aria-label="Input"
        onChange={setValue}
        onReplace={setValue}
        textareaRef={textareaRef}
        value={value}
      />
    </LocaleProvider>
  );
};

describe('directive catalog and context', () => {
  it('keeps metadata-only owners deduplicated and reports disabled owners', () => {
    const catalog = buildDirectiveCatalog(
      'en',
      [source('first', ['shared']), source('second', ['shared'])],
      new Set(['first']),
      () => 'global',
    );
    const shared = catalog.find((entry) => entry.key === 'shared');

    expect(shared?.owners).toEqual([
      expect.objectContaining({ id: 'first', enabled: true }),
      expect.objectContaining({ id: 'second', enabled: false }),
    ]);
    expect(catalog.find((entry) => entry.key === 'locale')?.owners).toEqual([
      expect.objectContaining({ id: 'directive-global', enabled: true }),
    ]);
    expect(filterDirectiveCatalog(catalog, '').length).toBeLessThanOrEqual(8);
  });

  it('uses the parser boundary so IPv6 and value editing never open completion', () => {
    expect(getDirectiveContext('::wr', 4, 4)).toMatchObject({
      key: 'wr',
      start: 2,
    });
    expect(getDirectiveContext('::wrap', 3, 3)).toMatchObject({
      end: 6,
      query: 'w',
    });
    expect(getDirectiveContext('::', 2, 2)).toMatchObject({ query: '' });
    expect(getDirectiveContext('::ca', 4, 4)).not.toBeNull();
    expect(getDirectiveContext('::1', 3, 3)).toBeNull();
    expect(getDirectiveContext('::wr=80', 7, 7)).toBeNull();
    expect(getDirectiveContext('text\n::wr', 4, 4)).toBeNull();
    expect(getDirectiveContext('::wr\ntext', 4, 4)).not.toBeNull();
  });

  it('localizes metadata owners without importing their implementations', () => {
    const wordWrap = boxSources.find(
      (candidate) => candidate.id === 'word-wrap',
    );
    if (!wordWrap) throw new Error('word-wrap metadata is missing');
    const catalog = buildDirectiveCatalog('tw', [wordWrap]);

    expect(catalog.find((entry) => entry.key === 'wrap')?.owners[0]).toEqual(
      expect.objectContaining({ name: '文字換行' }),
    );
  });
});

describe('DirectiveAutocomplete', () => {
  it('replaces the current directive key with keyboard completion', async () => {
    render(<InputHarness initialValue="::wr" />);
    const input = screen.getByRole('combobox', {
      name: 'Input',
    }) as HTMLTextAreaElement;
    input.setSelectionRange(4, 4);
    fireEvent.focus(input);

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Directive suggestions');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyUp(input, { key: 'Enter' });

    await waitFor(() => expect(input).toHaveValue('::wrap'));
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-controls');
  });

  it('accepts with Tab while preserving surrounding lines', async () => {
    render(<InputHarness initialValue={'before\n::wr\nafter'} />);
    const input = screen.getByRole('combobox', {
      name: 'Input',
    }) as HTMLTextAreaElement;
    input.setSelectionRange(10, 10);
    fireEvent.focus(input);
    await screen.findByRole('listbox');

    fireEvent.keyDown(input, { key: 'Tab' });
    fireEvent.keyUp(input, { key: 'Tab' });

    await waitFor(() => expect(input).toHaveValue('before\n::wrap\nafter'));
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes only the menu on Escape and leaves the typed key intact', async () => {
    render(<InputHarness initialValue="::wr" />);
    const input = screen.getByRole('combobox', {
      name: 'Input',
    }) as HTMLTextAreaElement;
    input.setSelectionRange(4, 4);
    fireEvent.focus(input);
    await screen.findByRole('listbox');

    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.keyUp(input, { key: 'Escape' });

    expect(input).toHaveValue('::wr');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not accept while composing and reopens after composition ends', async () => {
    render(<InputHarness initialValue="::wr" />);
    const input = screen.getByRole('combobox', {
      name: 'Input',
    }) as HTMLTextAreaElement;
    input.setSelectionRange(4, 4);
    fireEvent.focus(input);
    await screen.findByRole('listbox');

    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(input).toHaveValue('::wr');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    fireEvent.compositionEnd(input);
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'));
  });
});

describe('DirectiveChips', () => {
  it('marks unknown directives while leaving IPv6 literals unchipped', () => {
    const onReplace = vi.fn();
    render(
      <LocaleProvider>
        <DirectiveChips input={'::wrp\r\n::1'} onReplace={onReplace} />
      </LocaleProvider>,
    );

    expect(screen.getByTestId('directive-chip-wrp')).toHaveTextContent(
      'Unknown directive',
    );
    expect(screen.queryByTestId('directive-chip-1')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Did you mean ::wrap?' }),
    );
    expect(onReplace).toHaveBeenCalledWith('::wrap\r\n::1', 6);
  });

  it('keeps bare-CR directive lines separate while preserving replacement offsets', () => {
    const onReplace = vi.fn();
    render(
      <LocaleProvider>
        <DirectiveChips input={'::wrp\r::wrap'} onReplace={onReplace} />
      </LocaleProvider>,
    );

    expect(screen.getByTestId('directive-chip-wrp')).toHaveTextContent(
      'Unknown directive',
    );
    expect(screen.getByTestId('directive-chip-wrap')).not.toHaveClass(
      'is-unknown',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Did you mean ::wrap?' }),
    );
    expect(onReplace).toHaveBeenCalledWith('::wrap\r::wrap', 6);
  });

  it('retains parser aliases as known chips', () => {
    render(
      <LocaleProvider>
        <DirectiveChips input={'::ca\n::dd'} onReplace={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByTestId('directive-chip-ca')).not.toHaveClass(
      'is-unknown',
    );
    expect(screen.getByTestId('directive-chip-dd')).not.toHaveClass(
      'is-unknown',
    );
  });

  it('offers an individual enable action for a disabled owner', () => {
    localStorage.setItem(
      'mb_settings',
      JSON.stringify({
        version: 2,
        boxes: { 'word-wrap': { enabled: false } },
      }),
    );
    render(
      <LocaleProvider>
        <SettingsProvider>
          <DirectiveChips input="::wrap" onReplace={vi.fn()} />
        </SettingsProvider>
      </LocaleProvider>,
    );

    const enable = screen.getByRole('button', { name: 'Enable Word Wrap' });
    fireEvent.click(enable);

    expect(
      JSON.parse(localStorage.getItem('mb_settings') ?? '{}').boxes['word-wrap']
        .enabled,
    ).toBe(true);
  });
});
