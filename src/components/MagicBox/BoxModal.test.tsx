import type { Box, BoxProps } from '@modules/Box';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';

import BoxModal from './BoxModal';

const Template = ({ plaintextOutput }: BoxProps) => (
  <div data-testid="modal-content">{plaintextOutput}</div>
);

const box: Box = {
  props: {
    name: 'JSON Output',
    plaintextOutput: '{"key":1}',
    options: { language: 'json' },
    onClick: vi.fn(),
    tag: '{}',
    kind: 'FORMAT',
  },
  boxTemplate: Template,
};

const throwingBox: Box = {
  ...box,
  boxTemplate: () => {
    throw new Error('private template details');
  },
};

describe('<BoxModal />', () => {
  it('closes when clicking the overlay outside the card', () => {
    const onClose = vi.fn();

    render(
      <LocaleProvider>
        <BoxModal box={box} onClose={onClose} onCopy={vi.fn()} open={true} />
      </LocaleProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Close modal backdrop' }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the modal open when clicking inside the card', () => {
    const onClose = vi.fn();

    render(
      <LocaleProvider>
        <BoxModal box={box} onClose={onClose} onCopy={vi.fn()} open={true} />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByTestId('modal-content'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps modal controls usable when a template throws', async () => {
    const onClose = vi.fn();

    render(
      <LocaleProvider>
        <BoxModal
          box={throwingBox}
          onClose={onClose}
          onCopy={vi.fn()}
          open={true}
        />
      </LocaleProvider>,
    );

    expect(await screen.findByTestId('box-template-error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
