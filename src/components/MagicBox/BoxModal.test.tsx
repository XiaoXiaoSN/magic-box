import type { Box, BoxProps } from '@modules/Box';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

describe('<BoxModal />', () => {
  it('closes when clicking the overlay outside the card', () => {
    const onClose = vi.fn();

    render(
      <BoxModal box={box} onClose={onClose} onCopy={vi.fn()} open={true} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Close modal backdrop' }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the modal open when clicking inside the card', () => {
    const onClose = vi.fn();

    render(
      <BoxModal box={box} onClose={onClose} onCopy={vi.fn()} open={true} />,
    );

    fireEvent.click(screen.getByTestId('modal-content'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
