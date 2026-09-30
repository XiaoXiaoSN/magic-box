import { LocalAIBoxTemplate } from '@components/BoxTemplate';
import copyTextToClipboard from '@functions/clipboard';
import type { Box, BoxProps } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';
import { Modal } from '@mui/material';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import MagicBox from './index';

const { noSources } = vi.hoisted(() => ({ noSources: [] }));

vi.mock('@functions/clipboard', () => ({ default: vi.fn() }));
vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({ filteredBoxSources: noSources }),
}));
vi.mock('../../contexts/PreferencesContext', () => ({
  usePreferences: () => ({ prefs: { copyMode: 'copy' } }),
}));
// The real panel needs a worker; this stand-in publishes one settled answer
// once, on mount — like the panel, which publishes on a change of its own
// state and never because the host handed it a new callback.
vi.mock('../../features/local-ai/LocalAIPanel', () => ({
  default: ({
    onOutput,
    sourceInput,
  }: {
    onOutput?: (text: string) => void;
    sourceInput?: string;
  }) => {
    // biome-ignore lint/correctness/useExhaustiveDependencies: publish once per mount
    useEffect(() => onOutput?.('the answer'), []);
    return <p data-testid="panel">{sourceInput}</p>;
  },
}));

afterEach(() => {
  cleanup();
  vi.mocked(copyTextToClipboard).mockClear();
});

// An interactive template: its own controls, a dialog in a portal, and some
// plain text that is part of the card.
const InteractiveTemplate = ({ name }: BoxProps): React.JSX.Element => (
  <div>
    <span data-testid="plain">{name}</span>
    <textarea data-testid="textarea" />
    <select data-testid="select">
      <option>one</option>
    </select>
    <details>
      <summary data-testid="summary">more</summary>
    </details>
    <Modal open>
      <button data-testid="portal-button" type="button">
        inside a dialog
      </button>
    </Modal>
  </div>
);

const source = (build: (input: string) => Box): BoxSource => ({
  name: 'Test',
  description: '',
  defaultInput: '',
  tag: '·',
  kind: 'Info',
  async generateBoxes(input: string) {
    return [build(input)];
  },
});

const interactive = source(() =>
  new BoxBuilder('Interactive', 'card output')
    .setTemplate(InteractiveTemplate)
    .build(),
);

describe('BoxCard click handling', () => {
  it('leaves clicks on a template’s own controls to those controls', async () => {
    // Regression: clicking into the Local AI textarea to paste overwrote the
    // clipboard with the card's last answer first.
    render(
      <LocaleProvider>
        <MagicBox input="x" sources={[interactive]} />
      </LocaleProvider>,
    );
    await screen.findByTestId('textarea');
    for (const id of ['textarea', 'select', 'summary', 'portal-button']) {
      fireEvent.click(screen.getByTestId(id));
    }
    expect(copyTextToClipboard).not.toHaveBeenCalled();
  });

  it('still copies when the card itself is clicked', async () => {
    render(
      <LocaleProvider>
        <MagicBox input="x" sources={[interactive]} />
      </LocaleProvider>,
    );
    fireEvent.click(await screen.findByTestId('plain'));
    expect(copyTextToClipboard).toHaveBeenCalledWith('card output');
  });
});

describe('Local AI card output across input edits', () => {
  it('keeps copying the answer on screen after the box is regenerated', async () => {
    // Regression: every edit of the magic input replaced the box with one
    // whose `plaintextOutput` was empty, while the same mounted panel still
    // showed its answer, so Copy and Enter went silent.
    const localAI = source((input) =>
      new BoxBuilder('Local AI', '')
        .setSourceInput(input)
        .setTemplate(LocalAIBoxTemplate)
        .setShowExpandButton(false)
        .build(),
    );
    const tree = (input: string) => (
      <LocaleProvider>
        <MagicBox input={input} sources={[localAI]} />
      </LocaleProvider>
    );
    const { rerender } = render(tree('first'));
    await screen.findByText('first');
    rerender(tree('first, edited'));
    // The regenerated box is on screen, with the same panel still mounted.
    await screen.findByText('first, edited');

    // The republish commits in a follow-up render. An empty output is never
    // copied, so without it no click ever reaches the clipboard.
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('magic-box-result'));
      expect(copyTextToClipboard).toHaveBeenCalledWith('the answer');
    });
    expect(
      vi
        .mocked(copyTextToClipboard)
        .mock.calls.every(([t]) => t === 'the answer'),
    ).toBe(true);
  });
});
