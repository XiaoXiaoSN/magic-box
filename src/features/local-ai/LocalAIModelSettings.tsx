import { useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { deleteLocalAIDownloads } from './caches';
import './localAI.css';
import type { WorkerPort } from './client';
import { localAIMessages } from './messages';
import { describePhase, describeSetupStep } from './setupStep';
import { isBusy } from './types';
import { useLocalAI } from './useLocalAI';

interface Props {
  // Injected by tests so the section can be driven without a module worker.
  createWorker?: () => WorkerPort;
}

// Provisioning from Settings, where no box is mounted: fetch the weights ahead
// of time so the `::ai` box starts from cache. It runs the same steps the box
// does, through the same `describeSetupStep`, so a user never meets two names
// for one action.
//
// Leaving this page releases the worker (`useLocalAI` unmount), which is the
// point: what survives is the download in Cache Storage, not a session holding
// ~500 MB of GPU memory on a settings screen.
const LocalAIModelSettings = ({
  createWorker,
}: Props = {}): React.JSX.Element => {
  const { locale, t } = useLocale();
  const m = localAIMessages[locale];
  // No auto-check here, unlike the box: this section renders for everyone who
  // opens Settings, so mounting it is not a request to use local AI. The check
  // stays the first explicit step.
  const { client, state } = useLocalAI({ createWorker });
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const busy = isBusy(state.phase);
  const step = describeSetupStep(state, locale);

  const advance = () => {
    if (!step) return;
    setNotice('');
    if (step.action === 'inspect') {
      client.inspect();
      return;
    }
    if (typeof navigator.storage?.persist === 'function') {
      void navigator.storage.persist().catch(() => false);
    }
    // The click is the consent: the label carries the byte count, the note
    // names the sources.
    client.prepare();
  };

  const removeDownloads = async () => {
    if (typeof window !== 'undefined' && !window.confirm(m.removeConfirm)) {
      return;
    }
    // Terminate first: this tab must not be able to repopulate the cache it is
    // about to delete.
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

  return (
    <>
      <div className="field">
        <div className="field-info">
          <div className="field-label">{t('settings.aiModel')}</div>
          <div className="field-hint">
            {state.loaded ? m.provisioned : t('settings.aiModelHint')}
          </div>
          <div className="field-hint" data-testid="settings-ai-status">
            {describePhase(state, locale)}
          </div>
        </div>
        <div className="field-control">
          <button
            className="local-ai-button primary"
            data-testid="settings-ai-setup"
            disabled={!step || busy || deleting}
            onClick={advance}
            type="button"
          >
            {step?.label ?? m.phases.ready}
          </button>
        </div>
      </div>

      {/* Only rendered when it has something to say: an empty grid would
          otherwise add a gap between the two field rows. */}
      {step?.note || state.progress || state.error || notice ? (
        <div className="local-ai">
          {step?.note ? <p className="local-ai-hint">{step.note}</p> : null}
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
            <p
              className="local-ai-error"
              data-testid="settings-ai-error"
              role="alert"
            >
              {m.errors[state.error]}
            </p>
          ) : null}
          {notice ? (
            <p className="local-ai-note" role="status">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <div className="field-info">
          <div className="field-label">{t('settings.aiDelete')}</div>
          <div className="field-hint">{t('settings.aiDeleteHint')}</div>
        </div>
        <div className="field-control">
          <button
            className="btn-danger"
            disabled={deleting}
            onClick={() => void removeDownloads()}
            type="button"
          >
            {t('settings.delete')}
          </button>
        </div>
      </div>
    </>
  );
};

export default LocalAIModelSettings;
