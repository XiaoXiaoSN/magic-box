import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import QRCodeReader from './index';

vi.mock('./QRCodeReaderWrapper', () => ({
  default: ({
    closeLabel,
    setShowReader,
  }: {
    closeLabel: string;
    setShowReader: (show: boolean) => void;
  }) => (
    <button
      aria-label={closeLabel}
      data-testid="qr-reader-close-button"
      onClick={() => setShowReader(false)}
      type="button"
    >
      Close
    </button>
  ),
}));

describe('QRCodeReader', () => {
  it('opens an accessible dialog, preserves camera clicks, and restores focus', async () => {
    const setUserInput = vi.fn();
    render(
      <QRCodeReader
        closeLabel="Close QR scanner"
        dialogLabel="QR scanner"
        openLabel="Open QR scanner"
        setUserInput={setUserInput}
      />,
    );

    const openButton = screen.getByRole('button', {
      name: 'Open QR scanner',
    });
    openButton.focus();
    fireEvent.click(openButton);

    const dialog = await screen.findByRole('dialog', { name: 'QR scanner' });
    fireEvent.click(screen.getByTestId('qr-reader-container'));
    expect(screen.getByRole('dialog', { name: 'QR scanner' })).toBe(dialog);

    fireEvent.click(dialog);
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'QR scanner' }),
      ).not.toBeInTheDocument(),
    );
    expect(openButton).toHaveFocus();
  });

  it('exposes labelled keyboard controls and closes on Escape', async () => {
    render(
      <QRCodeReader
        closeLabel="Close QR scanner"
        dialogLabel="QR scanner"
        openLabel="Open QR scanner"
        setUserInput={vi.fn()}
      />,
    );

    const openButton = screen.getByRole('button', {
      name: 'Open QR scanner',
    });
    expect(openButton).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(openButton);

    const dialog = await screen.findByRole('dialog', { name: 'QR scanner' });
    const closeButton = screen.getByRole('button', {
      name: 'Close QR scanner',
    });
    closeButton.focus();
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(dialog, { code: 'Escape', key: 'Escape' });

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'QR scanner' }),
      ).not.toBeInTheDocument(),
    );
  });
});
