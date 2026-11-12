import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedbackSample } from '../../../../functions/schema.js';
import { LocaleProvider } from '../../../contexts/LocaleContext';
import FeedbackPanel from '../FeedbackPanel';
import { submitFeedback } from '../submit';

const { prefs } = vi.hoisted(() => ({
  prefs: {
    collectFeedback: true,
    analytics: false,
    timezoneMode: 'fixed',
    timezoneOffset: 8,
  },
}));
vi.mock('../../../contexts/PreferencesContext', () => ({
  usePreferences: () => ({ prefs }),
}));
vi.mock('../submit', () => ({
  submitFeedback: vi.fn(),
  isFeedbackConfigured: () => true,
  FeedbackError: class extends Error {},
}));
const candidates = [
  {
    id: '0:math:0',
    sourceId: 'math',
    name: 'Math',
    output: '2',
    isError: false,
  },
];
const tree = (
  input = '1+1',
  ready = true,
  selectedCandidateId: string | null = candidates[0].id,
  items = candidates,
) => (
  <LocaleProvider>
    <FeedbackPanel
      input={input}
      candidates={items}
      selectedCandidateId={selectedCandidateId}
      ready={ready}
    />
  </LocaleProvider>
);

beforeEach(() => {
  vi.mocked(submitFeedback).mockReset().mockResolvedValue(undefined);
  prefs.collectFeedback = true;
});

describe('explicit dataset feedback', () => {
  it('sends only after confirmation, even with analytics off, preserving the entire candidate list', async () => {
    render(tree());
    expect(submitFeedback).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Additional comments (optional)'), {
      target: { value: 'useful' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await screen.findByText('Thanks! Your feedback was saved.');
    const [sample] = vi.mocked(submitFeedback).mock.calls[0];
    expect(sample).toMatchObject({
      input: '1+1',
      candidates,
      selectedCandidateId: '0:math:0',
      kind: 'selection',
      comment: 'useful',
      consentVersion: 'training-v1',
    });
    expect(
      screen.getByRole('button', { name: 'Send feedback' }),
    ).toBeDisabled();
  });

  it('can report unmet expectations with zero candidates and blocks empty feedback', async () => {
    render(tree('unhandled input', true, null, []));
    expect(
      screen.getByRole('button', { name: 'Send feedback' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByLabelText('I expected a different result'));
    expect(
      screen.getByRole('button', { name: 'Send feedback' }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText('What output did you expect?'), {
      target: { value: 'expected result' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledOnce());
    expect(vi.mocked(submitFeedback).mock.calls[0][0]).toMatchObject({
      input: 'unhandled input',
      candidates: [],
      selectedCandidateId: null,
      kind: 'expectation',
      expectedOutput: 'expected result',
    });
  });

  it('retries with the same sample ID after an uncertain network failure', async () => {
    vi.mocked(submitFeedback).mockRejectedValueOnce(new Error('network'));
    render(tree());
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await screen.findByText('Feedback could not be saved. Please retry.');
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await screen.findByText('Thanks! Your feedback was saved.');
    expect(vi.mocked(submitFeedback).mock.calls[1][0]).toEqual(
      vi.mocked(submitFeedback).mock.calls[0][0],
    );
  });

  it('invalidates in-flight permission on input changes, stale results, opt-out and unmount', async () => {
    let allowed!: () => boolean;
    let complete!: () => void;
    vi.mocked(submitFeedback).mockImplementation(
      (_sample: FeedbackSample, check: () => boolean) => {
        allowed = check;
        return new Promise<void>((resolve) => {
          complete = resolve;
        });
      },
    );
    const view = render(tree());
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(allowed()).toBe(true);
    view.rerender(tree('another input'));
    expect(allowed()).toBe(false);
    view.rerender(tree('1+1', false));
    expect(allowed()).toBe(false);
    prefs.collectFeedback = false;
    view.rerender(tree());
    expect(allowed()).toBe(false);
    view.unmount();
    expect(allowed()).toBe(false);
    complete();
  });

  it('rejects oversized samples without invoking the transport', () => {
    render(tree('a'.repeat(32769)));
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(
      screen.getByText(/exceed the feedback size limit/),
    ).toBeInTheDocument();
    expect(submitFeedback).not.toHaveBeenCalled();
  });
});
