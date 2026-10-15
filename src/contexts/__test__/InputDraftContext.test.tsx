import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage } from '../../functions/storage';
import {
  INPUT_DRAFT_STORAGE_KEY,
  InputDraftProvider,
  MAX_INPUT_DRAFT_BYTES,
  useInputDraft,
} from '../InputDraftContext';

const Probe = ({ value }: { value: string }): React.JSX.Element => {
  const { clearVersion, draft, updateDraft } = useInputDraft();
  return (
    <>
      <output data-testid="draft">{draft}</output>
      <output data-testid="clear-version">{clearVersion}</output>
      <button onClick={() => updateDraft(value)} type="button">
        update
      </button>
    </>
  );
};

const renderProbe = (value: string) =>
  render(
    <InputDraftProvider>
      <Probe value={value} />
    </InputDraftProvider>,
  );

describe('InputDraftProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('restores a valid normal draft from session storage', () => {
    sessionStorage.setItem(
      INPUT_DRAFT_STORAGE_KEY,
      JSON.stringify({ version: 1, input: 'restored draft' }),
    );

    renderProbe('unused');

    expect(screen.getByTestId('draft')).toHaveTextContent('restored draft');
  });

  it('persists the exact byte limit and removes oversized drafts', () => {
    vi.useFakeTimers();
    const exact = 'x'.repeat(MAX_INPUT_DRAFT_BYTES);
    const oversized = `${exact}x`;
    const exactRender = renderProbe(exact);

    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    act(() => vi.advanceTimersByTime(150));

    expect(
      JSON.parse(sessionStorage.getItem(INPUT_DRAFT_STORAGE_KEY) ?? '{}').input,
    ).toBe(exact);

    exactRender.unmount();
    renderProbe(oversized);
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    expect(screen.getByTestId('draft')).toHaveTextContent(oversized);
    expect(sessionStorage.getItem(INPUT_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('keeps RAM updates usable when session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    renderProbe('memory only');

    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'update' })),
    ).not.toThrow();
    expect(screen.getByTestId('draft')).toHaveTextContent('memory only');
  });

  it('flushes a pending normal draft when the page is hidden', () => {
    vi.useFakeTimers();
    renderProbe('flush me');

    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    act(() => window.dispatchEvent(new Event('pagehide')));

    expect(
      JSON.parse(sessionStorage.getItem(INPUT_DRAFT_STORAGE_KEY) ?? '{}').input,
    ).toBe('flush me');
  });

  it('clears private drafts immediately and responds to clear data', () => {
    vi.useFakeTimers();
    const normalRender = renderProbe('normal');
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    act(() => vi.advanceTimersByTime(150));
    expect(sessionStorage.getItem(INPUT_DRAFT_STORAGE_KEY)).not.toBeNull();

    normalRender.unmount();
    renderProbe('prompt\n::secret=token');
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    expect(screen.getByTestId('draft')).toHaveTextContent('');
    expect(sessionStorage.getItem(INPUT_DRAFT_STORAGE_KEY)).toBeNull();

    act(() => clearLocalStorage());
    expect(screen.getByTestId('draft')).toHaveTextContent('');
    expect(screen.getByTestId('clear-version')).toHaveTextContent('1');
  });
});
