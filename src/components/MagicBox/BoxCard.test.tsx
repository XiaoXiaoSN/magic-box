import { LocalAIBoxTemplate } from '@components/BoxTemplate';
import copyTextToClipboard from '@functions/clipboard';
import type { Box, BoxProps } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';
import { Modal } from '@mui/material';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

beforeEach(() => {
  vi.mocked(copyTextToClipboard).mockReset().mockResolvedValue(true);
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

const throwingTemplate = (): React.JSX.Element => {
  throw new Error('private template details');
};

const stableTemplate = ({ plaintextOutput }: BoxProps): React.JSX.Element => (
  <span data-testid="stable-output">{plaintextOutput}</span>
);

const changingTemplate = ({
  onResultChange,
  plaintextOutput,
}: BoxProps): React.JSX.Element => (
  <>
    <span data-testid="changing-output">{plaintextOutput}</span>
    <button
      data-testid="change-output"
      onClick={() =>
        onResultChange?.({ options: null, plaintextOutput: 'next output' })
      }
      type="button"
    >
      change output
    </button>
  </>
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

  it('only shows Copied after the clipboard confirms success', async () => {
    let resolveCopy!: (value: boolean) => void;
    const copyPromise = new Promise<boolean>((resolve) => {
      resolveCopy = resolve;
    });
    vi.mocked(copyTextToClipboard).mockReturnValue(copyPromise);
    render(
      <LocaleProvider>
        <MagicBox input="x" sources={[interactive]} />
      </LocaleProvider>,
    );

    const button = (
      await screen.findByTestId('magic-box-result')
    ).querySelector('button.box-copy') as HTMLButtonElement;
    fireEvent.click(button);
    expect(button).toHaveTextContent('Copy');

    await act(async () => {
      resolveCopy(false);
      await copyPromise;
    });

    expect(button).toHaveTextContent('Copy');
  });

  it('keeps the copy label unchanged when the clipboard rejects', async () => {
    vi.mocked(copyTextToClipboard).mockRejectedValue(new Error('denied'));
    render(
      <LocaleProvider>
        <MagicBox input="x" sources={[interactive]} />
      </LocaleProvider>,
    );

    const button = (
      await screen.findByTestId('magic-box-result')
    ).querySelector('button.box-copy') as HTMLButtonElement;
    fireEvent.click(button);
    await act(async () => {
      await Promise.resolve();
    });

    expect(button).toHaveTextContent('Copy');
  });

  it('does not mark a new output copied when an old copy resolves later', async () => {
    let resolveCopy!: (value: boolean) => void;
    const copyPromise = new Promise<boolean>((resolve) => {
      resolveCopy = resolve;
    });
    vi.mocked(copyTextToClipboard).mockReturnValue(copyPromise);
    const changing = source(() =>
      new BoxBuilder('Changing output', 'first output')
        .setTemplate(changingTemplate)
        .build(),
    );

    render(
      <LocaleProvider>
        <MagicBox input="x" sources={[changing]} />
      </LocaleProvider>,
    );

    const card = await screen.findByTestId('magic-box-result');
    const copyButton = card.querySelector(
      'button.box-copy',
    ) as HTMLButtonElement;
    fireEvent.click(copyButton);
    fireEvent.click(await screen.findByTestId('change-output'));
    expect(screen.getByTestId('changing-output')).toHaveTextContent(
      'next output',
    );

    await act(async () => {
      resolveCopy(true);
      await copyPromise;
    });

    expect(copyButton).toHaveTextContent('Copy');
  });

  it('resets Copied when the card output changes', async () => {
    const changing = source(() =>
      new BoxBuilder('Changing output', 'first output')
        .setTemplate(changingTemplate)
        .build(),
    );

    render(
      <LocaleProvider>
        <MagicBox input="x" sources={[changing]} />
      </LocaleProvider>,
    );

    const card = await screen.findByTestId('magic-box-result');
    const copyButton = card.querySelector(
      'button.box-copy',
    ) as HTMLButtonElement;
    fireEvent.click(copyButton);
    await waitFor(() => expect(copyButton).toHaveTextContent('Copied'));

    fireEvent.click(await screen.findByTestId('change-output'));
    expect(copyButton).toHaveTextContent('Copy');
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

describe('template error isolation', () => {
  it('keeps sibling cards available when one template throws', async () => {
    const broken = source(() =>
      new BoxBuilder('Broken', 'broken output')
        .setTemplate(throwingTemplate)
        .build(),
    );
    const healthy = source(() =>
      new BoxBuilder('Healthy', 'healthy output')
        .setTemplate(stableTemplate)
        .build(),
    );

    render(
      <LocaleProvider>
        <MagicBox input="x" sources={[broken, healthy]} />
      </LocaleProvider>,
    );

    expect(await screen.findByTestId('box-template-error')).toBeInTheDocument();
    expect(screen.getByTestId('stable-output')).toHaveTextContent(
      'healthy output',
    );
    expect(
      screen.getAllByTestId('magic-box-result-title')[0],
    ).toHaveTextContent('Broken');
  });

  it('recovers a card when a new input produces a valid template', async () => {
    const changing = source((input) =>
      new BoxBuilder('Changing', input)
        .setTemplate(({ plaintextOutput }) => {
          if (plaintextOutput === 'bad') {
            throw new Error('private template details');
          }
          return <span data-testid="recovered-output">{plaintextOutput}</span>;
        })
        .build(),
    );
    const tree = (input: string) => (
      <LocaleProvider>
        <MagicBox input={input} sources={[changing]} />
      </LocaleProvider>
    );
    const { rerender } = render(tree('bad'));

    expect(await screen.findByTestId('box-template-error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByTestId('box-template-error')).toBeInTheDocument();

    rerender(tree('good'));
    expect(await screen.findByTestId('recovered-output')).toHaveTextContent(
      'good',
    );
  });
});
