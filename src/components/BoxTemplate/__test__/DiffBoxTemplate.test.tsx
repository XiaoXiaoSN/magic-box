import type { BoxProps } from '@modules/Box';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../../contexts/LocaleContext';
import DiffBoxTemplate from '../DiffBoxTemplate';

vi.mock('../CodeBoxTemplate', () => ({
  default: ({ plaintextOutput }: { plaintextOutput: string }) => (
    <pre>{plaintextOutput}</pre>
  ),
}));

function renderDiff(sourceInput: string, options: BoxProps['options']) {
  const onClick = vi.fn();
  const onResultChange = vi.fn();

  function ControlledDiff() {
    const [result, setResult] = useState({ options, plaintextOutput: '' });
    return (
      <DiffBoxTemplate
        {...result}
        name="Text Diff"
        onClick={onClick}
        onResultChange={(next) => {
          setResult(next);
          onResultChange(next);
        }}
        sourceInput={sourceInput}
      />
    );
  }

  render(
    <LocaleProvider>
      <ControlledDiff />
    </LocaleProvider>,
  );
  return { onClick, onResultChange };
}

describe('interactive Diff', () => {
  it('compares pasted text, publishes the output, and copies the current diff', () => {
    const { onClick, onResultChange } = renderDiff('a\n---\nb', {
      language: 'yaml',
    });
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

  it('clears a line limit error when the target is edited', () => {
    renderDiff('a', null);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'x\n'.repeat(2001) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Too many lines');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'b' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('makes JSON work cancellable and publishes only the current comparison', () => {
    const workers: FakeWorker[] = [];
    class FakeWorker {
      onmessage?: (event: { data: unknown }) => void;
      postMessage = vi.fn();
      terminate = vi.fn();
      constructor() {
        workers.push(this);
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    try {
      const { onResultChange } = renderDiff('{"a":1}', { jsonDiff: true });
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '{"a":2}' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
      expect(workers[0].postMessage).toHaveBeenCalledWith({
        before: '{"a":1}',
        after: '{"a":2}',
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Cancel comparison' }),
      );
      expect(workers[0].terminate).toHaveBeenCalled();

      const diff = {
        ok: true,
        output: '[{"before":1,"after":2}]',
        patch: '[{"op":"replace","path":"/a","value":2}]',
      };
      act(() => workers[0].onmessage?.({ data: diff }));
      expect(
        screen.queryByRole('button', { name: 'Download JSON Patch' }),
      ).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
      act(() => workers[1].onmessage?.({ data: diff }));
      expect(onResultChange).toHaveBeenLastCalledWith({
        options: {
          jsonDiff: true,
          diffTarget: '{"a":2}',
          diffPatch: diff.patch,
        },
        plaintextOutput: diff.output,
      });
      expect(
        screen.getByRole('button', { name: 'Download JSON Patch' }),
      ).toBeEnabled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
