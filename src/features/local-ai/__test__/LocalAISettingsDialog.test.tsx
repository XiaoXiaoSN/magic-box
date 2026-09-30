import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../../contexts/LocaleContext';
import { PreferencesProvider } from '../../../contexts/PreferencesContext';
import LocalAISettingsDialog from '../LocalAISettingsDialog';
import type { AIState } from '../types';

const idle: AIState = {
  phase: 'idle',
  loaded: false,
  info: null,
  output: '',
  submitted: null,
  error: null,
  progress: null,
};

// The real registry total for the pinned revision: weights + tokenizer.
const REAL_BYTES = 490_035_255;

interface Options {
  state?: Partial<AIState>;
  promptFromInput?: boolean;
}

const open = ({ state, promptFromInput = false }: Options = {}) =>
  render(
    <LocaleProvider>
      <PreferencesProvider>
        <LocalAISettingsDialog
          canRemove
          deleting={false}
          notice=""
          onClose={vi.fn()}
          onRelease={vi.fn()}
          onRemove={vi.fn()}
          open
          promptFromInput={promptFromInput}
          state={{ ...idle, ...state }}
        />
      </PreferencesProvider>
    </LocaleProvider>,
  );

// `<details>` has no collapsed-visibility behaviour in jsdom, so "behind a
// disclosure" is asserted structurally: the text has to sit inside one.
const insideDisclosure = (pattern: RegExp) =>
  screen.getByText(pattern).closest('details');

describe('LocalAISettingsDialog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the default view to what a decision needs', () => {
    open();
    // Which model, is it loaded, does text leave the device, what can I change.
    expect(screen.getByText(/Qwen2\.5 0\.5B Instruct/)).toBeInTheDocument();
    expect(screen.getByText('Not loaded')).toBeInTheDocument();
    expect(
      screen.getByText(/Your prompts are not sent to an AI server/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('local-ai-task')).toBeInTheDocument();
    // No permission checkbox: downloading is answered by a size-labelled
    // button in the box, at the moment it costs something.
    expect(screen.queryByTestId('local-ai-consent')).not.toBeInTheDocument();

    // Everything a user cannot act on is folded away.
    expect(insideDisclosure(/jsDelivr and Hugging Face/)).not.toBeNull();
    expect(insideDisclosure(/shader-f16/)).not.toBeNull();
    expect(insideDisclosure(/1,024 input tokens/)).not.toBeNull();
    expect(insideDisclosure(/Apache-2\.0/)).not.toBeNull();
    expect(insideDisclosure(/Usage statistics/)).not.toBeNull();

    // No disclosure starts open: a `<details open>` is just long copy again.
    for (const details of document.querySelectorAll('details.local-ai-details'))
      expect(details).not.toHaveAttribute('open');
  });

  it('never grows a second Load button', () => {
    // The gear configures, the box acts. A CTA here is exactly the gear/button
    // duplication that this split removed.
    open({ state: { info: { bytes: REAL_BYTES, cached: true } } });
    expect(screen.queryByTestId('local-ai-setup')).not.toBeInTheDocument();
    expect(screen.queryByTestId('local-ai-run')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Load model/ }),
    ).not.toBeInTheDocument();
  });

  it('quotes measured bytes instead of advising about Wi-Fi', () => {
    open();
    // Before a check there is no number to quote, so it stays generic.
    expect(screen.getByTestId('local-ai-size')).toHaveTextContent(
      'The model is downloaded on first use',
    );

    cleanup();
    open({ state: { info: { bytes: REAL_BYTES, cached: false } } });
    expect(screen.getByTestId('local-ai-size')).toHaveTextContent(
      'First use downloads 467.3 MiB',
    );
  });

  it('drops the download line once the model is loaded', () => {
    // `info.cached` still holds the pre-download reading, so keeping the line
    // would claim a download that already happened.
    open({
      state: {
        phase: 'ready',
        loaded: true,
        info: { bytes: REAL_BYTES, cached: false },
      },
    });
    expect(screen.queryByTestId('local-ai-size')).not.toBeInTheDocument();
    expect(screen.getByText('Model ready')).toBeInTheDocument();
  });

  it('shows the error text, not just the phase', () => {
    open({ state: { phase: 'error', error: 'unsupported' } });
    expect(screen.getByTestId('local-ai-settings-error')).toHaveTextContent(
      /cannot run the selected model/,
    );
  });

  it('mentions share links only when the prompt is in the main input', () => {
    open();
    expect(screen.queryByTestId('local-ai-share-note')).not.toBeInTheDocument();

    cleanup();
    open({ promptFromInput: true });
    expect(screen.getByTestId('local-ai-share-note')).toHaveTextContent(
      /share link you create would carry it/,
    );
  });
});
