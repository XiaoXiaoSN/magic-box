import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../../contexts/LocaleContext';
import { PreferencesProvider } from '../../../contexts/PreferencesContext';
import LocalAIPanel from '../LocalAIPanel';
import { FakeWorker } from './fakeWorker';

interface SetupOptions {
  onOutput?: (text: string) => void;
  // The text in front of `::ai` in the magic input.
  sourceInput?: string;
}

// One factory per test: the shared-client registry is keyed by it, so each
// test gets its own client while remounts within a test share one.
const setup = ({ onOutput, sourceInput }: SetupOptions = {}) => {
  const workers: FakeWorker[] = [];
  const createWorker = () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  };
  const tree = (input?: string) => (
    <LocaleProvider>
      <PreferencesProvider>
        <LocalAIPanel
          createWorker={createWorker}
          onOutput={onOutput}
          sourceInput={input}
        />
      </PreferencesProvider>
    </LocaleProvider>
  );
  const view = render(tree(sourceInput));
  return Object.assign(workers, {
    // The magic input settled on new text in front of `::ai`.
    retype: (input: string) => view.rerender(tree(input)),
    unmount: view.unmount,
    remount: (input?: string) => render(tree(input ?? sourceInput)),
  });
};

const openSettings = () => {
  fireEvent.click(screen.getByTestId('local-ai-open-settings'));
};

const closeSettings = () => {
  fireEvent.click(screen.getByTestId('local-ai-settings-close'));
};

// Drives the panel to a loaded model the way a user does: one button, one
// click per step. Nothing here touches the settings dialog, which is the point
// of the split — the dialog configures, the box acts.
const loadModel = (workers: FakeWorker[]) => {
  // The box checks itself open, so only the step that costs bytes is a click.
  workers[0].reply({
    type: 'available',
    info: { bytes: 490_035_255, cached: false },
  });
  fireEvent.click(screen.getByTestId('local-ai-setup'));
  workers[0].reply({ type: 'ready' });
};

