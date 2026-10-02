import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../../contexts/LocaleContext';
import DiffBoxTemplate from '../DiffBoxTemplate';

vi.mock('../CodeBoxTemplate', () => ({
  default: ({ plaintextOutput }: { plaintextOutput: string }) => (
    <pre>{plaintextOutput}</pre>
  ),
}));

describe('interactive Diff', () => {
  it('compares pasted text, publishes the output, and copies the current diff', () => {
    const onClick = vi.fn();
    const onResultChange = vi.fn();
    render(
      <LocaleProvider>
        <DiffBoxTemplate
          name="Text Diff"
          sourceInput={'a\n---\nb'}
          plaintextOutput=""
          options={{ language: 'yaml' }}
          onClick={onClick}
          onResultChange={onResultChange}
        />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'a\n---\nc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByText(/@@ \+1 -1 @@/)).toHaveTextContent('- b');
    expect(screen.getByText(/@@ \+1 -1 @@/)).toHaveTextContent('+ c');
    fireEvent.click(screen.getByRole('button', { name: 'Copy diff' }));
    expect(onClick).toHaveBeenCalledWith(expect.stringContaining('+ c'));
    expect(onResultChange).toHaveBeenLastCalledWith({
      options: { language: 'yaml', diffTarget: 'a\n---\nc' },
      plaintextOutput: expect.stringContaining('+ c'),
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'd' } });
    expect(screen.queryByRole('button', { name: 'Copy diff' })).toBeNull();
    expect(onResultChange).toHaveBeenLastCalledWith({
      options: { language: 'yaml', diffTarget: 'd' },
      plaintextOutput: '',
    });
  });
  it('shows an error instead of allocating an excessive LCS table', () => {
    render(
      <LocaleProvider>
        <DiffBoxTemplate
          name="Diff"
          sourceInput="a"
          plaintextOutput=""
          options={null}
          onClick={vi.fn()}
        />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'x\n'.repeat(2001) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Too many lines');
  });
});
