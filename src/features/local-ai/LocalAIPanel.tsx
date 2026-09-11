import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import copyTextToClipboard from '../../functions/clipboard';
import { isBusy, LocalAIClient } from './client';
import { type Language, MODEL, type Task } from './protocol';
import { localAIStrings } from './strings';

export default function LocalAIPanel({ client: suppliedClient }: { client?: LocalAIClient }) {
  const { locale } = useLocale();
  const text = localAIStrings(locale);
  const [client] = useState(() => suppliedClient ?? new LocalAIClient());
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const [input, setInput] = useState('');
  const [task, setTask] = useState<Task>('ask');
  const [language, setLanguage] = useState<Language>(locale === 'tw' ? 'zh-TW' : 'en');
  const [consent, setConsent] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copySequence = useRef(0);
  const busy = isBusy(state);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { ++copySequence.current; client.release(); };
  }, [client]);

  // Clipboard completion cannot mark a subsequent output as copied.
  const copyOutput = async () => {
    const sequence = ++copySequence.current;
    try {
      const copied = await copyTextToClipboard(state.text);
      if (sequence === copySequence.current) setCopyStatus(copied ? 'copied' : 'failed');
    } catch {
      if (sequence === copySequence.current) setCopyStatus('failed');
    }
  };
  const resetCopy = () => { ++copySequence.current; setCopyStatus('idle'); };

  return (
    <div className="home local-ai" data-testid="local-ai">
      <div className="home-inner">
        <div className="home-col">
          <div className="home-col-head">
            <span aria-hidden="true" className="dot" />
            <span>{text.title}</span><span className="box-kind">{text.experimental}</span>
          </div>
          <p className="local-ai-note">{text.privacy}</p>
          <form onSubmit={(event) => {
            event.preventDefault();
            resetCopy();
            client.generate({ input, task, language });
          }}>
            <div className="local-ai-fields">
              <label>{text.task}
                <select value={task} disabled={busy} onChange={(event) => setTask(event.target.value as Task)}>
                  {Object.entries(text.tasks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>{text.language}
                <select value={language} disabled={busy} onChange={(event) => setLanguage(event.target.value as Language)}>
                  <option value="zh-TW">繁體中文</option><option value="en">English</option><option value="ja">日本語</option>
                </select>
              </label>
            </div>
            <div className="input-card">
              <textarea ref={inputRef} aria-label={text.input} data-testid="local-ai-input"
                value={input} onChange={(event) => setInput(event.target.value)} disabled={busy}
                rows={8} placeholder={text.placeholder}
                autoComplete="off" spellCheck={false} />
            </div>
            <p className="local-ai-note">{input.length.toLocaleString()} / {MODEL.maxInputChars.toLocaleString()}</p>
            <p className="local-ai-note">{text.caution}</p>
            <div className="local-ai-actions">
              <button className="local-ai-button primary" type="submit" disabled={!state.ready || busy || !input.trim()}>{text.run}</button>
              <button className="local-ai-button" type="button" disabled={!busy || state.phase === 'deleting'} onClick={() => client.stop()}>{text.stop}</button>
            </div>
          </form>
          <details className="local-ai-model" open={!state.ready}>
            <summary>Qwen2.5 0.5B</summary>
            <p className="local-ai-note">{text.download}</p>
            <p className="local-ai-note"><a href={`https://huggingface.co/${MODEL.id}/tree/${MODEL.revision}`} target="_blank" rel="noreferrer">{MODEL.id}</a></p>
            <label className="local-ai-consent">
              <input type="checkbox" checked={consent} disabled={busy || state.ready} onChange={(event) => setConsent(event.target.checked)} />
              {text.consent}
            </label>
            <div className="local-ai-actions">
              <button className="local-ai-button" type="button" disabled={!consent || busy || state.ready} onClick={() => { resetCopy(); client.prepare(); }}>{text.prepare}</button>
              <button className="local-ai-button" type="button" disabled={state.phase === 'deleting' || (!state.ready && !busy)} onClick={() => { resetCopy(); client.release(); }}>{text.release}</button>
              <button className="local-ai-button" type="button" disabled={state.phase === 'deleting'} onClick={() => {
                if (window.confirm(text.clearConfirm)) { resetCopy(); void client.clearModel(); }
              }}>{text.clearModel}</button>
            </div>
            <p className="local-ai-note">{text.cacheNote}</p>
          </details>
        </div>
        <div className="home-col">
          <div className="home-col-head"><span aria-hidden="true" className="dot" /><span>{text.output}</span></div>
          <div role="status" className="local-ai-note">{text.status[state.phase]}</div>
          {state.progress ? <div className="local-ai-progress">
            <span>{state.progress.file}</span>
            <progress max={100} value={state.progress.percent ?? undefined} aria-label={state.progress.file} />
          </div> : null}
          {state.error ? <p role="alert" className="local-ai-error">{text.errors[state.error]}</p> : null}
          {state.phase === 'stopped' ? <p className="local-ai-note">{text.stoppedNote}</p> : null}
          <section className="box-card local-ai-result" aria-label={text.output} aria-busy={state.phase === 'generating'}>
            <div className="box-head"><span className="box-title">{text.title}</span>
              <span className="box-actions">
                <button className="box-copy" type="button" disabled={!state.text || busy} onClick={() => { void copyOutput(); }}>{copyStatus === 'copied' ? text.copied : text.copy}</button>
              </span>
            </div>
            <div className="box-body"><pre data-testid="local-ai-output">{state.text}</pre></div>
          </section>
          {copyStatus === 'failed' ? <p role="alert" className="local-ai-error">{text.copyFailed}</p> : null}
          <div className="local-ai-actions">
            <button className="local-ai-button" type="button" disabled={!state.text || busy} onClick={() => {
              setInput(state.text);
              inputRef.current?.focus();
            }}>{text.useOutput}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