describe('LocalAIPanel', () => {
  beforeEach(() => {
    // Task, output language, consent and auto-run are persisted preferences;
    // leaking one test's choice into the next would hide a gating regression.
    localStorage.clear();
  });

  it('answers "can this device run it" without charging a click', () => {
    // Opening the box IS the request to use local AI. It checks WebGPU and the
    // local cache by itself; it can never request weights without a click.
    const workers = setup();
    expect(workers[0].commands).toEqual([{ type: 'inspect', id: 1 }]);
    expect(screen.queryByTestId('local-ai-run')).not.toBeInTheDocument();
    expect(screen.queryByTestId('local-ai-settings')).not.toBeInTheDocument();

    workers[0].reply({
      type: 'available',
      info: { bytes: 490_035_255, cached: false },
    });
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
      'Ready to download',
    );
  });

  it('offers no stop button for the check it started by itself', () => {
    // The user pressed nothing, so there is nothing of theirs to abort; Stop
    // belongs to the download and the generation.
    const workers = setup();
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
      'Checking device and model…',
    );
    expect(screen.queryByTestId('local-ai-stop')).not.toBeInTheDocument();
    workers[0].reply({
      type: 'available',
      info: { bytes: 490_035_255, cached: false },
    });
    fireEvent.click(screen.getByTestId('local-ai-setup'));
    // The download is the user's own action, and it can be stopped.
    expect(screen.getByTestId('local-ai-stop')).toBeInTheDocument();
  });

  it('spends the one click it does ask for on the bytes, not on the check', () => {
    const workers = setup();
    expect(workers[0].commands).toEqual([{ type: 'inspect', id: 1 }]);
    workers[0].reply({
      type: 'available',
      info: { bytes: 490_035_255, cached: false },
    });

    // The button now names what the next click costs, and where it comes from.
    expect(screen.getByTestId('local-ai-setup')).toHaveTextContent(
      'Download model · 467.3 MiB',
    );
    expect(screen.getByTestId('local-ai-setup-note')).toHaveTextContent(
      'jsDelivr and Hugging Face',
    );
    expect(workers[0].commands).toHaveLength(1);

    fireEvent.click(screen.getByTestId('local-ai-setup'));
    expect(workers[0].commands.at(-1)).toEqual({ type: 'prepare', id: 2 });
  });

  it('names the sources on every download, not only the first', () => {
    // There is no stored permission to make the disclosure disappear: the note
    // belongs to the click that fetches, and a returning user is committing to
    // the same fetch. Nothing about downloading is answered ahead of time.
    const workers = setup();
    loadModel(workers);
    openSettings();
    expect(screen.queryByTestId('local-ai-consent')).not.toBeInTheDocument();
    closeSettings();

    cleanup();
    const next = setup();
    next[0].reply({
      type: 'available',
      info: { bytes: 490_035_255, cached: false },
    });
    expect(screen.getByTestId('local-ai-setup-note')).toHaveTextContent(
      'jsDelivr and Hugging Face',
    );
  });

  it('offers a load, not a download, when the files are already cached', () => {
    const workers = setup();
    workers[0].reply({
      type: 'available',
      info: { bytes: 490_035_255, cached: true },
    });
    expect(screen.getByTestId('local-ai-setup')).toHaveTextContent(
      'Load model · 467.3 MiB',
    );
    expect(screen.getByTestId('local-ai-setup-note')).toHaveTextContent(
      'found in the cache',
    );
  });

  it('requires a loaded model and non-empty text before generating', () => {
    const workers = setup();
    fireEvent.change(screen.getByTestId('local-ai-input'), {
      target: { value: 'hello' },
    });
    expect(screen.queryByTestId('local-ai-run')).not.toBeInTheDocument();
    loadModel(workers);
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
      'Model ready',
    );
    expect(screen.getByTestId('local-ai-run')).toBeEnabled();
    fireEvent.change(screen.getByTestId('local-ai-input'), {
      target: { value: '   ' },
    });
    expect(screen.getByTestId('local-ai-run')).toBeDisabled();
  });

  it('streams tokens and publishes the settled answer exactly once', () => {
    const onOutput = vi.fn();
    const workers = setup({ onOutput });
    loadModel(workers);
    fireEvent.change(screen.getByTestId('local-ai-input'), {
      target: { value: 'Summarize this' },
    });
    fireEvent.click(screen.getByTestId('local-ai-run'));
    const command = workers[0].commands.at(-1);
    expect(command?.type === 'generate' && command.request.input).toBe(
      'Summarize this',
    );
    workers[0].reply({ type: 'delta', text: 'Par' });
    workers[0].reply({ type: 'delta', text: 'tial' });
    expect(screen.getByTestId('local-ai-output')).toHaveTextContent('Partial');
    // Streaming must not publish to the host on every token.
    expect(onOutput).not.toHaveBeenCalled();
    workers[0].reply({ type: 'complete' });
    expect(onOutput).toHaveBeenCalledTimes(1);
    expect(onOutput).toHaveBeenCalledWith('Partial');
  });

  it('shows a sanitized, actionable message for a worker error code', () => {
    const workers = setup();
    fireEvent.click(screen.getByTestId('local-ai-setup'));
    workers[0].reply({ type: 'error', code: 'unsupported' });
    expect(screen.getByTestId('local-ai-error')).toHaveTextContent(
      'shader-f16',
    );
    expect(workers[0].terminated).toBe(true);
  });

  it('rejects over-long input locally instead of sending it to the worker', () => {
    const workers = setup();
    loadModel(workers);
    const sent = workers[0].commands.length;
    fireEvent.change(screen.getByTestId('local-ai-input'), {
      target: { value: 'x'.repeat(6001) },
    });
    expect(screen.getByTestId('local-ai-run')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('1,024-token');
    expect(workers[0].commands).toHaveLength(sent);
  });

  it('can stop a download and keeps the stop button inert when idle', () => {
    const workers = setup();
    // Nothing is in flight, so there is nothing to stop and no dead button.
    expect(screen.queryByTestId('local-ai-stop')).not.toBeInTheDocument();
    workers[0].reply({ type: 'available', info: { bytes: 100, cached: true } });
    fireEvent.click(screen.getByTestId('local-ai-setup'));
    fireEvent.click(screen.getByTestId('local-ai-stop'));
    expect(workers[0].terminated).toBe(true);
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent('Stopped');
  });

  describe('prompt carried in from the magic input', () => {
    it('uses it instead of a second textarea and never runs unloaded', () => {
      const workers = setup({ sourceInput: 'say hello' });
      expect(screen.queryByTestId('local-ai-input')).not.toBeInTheDocument();
      expect(screen.getByTestId('local-ai-prompt')).toHaveTextContent(
        'say hello',
      );
      // The carried prompt does not change what mounting costs: a metadata
      // check, and nothing that could generate or download.
      expect(workers[0].commands).toEqual([{ type: 'inspect', id: 1 }]);
      expect(workers[0].generates()).toHaveLength(0);
      expect(screen.getByTestId('local-ai-setup')).toBeInTheDocument();
    });

    it('runs once the model is loaded, and only once per prompt', () => {
      const workers = setup({ sourceInput: 'say hello' });
      loadModel(workers);
      const generates = workers[0].generates();
      expect(generates).toHaveLength(1);
      expect(
        generates[0].type === 'generate' && generates[0].request.input,
      ).toBe('say hello');

      workers[0].reply({ type: 'delta', text: 'Hi' });
      workers[0].reply({ type: 'complete' });
      // Settling must not re-submit the same prompt.
      expect(workers[0].generates()).toHaveLength(1);
    });

    it('re-arms after the model is released and loaded again', () => {
      const workers = setup({ sourceInput: 'say hello' });
      loadModel(workers);
      workers[0].reply({ type: 'complete' });
      openSettings();
      fireEvent.click(screen.getByTestId('local-ai-release'));
      closeSettings();

      // Releasing drops the session but keeps the pinned size, so the box is
      // back at the load step rather than at the device check.
      fireEvent.click(screen.getByTestId('local-ai-setup'));
      workers[1].reply({ type: 'ready' });
      // The same prompt is worth running again on a freshly loaded model.
      expect(workers[1].generates()).toHaveLength(1);
    });

    it('stops a run for text the user has since changed, then runs the new text', () => {
      // Regression: a pause while typing settled on a half-written prompt,
      // which ran to the budget while the real prompt queued behind it.
      const workers = setup({ sourceInput: 'Summarize the' });
      loadModel(workers);
      const first = workers[0].commands.at(-1);
      expect(first?.type === 'generate' && first.request.input).toBe(
        'Summarize the',
      );

      workers.retype('Summarize the following report');
      expect(workers[0].commands.at(-1)).toEqual({
        type: 'cancel',
        id: first?.id,
      });
      workers[0].reply({ type: 'cancelled' });
      const next = workers[0].commands.at(-1);
      expect(next?.type === 'generate' && next.request.input).toBe(
        'Summarize the following report',
      );
      // The model stayed loaded: a cooperative stop, not a terminate.
      expect(workers).toHaveLength(1);
    });

    it('does not answer the same prompt again when the box remounts', () => {
      const workers = setup({ sourceInput: 'say hello' });
      loadModel(workers);
      workers[0].reply({ type: 'complete' });
      workers.unmount();
      workers.remount();
      expect(workers[0].generates()).toHaveLength(1);
    });

    it('does not auto-run when the preference is off', () => {
      localStorage.setItem(
        LOCAL_PREFS_KEY,
        JSON.stringify({ aiAutoRun: false }),
      );
      const workers = setup({ sourceInput: 'say hello' });
      loadModel(workers);
      expect(workers[0].generates()).toHaveLength(0);
      fireEvent.click(screen.getByTestId('local-ai-run'));
      expect(workers[0].generates()).toHaveLength(1);
    });

    it('applies the stored task and output language to the request', () => {
      localStorage.setItem(
        LOCAL_PREFS_KEY,
        JSON.stringify({ aiTask: 'translate', aiLanguage: 'ja' }),
      );
      const workers = setup({ sourceInput: 'say hello' });
      loadModel(workers);
      const [command] = workers[0].generates();
      expect(command?.type === 'generate' && command.request).toEqual({
        input: 'say hello',
        task: 'translate',
        language: 'ja',
      });
    });
  });
  it('keeps the draft editable while the model is being checked', () => {
    // Regression: the self-started check locked the only field the user
    // needed, for up to a minute on a slow link.
    setup();
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent('Checking');
    expect(screen.getByTestId('local-ai-input')).toBeEnabled();
  });

  describe('one session per tab', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('keeps a loaded model across a remount', () => {
      // Regression: clearing the input to type the next question, or a visit
      // to Settings, unmounted the box and terminated a ~467 MiB session.
      vi.useFakeTimers();
      const workers = setup();
      loadModel(workers);
      workers.unmount();
      vi.advanceTimersByTime(10_000);
      workers.remount();
      expect(workers[0].terminated).toBe(false);
      expect(workers).toHaveLength(1);
      expect(screen.getByTestId('local-ai-run')).toBeInTheDocument();
    });

    it('releases it once no surface has shown it for the grace period', () => {
      vi.useFakeTimers();
      const workers = setup();
      loadModel(workers);
      workers.unmount();
      vi.advanceTimersByTime(30_000);
      expect(workers[0].terminated).toBe(true);
    });
  });

  describe('checking on open', () => {
    it('stays off the network when the preference is off', () => {
      // The escape hatch for anyone who does not want a mounted box reaching
      // jsDelivr and Hugging Face on its own: the check goes back to a click.
      localStorage.setItem(
        LOCAL_PREFS_KEY,
        JSON.stringify({ aiAutoCheck: false }),
      );
      const workers = setup();
      expect(workers).toHaveLength(0);
      expect(screen.getByTestId('local-ai-setup')).toHaveTextContent(
        'Check device & model',
      );
    });

    it('checks itself open by default', () => {
      const workers = setup();
      // Metadata only — the standing permission never triggers a download.
      expect(workers[0]?.commands).toEqual([{ type: 'inspect', id: 1 }]);
      expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
        'Checking device and model…',
      );

      workers[0].reply({
        type: 'available',
        info: { bytes: 490_035_255, cached: true },
      });
      // The returning user lands on the real next step, not on a check they
      // have already pressed before.
      expect(screen.getByTestId('local-ai-setup')).toHaveTextContent(
        'Load model · 467.3 MiB',
      );
      expect(workers[0].commands).toHaveLength(1);
    });

    it('does not retry a failed check by itself', () => {
      const workers = setup();
      workers[0].reply({ type: 'error', code: 'inspect' });
      expect(screen.getByTestId('local-ai-error')).toBeInTheDocument();
      // A retry loop against two CDNs is the failure mode to avoid; retrying is
      // the button's job. The failed check also released the worker.
      expect(workers).toHaveLength(1);
      expect(workers[0].terminated).toBe(true);
    });

    it('reports downloading and preparing as separate moments', () => {
      const workers = setup();
      workers[0].reply({
        type: 'available',
        info: { bytes: 490_035_255, cached: false },
      });
      fireEvent.click(screen.getByTestId('local-ai-setup'));

      // `prepare` covers the fetch, the ONNX session build and the warm-up.
      // Before any bytes move it is not yet a download.
      expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
        'Preparing model…',
      );
      workers[0].reply({ type: 'progress', progress: 42 });
      expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
        'Downloading model…',
      );
      // One aggregate number, not a file name that flickers per chunk.
      expect(screen.getByTestId('local-ai-progress')).toHaveTextContent('42%');
      workers[0].reply({ type: 'ready' });
      expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
        'Model ready',
      );
    });
  });
});
