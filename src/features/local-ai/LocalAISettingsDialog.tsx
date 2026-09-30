import { Select, Toggle } from '@components/Controls';
import ModalShell from '@components/MagicBox/ModalShell';
import { useId } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { aiLanguageOptions, aiTaskOptions, formatModelSize } from './labels';
import { localAIMessages } from './messages';
import { MODEL } from './modelCatalog';
import { describePhase, phaseTone } from './setupStep';
import type { AIState } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  state: AIState;
  // A cache deletion is in flight; every worker-touching action has to wait.
  deleting: boolean;
  // No deletion is running (useLocalAISetup).
  canRemove: boolean;
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
  canRemove,
  notice,
  promptFromInput,
  onRelease,
  onRemove,
}: Props): React.JSX.Element => {
  const { locale } = useLocale();
  const m = localAIMessages[locale];
  const { prefs, setPref } = usePreferences();
  const taskId = useId();
  const languageId = useId();
  // A request is snapshotted when it is submitted, so only a running
  // generation makes a changed choice ambiguous; a check or a download does not.
  const generating = state.phase === 'generating' || state.phase === 'stopping';

  return (
    <ModalShell
      backdropLabel={m.close}
      closeLabel={m.close}
      onClose={onClose}
      open={open}
      tag="✦"
      testId="local-ai-settings"
      title={m.settings}
      titleId="local-ai-settings-title"
    >
      <div className="local-ai" data-testid="local-ai-settings">
        <section className="local-ai-group">
          <h4 className="local-ai-group-title">{m.setupTitle}</h4>
          <p className="local-ai-name">
            {MODEL.name} · {MODEL.dtype}
          </p>
          {/* The load state is the most consequential thing in here, so
                    it reads as a state and not as another line of prose. */}
          <p className="local-ai-phase">
            <span
              aria-hidden="true"
              className={`local-ai-dot ${phaseTone(state)}`}
            />
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
                    Once the model is loaded the question is answered; after a
                    release `info.cached` is true, so the line says so. */}
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
            <label htmlFor={taskId}>
              {m.task}
              <Select
                id={taskId}
                disabled={generating}
                onChange={(v) => setPref('aiTask', v)}
                options={aiTaskOptions(locale)}
                testId="local-ai-task"
                value={prefs.aiTask}
              />
            </label>
            <label htmlFor={languageId}>
              {m.language}
              <Select
                id={languageId}
                disabled={generating}
                onChange={(v) => setPref('aiLanguage', v)}
                options={aiLanguageOptions(locale)}
                testId="local-ai-language"
                value={prefs.aiLanguage}
              />
            </label>
          </div>
          <div className="local-ai-toggle">
            <span>{m.autoRun}</span>
            <Toggle
              checked={prefs.aiAutoRun}
              label={m.autoRun}
              onChange={(v) => setPref('aiAutoRun', v)}
              testId="local-ai-auto-run"
            />
          </div>
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
              disabled={!canRemove}
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
            <p className="local-ai-note" data-testid="local-ai-share-note">
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
    </ModalShell>
  );
};

export default LocalAISettingsDialog;
