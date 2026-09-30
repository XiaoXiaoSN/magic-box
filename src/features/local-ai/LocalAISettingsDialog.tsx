import CloseIcon from '@mui/icons-material/Close';
import { Modal } from '@mui/material';
import { useLocale } from '../../contexts/LocaleContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import {
  AI_LANGUAGES,
  AI_TASKS,
  aiAutoLanguageLabels,
  aiLanguageLabels,
  formatModelSize,
} from './labels';
import { localAIMessages } from './messages';
import { MODEL } from './modelCatalog';
import { describePhase } from './setupStep';
import type { AILanguagePref, AIState, AITask } from './types';
import { isBusy } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  state: AIState;
  // A cache deletion is in flight; every worker-touching action has to wait.
  deleting: boolean;
  notice: string;
  // The prompt is coming from the magic input, which changes what the privacy
  // note can truthfully claim.
  promptFromInput: boolean;
  onRelease: () => void;
  onRemove: () => void;
}

// Everything the box does not need on screen while you read an answer: the
// download flow, the task and language choice, and the storage controls. The
// panel keeps ownership of the worker; this dialog only renders and dispatches.
const LocalAISettingsDialog = ({
  open,
  onClose,
  state,
  deleting,
  notice,
  promptFromInput,
  onRelease,
  onRemove,
}: Props): React.JSX.Element => {
  const { locale } = useLocale();
  const m = localAIMessages[locale];
  const { prefs, setPref } = usePreferences();
  const busy = isBusy(state.phase);
  const tone = state.error
    ? 'is-error'
    : busy
      ? 'is-busy'
      : state.loaded
        ? 'is-ready'
        : '';

  return (
    <Modal
      aria-labelledby="local-ai-settings-title"
      onClose={onClose}
      open={open}
    >
      <div className="box-modal-root">
        <button
          aria-label={m.close}
          className="box-modal-overlay"
          data-testid="local-ai-settings-overlay"
          onClick={onClose}
          tabIndex={-1}
          type="button"
        />
        <div className="box-modal-card">
          <div className="box-modal-head">
            <span aria-hidden="true" className="box-tag">
              ✦
            </span>
            <h3 className="box-modal-title" id="local-ai-settings-title">
              {m.settings}
            </h3>
            <button
              aria-label={m.close}
              className="box-modal-close"
              data-testid="local-ai-settings-close"
              onClick={onClose}
              type="button"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>

          <div className="box-modal-body">
            <div className="local-ai" data-testid="local-ai-settings">
              <section className="local-ai-group">
                <h4 className="local-ai-group-title">{m.setupTitle}</h4>
                <p className="local-ai-name">
                  {MODEL.name} · {MODEL.dtype}
                </p>
                {/* The load state is the most consequential thing in here, so
                    it reads as a state and not as another line of prose. */}
                <p className="local-ai-phase">
                  <span aria-hidden="true" className={`local-ai-dot ${tone}`} />
                  {describePhase(state, locale)}
                </p>
                {/* The phase alone ("Action needed") says nothing actionable,
                    and the box's copy of this message is behind the modal. */}
                {state.error ? (
                  <p
                    className="local-ai-error"
                    data-testid="local-ai-settings-error"
                    role="alert"
                  >
                    {m.errors[state.error]}
                  </p>
                ) : null}
                <p className="local-ai-lede">{m.privacyFull}</p>
                {/* Quote real bytes once they are known: "use Wi-Fi" is advice,
                    a measured size lets the user judge their own connection.
                    Once the model is loaded the question is answered, and
                    `info.cached` still holds the pre-download reading — so drop
                    the line rather than let it go stale. */}
                {state.loaded ? null : (
                  <p className="local-ai-note" data-testid="local-ai-size">
                    {state.info?.cached
                      ? m.cached
                      : state.info
                        ? m.firstUseSized.replace(
                            '{{size}}',
                            formatModelSize(state.info.bytes, locale),
                          )
                        : m.firstUse}
                  </p>
                )}
                <details className="local-ai-details">
                  <summary>{m.modelDetails}</summary>
                  <p className="local-ai-note">{m.checkDetail}</p>
                  <p className="local-ai-note">{m.sourceFiles}</p>
                  <p className="local-ai-note">{m.evictionNote}</p>
                  <p className="local-ai-note">
                    {MODEL.license} ·{' '}
                    <a
                      href={`https://huggingface.co/${MODEL.id}/tree/${MODEL.revision}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {m.source}
                    </a>
                  </p>
                </details>
              </section>

              <section className="local-ai-group">
                <h4 className="local-ai-group-title">{m.outputTitle}</h4>
                <div className="local-ai-fields">
                  <label>
                    {m.task}
                    <select
                      data-testid="local-ai-task"
                      disabled={busy}
                      onChange={(event) =>
                        setPref('aiTask', event.target.value as AITask)
                      }
                      value={prefs.aiTask}
                    >
                      {AI_TASKS.map((value) => (
                        <option key={value} value={value}>
                          {m.tasks[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {m.language}
                    <select
                      data-testid="local-ai-language"
                      disabled={busy}
                      onChange={(event) =>
                        setPref(
                          'aiLanguage',
                          event.target.value as AILanguagePref,
                        )
                      }
                      value={prefs.aiLanguage}
                    >
                      <option value="auto">
                        {aiAutoLanguageLabels[locale]}
                      </option>
                      {AI_LANGUAGES.map((value) => (
                        <option key={value} value={value}>
                          {aiLanguageLabels[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="local-ai-consent">
                  <input
                    checked={prefs.aiAutoRun}
                    data-testid="local-ai-auto-run"
                    onChange={(event) =>
                      setPref('aiAutoRun', event.target.checked)
                    }
                    type="checkbox"
                  />
                  {m.autoRun}
                </label>
                <p className="local-ai-note">{m.autoRunHint}</p>
              </section>

              <section className="local-ai-group">
                <h4 className="local-ai-group-title">{m.maintenanceTitle}</h4>
                <div className="local-ai-actions">
                  <button
                    className="local-ai-button"
                    data-testid="local-ai-release"
                    disabled={deleting}
                    onClick={onRelease}
                    type="button"
                  >
                    {m.release}
                  </button>
                  <button
                    className="local-ai-button"
                    data-testid="local-ai-remove"
                    disabled={busy || deleting}
                    onClick={onRemove}
                    type="button"
                  >
                    {m.remove}
                  </button>
                </div>
                {notice ? (
                  <p className="local-ai-note" role="status">
                    {notice}
                  </p>
                ) : null}
              </section>

              <section className="local-ai-group">
                <p className="local-ai-note">{m.caution}</p>
                {/* Only true in host-prompt mode, and it is the one privacy
                    consequence with no other surface to announce it today. */}
                {promptFromInput ? (
                  <p
                    className="local-ai-note"
                    data-testid="local-ai-share-note"
                  >
                    {m.shareNote}
                  </p>
                ) : null}
                <details className="local-ai-details">
                  <summary>{m.techDetails}</summary>
                  <p className="local-ai-note">{m.requirements}</p>
                  <p className="local-ai-note">{m.budget}</p>
                  <p className="local-ai-note">{m.memoryNote}</p>
                  <p className="local-ai-note">{m.telemetryNote}</p>
                </details>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LocalAISettingsDialog;
