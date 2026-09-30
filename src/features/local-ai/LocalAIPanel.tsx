import copyTextToClipboard from '@functions/clipboard';
import { activateLocalAIPrivacy } from '@functions/localAIPrivacy';
import { useEffect, useRef, useState } from 'react';
import { useIsBoxPreview } from '../../contexts/BoxPreviewContext';
import { useLocale } from '../../contexts/LocaleContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { deleteLocalAIDownloads } from './caches';
import type { WorkerPort } from './client';
import { resolveAILanguage } from './labels';
import './localAI.css';
import LocalAISettingsDialog from './LocalAISettingsDialog';
import { localAIMessages } from './messages';
import { MAX_INPUT_CHARS, MODEL } from './modelCatalog';
import { describePhase, describeSetupStep } from './setupStep';
import { isBusy } from './types';
import { useLocalAI } from './useLocalAI';

interface Props {
  // Injected by tests so the panel can be driven without a module worker.
  createWorker?: () => WorkerPort;
  // Called once per settled generation (never per streamed token) so the host
  // can publish the result without re-rendering the whole box list on every
  // token. The panel itself stays unaware of the Box contract.
  onOutput?: (text: string) => void;
  // The text typed before `::ai` in the magic input. When it is non-empty it IS
  // the prompt, so the box drops its own textarea and the magic input stays the
  // single place the prompt is edited.
  sourceInput?: string;
}

const GearIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="15"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="15"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LocalAIPanel = ({
  createWorker,
  onOutput,
  sourceInput,
}: Props): React.JSX.Element => {
  const { locale } = useLocale();
  const m = localAIMessages[locale];
  const { prefs } = usePreferences();
  // Opening this box IS the request to use local AI, so it answers "can this
  // device run it, and how big is it" by itself instead of charging a click for
  // a question the user already asked. The check reads metadata only; the
  // weights stay behind the size-labelled button below.
  const preview = useIsBoxPreview();
  const { client, state } = useLocalAI({
    createWorker,
    autoInspect: prefs.aiAutoCheck && !preview,
  });
  const [draft, setDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // A resolved clipboard write must not mark a newer output as copied.
  const copySequence = useRef(0);
  // The last host prompt that was actually submitted. It suppresses a second
  // run of the same text — including the re-run the auto-run effect would
  // otherwise fire the moment a manual run settles.
  const lastRunRef = useRef<string | null>(null);
  // Edge of `state.loaded`, so a model that was released and loaded again
  // re-arms the carried prompt instead of looking inert.
  const wasLoadedRef = useRef(false);

  const busy = isBusy(state.phase);
  // One glance-level signal, so the wording next to it can stay muted.
  const tone = state.error
    ? 'is-error'
    : busy
      ? 'is-busy'
      : state.loaded
        ? 'is-ready'
        : '';
  const hostPrompt = (sourceInput ?? '').trim();
  const prompt = hostPrompt || draft;
  const task = prefs.aiTask;
  const language = resolveAILanguage(prefs.aiLanguage, locale);
  const overLimit = prompt.length > MAX_INPUT_CHARS;
  // The host's callback identity is not stable; keep it out of effect deps so a
  // parent re-render cannot republish the same output.
  const onOutputRef = useRef(onOutput);
  onOutputRef.current = onOutput;

  // Mounting the box is the explicit intent to use local AI, so close the
  // telemetry gate here rather than waiting for a model download.
  useEffect(() => {
    activateLocalAIPrivacy();
  }, []);

  // Reset only the clipboard acknowledgement when a new output arrives; never
  // restart inference because the draft, task or locale changed.
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.output is the trigger, not a read dependency
  useEffect(() => {
    ++copySequence.current;
    setCopied(false);
    setCopyFailed(false);
  }, [state.output]);

  // Publish only settled text. Streaming deltas stay local to this component.
  useEffect(() => {
    if (state.phase !== 'complete' && state.phase !== 'stopped') return;
    onOutputRef.current?.(state.output);
  }, [state.phase, state.output]);

  // A prompt carried in by `::ai` runs on its own ONLY when the model is
  // already loaded in this tab — which took two deliberate clicks — and only
  // once per distinct prompt. It never downloads anything, and `state.phase` is
  // a dependency so the latest text still runs after an in-flight generation
  // settles instead of being dropped.
  useEffect(() => {
    if (state.loaded && !wasLoadedRef.current) lastRunRef.current = null;
    wasLoadedRef.current = state.loaded;
    if (!prefs.aiAutoRun) return;
    if (!hostPrompt || hostPrompt.length > MAX_INPUT_CHARS) return;
    if (!state.loaded || isBusy(state.phase)) return;
    if (lastRunRef.current === hostPrompt) return;
    if (client.generate({ input: hostPrompt, task, language })) {
      lastRunRef.current = hostPrompt;
    }
  }, [
    client,
    hostPrompt,
    language,
    prefs.aiAutoRun,
    state.loaded,
    state.phase,
    task,
  ]);

  // One control, one job: it performs the next setup step rather than sending
  // the user into the settings dialog to find it.
  const step = describeSetupStep(state, locale);

  const advanceSetup = () => {
    if (!step) return;
    setNotice('');
    if (step.action === 'inspect') {
      client.inspect();
      return;
    }
    // The click IS the consent: the label carries the byte count and the note
    // names the sources. A labelled action, not a checkbox answered earlier for
    // reasons the user no longer has in front of them.
    prepare();
  };

  const runPrompt = () => {
    setNotice('');
    // Recorded even for a draft run (as null) so switching back to a host
    // prompt still auto-runs it once.
    lastRunRef.current = hostPrompt || null;
    client.generate({ input: prompt, task, language });
  };

  const prepare = () => {
    // Best effort: a persisted origin is far less likely to have the ~500 MB of
    // weights evicted between visits.
    if (typeof navigator.storage?.persist === 'function') {
      void navigator.storage.persist().catch(() => false);
    }
    setNotice('');
    client.prepare();
  };

  const removeDownloads = async () => {
    if (!window.confirm(m.removeConfirm)) return;
    // Terminate first: this tab must not be able to repopulate the cache it is
    // about to delete. Other tabs still can, hence the warning in the prompt.
    client.reset();
    setDeleting(true);
    setNotice('');
    try {
      await deleteLocalAIDownloads();
      setNotice(m.removed);
    } catch {
      setNotice(m.errors.storage);
    } finally {
      setDeleting(false);
    }
  };

  const copyOutput = async () => {
    const sequence = ++copySequence.current;
    try {
      const ok = await copyTextToClipboard(state.output);
      if (sequence !== copySequence.current) return;
      setCopied(ok);
      setCopyFailed(!ok);
    } catch {
      if (sequence === copySequence.current) setCopyFailed(true);
    }
  };

  return (
    <div className="local-ai" data-testid="local-ai-panel">
      <div className="local-ai-bar">
        <span aria-hidden="true" className={`local-ai-dot ${tone}`} />
        <span className="local-ai-model">
          {MODEL.name} · {m.tasks[task]}
        </span>
        <span
          className="local-ai-state"
          data-testid="local-ai-status"
          role="status"
        >
          {describePhase(state, locale)}
        </span>
        <button
          aria-label={m.settings}
          className="local-ai-gear"
          data-testid="local-ai-open-settings"
          onClick={(event) => {
            // Keep the enclosing BoxCard from treating this as a card copy.
            event.stopPropagation();
            setSettingsOpen(true);
          }}
          title={m.settings}
          type="button"
        >
          <GearIcon />
        </button>
      </div>

      {hostPrompt ? (
        <p className="local-ai-prompt" data-testid="local-ai-prompt">
          {hostPrompt}
        </p>
      ) : (
        <div className="local-ai-input">
          <textarea
            ref={inputRef}
            autoComplete="off"
            data-testid="local-ai-input"
            disabled={busy}
            name="localAIInput"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={m.placeholder}
            rows={4}
            spellCheck={false}
            value={draft}
          />
        </div>
      )}

      <div className="local-ai-actions">
        {step ? (
          <button
            className="local-ai-button primary"
            data-testid="local-ai-setup"
            disabled={busy || deleting}
            onClick={advanceSetup}
            type="button"
          >
            {step.label}
          </button>
        ) : (
          <button
            className="local-ai-button primary"
            data-testid="local-ai-run"
            disabled={busy || deleting || !prompt.trim() || overLimit}
            onClick={runPrompt}
            type="button"
          >
            {m.run}
          </button>
        )}
        {/* Not while inspecting: the box starts that check by itself, and a
            handful of metadata requests is not an operation worth offering to
            abort. Stop belongs to the work the user asked for — the download
            and the generation. */}
        {busy && state.phase !== 'inspecting' ? (
          <button
            className="local-ai-button"
            data-testid="local-ai-stop"
            disabled={state.phase === 'stopping'}
            onClick={() => client.stop()}
            type="button"
          >
            {m.stop}
          </button>
        ) : null}
        {!hostPrompt && draft.length > 0 ? (
          <span className="local-ai-count">
            {draft.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()}
          </span>
        ) : null}
      </div>

      {step?.note ? (
        <p className="local-ai-hint" data-testid="local-ai-setup-note">
          {step.note}
        </p>
      ) : null}

      {state.progress ? (
        <div className="local-ai-progress">
          <span>{state.progress.file}</span>
          <progress
            aria-label={m.downloading}
            max={100}
            value={state.progress.percent ?? undefined}
          />
        </div>
      ) : null}
      {state.error ? (
        <p className="local-ai-error" data-testid="local-ai-error" role="alert">
          {m.errors[state.error]}
        </p>
      ) : null}
      {overLimit ? (
        <p className="local-ai-error" role="alert">
          {m.errors.inputLimit}
        </p>
      ) : null}
      {state.phase === 'stopped' && state.output ? (
        <p className="local-ai-note">{m.stoppedNote}</p>
      ) : null}

      {state.submitted ? (
        <details className="local-ai-submitted">
          <summary>
            {m.submitted} · {m.tasks[state.submitted.task]}
          </summary>
          <pre>{state.submitted.input}</pre>
        </details>
      ) : null}

      {state.output ? (
        <div className="local-ai-result">
          {state.phase !== 'complete' ? (
            <p className="local-ai-note">{m.partial}</p>
          ) : null}
          {/* Text only: no HTML, remote images, executable links or tools. */}
          <pre aria-busy={busy} data-testid="local-ai-output">
            {state.output}
          </pre>
          <div className="local-ai-actions">
            <button
              className="local-ai-button"
              disabled={busy}
              onClick={(event) => {
                // Keep the enclosing BoxCard from treating this as a card copy.
                event.stopPropagation();
                void copyOutput();
              }}
              type="button"
            >
              {copied ? m.copied : m.copy}
            </button>
            {hostPrompt ? null : (
              <button
                className="local-ai-button"
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation();
                  setDraft(state.output);
                  inputRef.current?.focus();
                }}
                type="button"
              >
                {m.useOutput}
              </button>
            )}
          </div>
          {copyFailed ? (
            <p className="local-ai-error" role="alert">
              {m.copyFailed}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="local-ai-foot">
        {hostPrompt ? m.privacyHost : m.privacyShort}
      </p>

      <LocalAISettingsDialog
        deleting={deleting}
        notice={notice}
        onClose={() => setSettingsOpen(false)}
        promptFromInput={hostPrompt !== ''}
        onRelease={() => client.release()}
        onRemove={() => void removeDownloads()}
        open={settingsOpen}
        state={state}
      />
    </div>
  );
};

export default LocalAIPanel;
