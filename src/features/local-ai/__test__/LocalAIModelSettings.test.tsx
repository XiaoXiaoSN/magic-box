import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../../contexts/LocaleContext';
import { PreferencesProvider } from '../../../contexts/PreferencesContext';
import LocalAIModelSettings from '../LocalAIModelSettings';
import { MODEL_CACHE, RUNTIME_CACHE } from '../modelCatalog';
import { FakeWorker } from './fakeWorker';

const setup = () => {
  const workers: FakeWorker[] = [];
  render(
    <LocaleProvider>
      <PreferencesProvider>
        <LocalAIModelSettings
          createWorker={() => {
            const worker = new FakeWorker();
            workers.push(worker);
            return worker;
          }}
        />
      </PreferencesProvider>
    </LocaleProvider>,
  );
  return workers;
};

describe('LocalAIModelSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('spawns no worker just by rendering the settings page', () => {
    const workers = setup();
    expect(workers).toHaveLength(0);
    expect(screen.getByTestId('settings-ai-status')).toHaveTextContent(
      'Not loaded',
    );
  });

  it('provisions the model through the same steps the box uses', () => {
    const workers = setup();
    fireEvent.click(screen.getByTestId('settings-ai-setup'));
    expect(workers[0].commands).toEqual([{ type: 'inspect', id: 1 }]);

    workers[0].reply({
      type: 'available',
      info: { bytes: 490_035_255, cached: false },
    });
    // Identical wording to the box: one action, one name, one quoted size.
    expect(screen.getByTestId('settings-ai-setup')).toHaveTextContent(
      'Download model · 467.3 MiB',
    );

    fireEvent.click(screen.getByTestId('settings-ai-setup'));
    expect(workers[0].commands.at(-1)).toEqual({ type: 'prepare', id: 2 });

    workers[0].reply({ type: 'ready' });
    expect(screen.getByTestId('settings-ai-setup')).toBeDisabled();
    // What survives leaving this page is the download, not the session.
    expect(screen.getByText(/loads it from the local cache/)).toBeVisible();
  });

  it('surfaces a sanitized worker error without spawning anything else', () => {
    const workers = setup();
    fireEvent.click(screen.getByTestId('settings-ai-setup'));
    workers[0].reply({ type: 'error', code: 'unsupported' });
    expect(screen.getByTestId('settings-ai-error')).toHaveTextContent(
      'shader-f16',
    );
    expect(workers[0].terminated).toBe(true);
    expect(workers).toHaveLength(1);
  });

  it('deletes only this feature’s caches, after terminating its worker', async () => {
    const remove = vi.fn(async () => true);
    vi.stubGlobal('caches', { delete: remove });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const workers = setup();
    fireEvent.click(screen.getByTestId('settings-ai-setup'));
    fireEvent.click(screen.getByText('Delete'));

    expect(workers[0].terminated).toBe(true);
    expect(remove.mock.calls.flat()).toEqual([MODEL_CACHE, RUNTIME_CACHE]);
    expect(await screen.findByText('AI downloads deleted.')).toBeVisible();
  });

  it('can stop a download it started, like the box can', () => {
    const workers = setup();
    fireEvent.click(screen.getByTestId('settings-ai-setup'));
    // The check is not the user's to stop; the download is.
    expect(screen.queryByTestId('settings-ai-stop')).not.toBeInTheDocument();
    workers[0].reply({
      type: 'available',
      info: { bytes: 490_035_255, cached: false },
    });
    fireEvent.click(screen.getByTestId('settings-ai-setup'));
    fireEvent.click(screen.getByTestId('settings-ai-stop'));
    expect(workers[0].terminated).toBe(true);
    expect(screen.getByTestId('settings-ai-status')).toHaveTextContent(
      'Stopped',
    );
  });

  it('does not delete anything when the confirmation is declined', () => {
    const remove = vi.fn(async () => true);
    vi.stubGlobal('caches', { delete: remove });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    setup();
    fireEvent.click(screen.getByText('Delete'));
    expect(remove).not.toHaveBeenCalled();
  });
  it('stays passive even with the box preference on', () => {
    localStorage.setItem(
      LOCAL_PREFS_KEY,
      JSON.stringify({ aiAutoCheck: true }),
    );
    const workers = setup();
    // Unlike the box, this section renders for anyone who opens Settings, so
    // its presence is not a request to use local AI. `aiAutoCheck` is about
    // opening a box; nothing here may turn a settings visit into traffic.
    expect(workers).toHaveLength(0);
    expect(screen.getByTestId('settings-ai-setup')).toHaveTextContent(
      'Check device & model',
    );
  });
});
