import { downloadFile } from '@functions/download';
import type { JsonDiffResult } from '@functions/json/diff';
import { compareTexts } from '@functions/textDiff';
import type { BoxProps } from '@modules/Box';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import CodeBoxTemplate from './CodeBoxTemplate';

function DiffBoxTemplate({
  sourceInput = '',
  options,
  plaintextOutput,
  onClick,
  onResultChange,
  ...props
}: BoxProps) {
  const { t } = useLocale();
  const { diffTarget, diffError, diffPatch, ...otherOptions } = options ?? {};
  const target = String(diffTarget ?? '');
  const json = otherOptions.jsonDiff === true;
  const workerRef = useRef<Worker | null>(null);
  const [job, setJob] = useState<{ before: string; after: string } | null>(
    null,
  );
  const comparing = job?.before === sourceInput && job.after === target;

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);
  // Another result or the expanded view can also replace either input.
  // biome-ignore lint/correctness/useExhaustiveDependencies: either document invalidates the active worker
  useEffect(() => stopWorker, [sourceInput, target, stopWorker]);

  const cancel = () => {
    stopWorker();
    setJob(null);
  };

  const publish = (
    next:
      | { ok: true; output: string; patch?: string }
      | { ok: false; message: string },
  ) => {
    onResultChange?.({
      options: next.ok
        ? {
            ...otherOptions,
            diffTarget: target,
            ...(next.patch === undefined ? {} : { diffPatch: next.patch }),
          }
        : { ...otherOptions, diffTarget: target, diffError: next.message },
      plaintextOutput: next.ok ? next.output : '',
    });
  };

  const compare = () => {
    if (!json) {
      publish(compareTexts(sourceInput, target));
      return;
    }

    cancel();
    onResultChange?.({
      options: { ...otherOptions, diffTarget: target },
      plaintextOutput: '',
    });
    try {
      const worker = new Worker(
        new URL('../../functions/json/diff.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;
      const finish = (result: JsonDiffResult) => {
        if (workerRef.current !== worker) return;
        cancel();
        publish(result);
      };
      const failed = () =>
        finish({ ok: false, message: t('diff.workerError') });
      worker.onmessage = (event: MessageEvent<JsonDiffResult>) =>
        finish(event.data);
      worker.onerror = failed;
      worker.onmessageerror = failed;
      setJob({ before: sourceInput, after: target });
      worker.postMessage({ before: sourceInput, after: target });
    } catch {
      cancel();
      publish({ ok: false, message: t('diff.workerError') });
    }
  };

  return (
    <div>
      <p>{t('diff.original')}</p>
      <CodeBoxTemplate
        {...props}
        onClick={onClick}
        options={options}
        plaintextOutput={sourceInput}
      />
      <label style={{ display: 'block', marginTop: 12 }}>
        {t(json ? 'diff.jsonTarget' : 'diff.target')}
        <textarea
          className="mono"
          value={target}
          rows={6}
          maxLength={20_000}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            background: 'transparent',
            color: 'inherit',
          }}
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            cancel();
            onResultChange?.({
              options: { ...otherOptions, diffTarget: event.target.value },
              plaintextOutput: '',
            });
          }}
        />
      </label>
      <button
        className="btn-subtle"
        type="button"
        onClick={comparing ? cancel : compare}
      >
        {t(comparing ? 'diff.cancel' : 'diff.compare')}
      </button>
      {diffError ? <p role="alert">{diffError}</p> : null}
      {plaintextOutput ? (
        <>
          <p role="status">{t('diff.result')}</p>
          <CodeBoxTemplate
            {...props}
            onClick={onClick}
            options={{ language: json ? 'json' : 'diff' }}
            plaintextOutput={plaintextOutput}
          />
          <button
            className="btn-subtle"
            type="button"
            onClick={() => onClick(plaintextOutput)}
          >
            {t('diff.copy')}
          </button>
          {typeof diffPatch === 'string' ? (
            <button
              className="btn-subtle"
              type="button"
              onClick={() =>
                downloadFile(
                  new Blob([diffPatch], {
                    type: 'application/json-patch+json',
                  }),
                  'changes.json',
                )
              }
            >
              {t('diff.downloadPatch')}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default DiffBoxTemplate;
