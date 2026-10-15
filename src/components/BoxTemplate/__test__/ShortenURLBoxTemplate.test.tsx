import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../../contexts/LocaleContext';
import ShortenURLBoxTemplate from '../ShortenURLBoxTemplate';

describe('ShortenURLBoxTemplate', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  const renderTemplate = (
    props: Partial<React.ComponentProps<typeof ShortenURLBoxTemplate>> = {},
  ) =>
    render(
      <LocaleProvider>
        <ShortenURLBoxTemplate
          name="Shorten URL"
          onClick={vi.fn()}
          options={null}
          plaintextOutput="https://example.com"
          {...props}
        />
      </LocaleProvider>,
    );

  it('waits for the explicit action before sending the request', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ shorten: 'abc' }),
    });
    renderTemplate();

    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('shorten-url-action'));

    expect(await screen.findByTestId('shorten-url-result')).toHaveTextContent(
      'https://10oz.tw/abc',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors and leaves preview inert', async () => {
    renderTemplate({ plaintextOutput: 'example.com' });
    fireEvent.click(screen.getByTestId('shorten-url-action'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a valid HTTP(S) URL.',
    );
    expect(fetchMock).not.toHaveBeenCalled();

    renderTemplate({
      options: { preview: true },
      plaintextOutput: 'https://example.com',
    });
    const action = screen.getAllByTestId('shorten-url-action')[1];
    expect(action).toBeDisabled();
    fireEvent.click(action);
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(screen.getByTestId('shorten-url-preview')).toBeInTheDocument();
  });

  it('shows request failures without throwing through the card', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    renderTemplate();
    fireEvent.click(screen.getByTestId('shorten-url-action'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The short URL request failed.',
    );
  });
});
