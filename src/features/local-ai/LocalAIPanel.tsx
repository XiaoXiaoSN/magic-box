import copyTextToClipboard from '@functions/clipboard';
import { activateLocalAIPrivacy } from '@functions/localAIPrivacy';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import type { WorkerPort } from './client';
import './localAI.css';
import { localAIMessages } from './messages';
import {
  MAX_INPUT_CHARS,
  MODEL,
  MODEL_CACHE,
  RUNTIME_CACHE,
} from './modelCatalog';
import type { AILanguage, AITask } from './types';
import { isBusy } from './types';
import { useLocalAI } from './useLocalAI';

interface Props {
  // Injected by tests so the panel can be driven without a module worker.
  createWorker?: () => WorkerPort;
  // Called once per settled generation (never per streamed token) so the host
  // can publish the result without re-rendering the whole box list on every
  // token. The panel itself stays unaware of the Box contract.
  onOutput?: (text: string) => void;
}

const LANGUAGES: { value: AILanguage; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const LocalAIPanel = ({ createWorker, onOutput }: Props): React.JSX.Element => {
  const { locale } = useLocale();
  const m = localAIMessages[locale];
  const { client, state } = useLocalAI({ createWorker });
  const [input, setInput] = useState('');
  const [task, setTask] = useState<AITask>('ask');
  const [language, setLanguage] = useState<AILanguage>(
    locale === 'tw' ? 'zh-TW' : 'en',
  );
  const [consent, setConsent] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // A resolved clipboard write must not mark a newer output as copied.
  const copySequence = useRef(0);
  const busy = isBusy(state.phase);
  const overLimit = input.length > MAX_INPUT_CHARS;
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
  }, [state.output]);

  // Publish only settled text. Streaming deltas stay local to this component.
  useEffect(() => {
    if (state.phase !== 'complete' && state.phase !== 'stopped') return;
    onOutputRef.current?.(state.output);
  }, [state.phase, state.output]);

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
      if (!('caches' in window)) throw new Error('storage');
      await Promise.all([
        caches.delete(MODEL_CACHE),
        caches.delete(RUNTIME_CACHE),
      ]);
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
      if (!ok) setNotice(m.copyFailed);
    } catch {
      if (sequence === copySequence.current) setNotice(m.copyFailed);
    }
  };

  const sizeFormatter = new Intl.NumberFormat(
    locale === 'tw' ? 'zh-TW' : 'en',
    { maximumFractionDigits: 1 },
  );

  return (
    <div className="local-ai" data-testid="local-ai-panel">
      <p className="local-ai-note">{m.privacy}</p>

      <div className="local-ai-model">
        <p className="local-ai-note">
          {MODEL.name} · {MODEL.dtype} · {MODEL.license} ·{' '}
          <a
            href={`https://huggingface.co/${MODEL.id}/tree/${MODEL.revision}`}
            rel="noreferrer"
            target="_blank"
          >
            {m.source}
          </a>
        </p>
        <p className="local-ai-note">{m.inspectHint}</p>
        <div className="local-ai-actions">
          <button
            className="local-ai-button"
            data-testid="local-ai-inspect"
            disabled={busy || deleting || state.loaded}
            onClick={() => {
              setNotice('');
              client.inspect();
            }}
            type="button"
          >
            {m.inspect}
          </button>
        </div>
        {state.info ? (
          <>
            <p className="local-ai-note" data-testid="local-ai-size">
              {m.download}:{' '}
              {sizeFormatter.format(state.info.bytes / 1024 / 1024)} MiB
            </p>
            {state.info.cached ? (
              <p className="local-ai-note">{m.cached}</p>
            ) : null}
            <p className="local-ai-note">{m.runtimeExtra}</p>
            <label className="local-ai-consent">
              <input
                checked={consent}
                disabled={busy || deleting || state.loaded}
                onChange={(event) => setConsent(event.target.checked)}
                type="checkbox"
              />
              {m.consent}
            </label>
            <div className="local-ai-actions">
              <button
                className="local-ai-button"
                data-testid="local-ai-prepare"
                disabled={!consent || busy || deleting || state.loaded}
                onClick={prepare}
                type="button"
              >
                {m.prepare}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="local-ai-fields">
        <label>
          {m.task}
          <select
            disabled={busy}
            onChange={(event) => setTask(event.target.value as AITask)}
            value={task}
          >
            {(Object.keys(m.tasks) as AITask[]).map((value) => (
              <option key={value} value={value}>
                {m.tasks[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {m.language}
          <select
            disabled={busy}
            onChange={(event) => setLanguage(event.target.value as AILanguage)}
            value={language}
          >
            {LANGUAGES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="local-ai-input">
        <textarea
          ref={inputRef}
          autoComplete="off"
          data-testid="local-ai-input"
          disabled={busy}
          name="localAIInput"
          onChange={(event) => setInput(event.target.value)}
          placeholder={m.placeholder}
          rows={5}
          spellCheck={false}
          value={input}
        />
      </div>
      <p className="local-ai-note">
        {input.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()}
      </p>
      <p className="local-ai-note">{m.caution}</p>

      <div className="local-ai-actions">
        <button
          className="local-ai-button primary"
          data-testid="local-ai-run"
          disabled={
            !state.loaded || busy || deleting || !input.trim() || overLimit
          }
          onClick={() => {
            setNotice('');
            client.generate({ input, task, language });
          }}
          type="button"
        >
          {m.run}
        </button>
        <button
          className="local-ai-button"
          data-testid="local-ai-stop"
          disabled={!busy || state.phase === 'stopping'}
          onClick={() => client.stop()}
          type="button"
        >
          {m.stop}
        </button>
      </div>

      <p className="local-ai-note" data-testid="local-ai-status" role="status">
        {m.phases[state.phase]}
      </p>
      {state.progress ? (
        <div className="local-ai-progress">
          <span>{state.progress.file}</span>
          <progress
            aria-label={m.phases.loading}
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
      {notice ? (
        <p className="local-ai-note" role="status">
          {notice}
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
            <button
              className="local-ai-button"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                setInput(state.output);
                inputRef.current?.focus();
              }}
              type="button"
            >
              {m.useOutput}
            </button>
          </div>
        </div>
      ) : null}

      <hr />
      <div className="local-ai-actions">
        <button
          className="local-ai-button"
          disabled={deleting}
          onClick={() => client.release()}
          type="button"
        >
          {m.release}
        </button>
        <button
          className="local-ai-button"
          disabled={busy || deleting}
          onClick={() => void removeDownloads()}
          type="button"
        >
          {m.remove}
        </button>
      </div>
      <p className="local-ai-note">{m.limitations}</p>
    </div>
  );
};

export default LocalAIPanel;
