import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import FileHasher from './FileHasher';

it('handles dropped files, cancels an old run and publishes only the new result', () => {
  const workers: TestWorker[] = [];
  class TestWorker {
    postMessage = vi.fn();
    terminate = vi.fn();
    onmessage?: (event: { data: unknown }) => void;
    constructor() {
      workers.push(this);
    }
  }

  vi.stubGlobal('Worker', TestWorker);
  try {
    render(
      <LocaleProvider>
        <FileHasher />
      </LocaleProvider>,
    );
    const region = screen.getByRole('region', { name: 'File SHA-256' });
    const file = new File(['A'], '檔案.txt');
    fireEvent.drop(region, { dataTransfer: { files: [file] } });
    expect(workers[0].postMessage).toHaveBeenCalledWith(file);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel hashing' }));
    expect(workers[0].terminate).toHaveBeenCalled();
    act(() => workers[0].onmessage?.({ data: { ok: true, digest: 'stale' } }));
    expect(screen.queryByText('stale')).toBeNull();

    fireEvent.drop(region, { dataTransfer: { files: [file, file] } });
    expect(screen.getByRole('alert')).toHaveTextContent('one file at a time');
    fireEvent.drop(region, { dataTransfer: { files: [file] } });
    act(() => workers[1].onmessage?.({ data: { ok: true, digest: 'a1b2c3' } }));
    expect(screen.getByText('SHA-256 for 檔案.txt')).toBeVisible();
    expect(screen.getByText('a1b2c3')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Download checksum' }),
    ).toBeEnabled();
  } finally {
    vi.unstubAllGlobals();
  }
});
