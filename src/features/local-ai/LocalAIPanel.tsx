import copyTextToClipboard from '@functions/clipboard';
import { useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { localAIMessages } from './messages';
import { MAX_INPUT_CHARS, MODEL, MODEL_CACHE, RUNTIME_CACHE } from './modelCatalog';
import type { AILanguage, AITask } from './types';
import { isBusy } from './types';
import { useLocalAI } from './useLocalAI';

interface Props {
  input: string;
  onPasteInput: (value: string) => void;
}

export default function LocalAIPanel({ input, onPasteInput }: Props) {
  const { locale } = useLocale();
  const m = localAIMessages[locale];
  const { client, state } = useLocalAI();
  const [task, setTask] = useState<AITask>('ask');
  const [language, setLanguage] = useState<AILanguage>('en');
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const busy = isBusy(state.phase);

  // Reset only the clipboard acknowledgement, never restart inference when
  // an input, task or locale changes. The submitted snapshot stays visible.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the acknowledgement when output changes
  useEffect(() => { setCopied(false); }, [state.output]);

  const prepare = () => {
    if (typeof navigator.storage?.persist === 'function') {
      void navigator.storage.persist().catch(() => false);
    }
    client.prepare();
  };

  const removeDownloads = async () => {
    if (!window.confirm(m.removeConfirm)) return;
    client.reset(); // terminate before deleting; this tab cannot repopulate it
    setDeleting(true);
    setNotice('');
    try {
      if (!('caches' in window)) throw new Error('storage');
      await Promise.all([caches.delete(MODEL_CACHE), caches.delete(RUNTIME_CACHE)]);
      setNotice(m.removed);
    } catch {
      setNotice(m.errors.storage);
    } finally {
      setDeleting(false);
    }
  };

  const copy = async () => {
    try {
      const ok = await copyTextToClipboard(state.output);
      setCopied(ok);
      if (!ok) setNotice(m.copyFailed);
    } catch {
      setNotice(m.copyFailed);
    }
  };

  return (
    <section className="box-card local-ai-panel" aria-label={m.title} data-testid="local-ai-panel">
      <div className="box-head">
        <span className="box-title">{m.title}</span>
        <span className="box-kind">WebGPU</span>
      </div>
      <div className="box-body local-ai-body">
        <p className="local-ai-hint">{MODEL.name} · {MODEL.dtype} · {MODEL.license}</p>
        <p className="local-ai-hint">{m.inspectHint}</p>
        <div className="local-ai-actions">
          <button className="btn-subtle" disabled={busy || deleting || state.loaded} onClick={() => client.inspect()} type="button">
            {m.inspect}
          </button>
          {state.info && !state.loaded ? (
            <button className="btn-subtle" disabled={busy || deleting} onClick={prepare} type="button">
              {m.prepare}
            </button>
          ) : null}
        </div>
        {state.info ? (
          <div className="local-ai-hint">
            <p>{m.download}: {new Intl.NumberFormat(locale === 'tw' ? 'zh-TW' : 'en', { maximumFractionDigits: 1 }).format(state.info.bytes / 1024 / 1024)} MiB</p>
            {state.info.cached ? <p>{m.cached}</p> : null}
            <p>{m.runtimeExtra}</p>
          </div>
        ) : null}
        <div className="local-ai-controls">
          <label>
            {m.task}
            <select className="select" value={task} disabled={busy} onChange={(event) => setTask(event.target.value as AITask)}>
              {(Object.keys(m.tasks) as AITask[]).map((value) => <option key={value} value={value}>{m.tasks[value]}</option>)}
            </select>
          </label>
          {task === 'translate' ? (
            <label>
              {m.language}
              <select className="select" value={language} disabled={busy} onChange={(event) => setLanguage(event.target.value as AILanguage)}>
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </label>
          ) : null}
        </div>
        <div className="local-ai-actions">
          <button className="btn-subtle" data-testid="local-ai-run" disabled={!state.loaded || busy || deleting || !input.trim() || input.length > MAX_INPUT_CHARS} onClick={() => {
            setNotice('');
            client.generate({ input, task, language: task === 'translate' ? language : locale === 'tw' ? 'zh-TW' : 'en' });
          }} type="button">{m.run}</button>
          {busy ? <button className="btn-subtle" onClick={() => client.stop()} disabled={state.phase === 'stopping'} type="button">{m.stop}</button> : null}
        </div>
        <p role="status">{m.phases[state.phase]}</p>
        {state.progress ? (
          <div className="local-ai-progress">
            <progress aria-label={m.phases.loading} max={100} value={state.progress.percent ?? undefined} />
            <span>{state.progress.file}</span>
          </div>
        ) : null}
        {state.error ? <p className="local-ai-error" role="alert">{m.errors[state.error]}</p> : null}
        {input.length > MAX_INPUT_CHARS ? <p role="alert">{m.errors.inputLimit}</p> : null}
        {notice ? <p role="status">{notice}</p> : null}
        {state.submitted ? <details className="local-ai-hint"><summary>{m.submitted} · {m.tasks[state.submitted.task]}</summary><p className="local-ai-output">{state.submitted.input}</p></details> : null}
        {state.output ? (
          <div>
            {state.phase !== 'complete' ? <p className="local-ai-hint">{m.partial}</p> : null}
            {/* Text only: no HTML, remote images, executable links or tools. */}
            <div className="local-ai-output" data-testid="local-ai-output" aria-busy={busy}>{state.output}</div>
            <div className="local-ai-actions">
              <button className="box-copy" disabled={busy} onClick={() => void copy()} type="button">{copied ? m.copied : m.copy}</button>
              <button className="box-copy" disabled={busy} onClick={() => onPasteInput(state.output)} type="button">{m.paste}</button>
            </div>
          </div>
        ) : null}
        <hr />
        <div className="local-ai-actions">
          <button className="btn-subtle" disabled={deleting} onClick={() => client.release()} type="button">{m.release}</button>
          <button className="btn-subtle" disabled={busy || deleting} onClick={() => void removeDownloads()} type="button">{m.remove}</button>
        </div>
        <p className="local-ai-hint">{m.limitations}</p>
      </div>
    </section>
  );
}
