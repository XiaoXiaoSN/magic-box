import { useLocale } from '../../contexts/LocaleContext';
import type { WorkerPort } from './client';
import './localAI.css';
import LocalAIProgress from './LocalAIProgress';
import { localAIMessages } from './messages';
import { describePhase } from './setupStep';
import { isBusy } from './types';
import { useLocalAI } from './useLocalAI';
import { useLocalAISetup } from './useLocalAISetup';

interface Props {
  // Injected by tests so the section can be driven without a module worker.
  createWorker?: () => WorkerPort;
}

// Provisioning from Settings, where no box is mounted: fetch the weights ahead
// of time so the `::ai` box starts from cache. It runs the same steps the box
// does, through the same `useLocalAISetup`, so a user never meets two names for
// one action or two sets of guards.
//
// The client is the one the box uses (see useLocalAI): a model loaded here is
// loaded there. Leaving this page lets it go after the unused-grace period —
// once any download in flight has finished — so what survives is the download
// in Cache Storage, not a session holding ~500 MB of GPU memory.

const LocalAIModelSettings = ({
  createWorker,
}: Props = {}): React.JSX.Element => {
  const { locale, t } = useLocale();
  const m = localAIMessages[locale];
  // No auto-check here, unlike the box: this section renders for everyone who
  // opens Settings, so mounting it is not a request to use local AI. The check
  // stays the first explicit step.
  const { client, state } = useLocalAI({ createWorker });
  const setup = useLocalAISetup(client, state, locale);
  const { step } = setup;
  const busy = isBusy(state.phase);

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
        <div className="field-control local-ai-actions">
          {setup.canStop ? (
            <button
              className="local-ai-button"
              data-testid="settings-ai-stop"
              disabled={state.phase === 'stopping'}
              onClick={() => client.stop()}
              type="button"
            >
              {m.stop}
            </button>
          ) : null}
          <button
            className="local-ai-button primary"
            data-testid="settings-ai-setup"
            disabled={!step || busy || setup.deleting}
            onClick={setup.advance}
            type="button"
          >
            {step?.label ?? m.phases.ready}
          </button>
        </div>
      </div>

      {/* Only rendered when it has something to say: an empty grid would
          otherwise add a gap between the two field rows. */}
      {step?.note || state.progress || state.error || setup.notice ? (
        <div className="local-ai">
          {step?.note ? <p className="local-ai-hint">{step.note}</p> : null}
          {state.progress ? (
            <LocalAIProgress
              label={m.downloading}
              percent={state.progress.percent}
            />
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
          {setup.notice ? (
            <p className="local-ai-note" role="status">
              {setup.notice}
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
            data-testid="settings-ai-delete"
            disabled={!setup.canRemove}
            onClick={() => void setup.removeDownloads()}
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
