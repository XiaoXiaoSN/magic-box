import { downloadFile } from '@functions/download';
import {
  compareSha256,
  type FileHashResult,
  MAX_HASH_FILE_BYTES,
  type Sha256Comparison,
} from '@functions/fileSha256';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';

type State =
  | { kind: 'running'; name: string }
  | { kind: 'complete'; name: string; digest: string }
  | {
      kind: 'error';
      message: 'fileHash.limit' | 'fileHash.oneFile' | 'fileHash.failed';
    };

const comparisonMessages = {
  match: 'fileHash.match',
  mismatch: 'fileHash.mismatch',
  invalid: 'fileHash.invalidExpected',
} as const satisfies Record<Sha256Comparison, string>;

export default function FileHasher() {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [expected, setExpected] = useState('');

  const stop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  function run(files: FileList | null) {
    if (!files?.length) return;
    stop();
    if (files.length !== 1) {
      setState({ kind: 'error', message: 'fileHash.oneFile' });
      return;
    }
    const file = files[0];
    if (file.size > MAX_HASH_FILE_BYTES) {
      setState({ kind: 'error', message: 'fileHash.limit' });
      return;
    }
    try {
      const worker = new Worker(
        new URL('../../functions/fileSha256.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;
      const complete = (result: FileHashResult) => {
        if (workerRef.current !== worker) return;
        stop();
        setState(
          result.ok
            ? { kind: 'complete', name: file.name, digest: result.digest }
            : { kind: 'error', message: 'fileHash.failed' },
        );
      };
      worker.onmessage = (event: MessageEvent<FileHashResult>) =>
        complete(event.data);
      worker.onerror = () => complete({ ok: false });
      worker.onmessageerror = () => complete({ ok: false });
      setState({ kind: 'running', name: file.name });
      worker.postMessage(file);
    } catch {
      stop();
      setState({ kind: 'error', message: 'fileHash.failed' });
    }
  }

  return (
    <section
      aria-label={t('fileHash.title')}
      className="file-hash-panel"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        run(event.dataTransfer.files);
      }}
    >
      <div className="cloud-actions">
        <input
          hidden
          ref={inputRef}
          type="file"
          onChange={(event) => {
            run(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
        />
        <button
          className="btn-subtle"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          {t('fileHash.choose')}
        </button>
        <span>{t('fileHash.drop')}</span>
      </div>
      {state?.kind === 'running' ? (
        <div className="cloud-actions">
          <span role="status">
            {t('fileHash.running', { name: state.name })}
          </span>
          <button
            className="btn-subtle"
            type="button"
            onClick={() => {
              stop();
              setState(null);
            }}
          >
            {t('fileHash.cancel')}
          </button>
        </div>
      ) : null}
      {state?.kind === 'error' ? <p role="alert">{t(state.message)}</p> : null}
      {state?.kind === 'complete' ? (
        <div>
          <p role="status">{t('fileHash.result', { name: state.name })}</p>
          <code>{state.digest}</code>
          <div className="file-hash-compare">
            <input
              aria-label={t('fileHash.expected')}
              autoComplete="off"
              onChange={(event) => setExpected(event.currentTarget.value)}
              placeholder={t('fileHash.expectedPlaceholder')}
              spellCheck={false}
              value={expected}
            />
            <p aria-live="polite">
              {expected.trim()
                ? t(comparisonMessages[compareSha256(expected, state.digest)])
                : null}
            </p>
          </div>
          <div className="cloud-actions">
            <button
              className="btn-subtle"
              type="button"
              onClick={() =>
                downloadFile(
                  new Blob([`${state.digest}\n`], { type: 'text/plain' }),
                  `${state.name}.sha256`,
                )
              }
            >
              {t('fileHash.download')}
            </button>
            <button
              className="btn-subtle"
              type="button"
              onClick={() => setState(null)}
            >
              {t('fileHash.clear')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
