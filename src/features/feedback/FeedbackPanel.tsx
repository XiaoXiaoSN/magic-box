import { buildVersion } from '@global/buildInfo';
import { useCallback, useRef, useState } from 'react';
import {
  CONSENT_VERSION,
  type FeedbackCandidate,
  type FeedbackSample,
  isFeedbackSample,
  MAX_TEXT_LENGTH,
  SCHEMA_VERSION,
} from '../../../functions/schema.js';
import { useLocale } from '../../contexts/LocaleContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { FeedbackError, isFeedbackConfigured, submitFeedback } from './submit';

interface Props {
  input: string;
  candidates: FeedbackCandidate[];
  selectedCandidateId: string | null;
  ready: boolean;
}

export default function FeedbackPanel({
  input,
  candidates,
  selectedCandidateId,
  ready,
}: Props) {
  const { t, locale } = useLocale();
  const { prefs } = usePreferences();
  const [kind, setKind] = useState<FeedbackSample['kind']>('selection');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'success' | 'error' | 'invalid'
  >('idle');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const retry = useRef<{ key: string; sample: FeedbackSample } | null>(null);
  const selected = candidates.find(
    (candidate) => candidate.id === selectedCandidateId && !candidate.isError,
  );
  const configured = isFeedbackConfigured();
  // Invalidate a late completion after changing input, consent, or candidates.
  const contextKey = JSON.stringify([
    input,
    candidates,
    selectedCandidateId,
    kind,
    expectedOutput,
    comment,
    locale,
    prefs.timezoneMode,
    prefs.timezoneOffset,
  ]);
  const live = useRef({ contextKey, allowed: true });
  live.current = { contextKey, allowed: prefs.collectFeedback && ready };
  // React ref cleanup also covers unmount when the mode is switched off.
  const panelRef = useCallback((node: HTMLElement | null) => {
    mounted.current = node !== null;
  }, []);
  const [savedKey, setSavedKey] = useState('');
  const saved = savedKey === contextKey;

  const submit = async () => {
    if (inFlight.current || !ready || !prefs.collectFeedback || saved) return;
    if (
      (kind === 'selection' && !selected) ||
      (kind === 'expectation' && !expectedOutput.trim())
    )
      return;
    const sample: FeedbackSample =
      retry.current?.key === contextKey
        ? retry.current.sample
        : {
            schemaVersion: SCHEMA_VERSION,
            consentVersion: CONSENT_VERSION,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            appVersion: buildVersion,
            locale,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            timezoneOffset: prefs.timezoneOffset,
            timezoneMode: prefs.timezoneMode,
            input,
            candidates,
            selectedCandidateId:
              kind === 'selection' ? selectedCandidateId : null,
            expectedOutput: kind === 'expectation' ? expectedOutput : '',
            comment,
            kind,
          };
    if (!isFeedbackSample(sample)) {
      setStatus('invalid');
      return;
    }
    retry.current = { key: contextKey, sample };
    inFlight.current = true;
    setStatus('sending');
    const isAllowed = () =>
      mounted.current &&
      live.current.allowed &&
      live.current.contextKey === contextKey;
    try {
      await submitFeedback(sample, isAllowed);
      if (isAllowed()) {
        setSavedKey(contextKey);
        setStatus('success');
      }
    } catch (error) {
      if (isAllowed())
        setStatus(
          error instanceof FeedbackError && error.reason === 'invalid'
            ? 'invalid'
            : 'error',
        );
    } finally {
      inFlight.current = false;
      if (mounted.current)
        setStatus((current) => (current === 'sending' ? 'idle' : current));
    }
  };

  return (
    <section
      aria-label={t('feedback.title')}
      className="feedback-panel"
      ref={panelRef}
    >
      <h2>{t('feedback.title')}</h2>
      <p className="field-hint">{t('feedback.notice')}</p>
      {!configured ? <p role="status">{t('feedback.unconfigured')}</p> : null}
      <fieldset disabled={status === 'sending'}>
        <legend>{t('feedback.kind')}</legend>
        <label>
          <input
            checked={kind === 'selection'}
            name="feedback-kind"
            onChange={() => {
              setKind('selection');
              setStatus('idle');
            }}
            type="radio"
          />{' '}
          {t('feedback.selection')}
        </label>
        <label>
          <input
            checked={kind === 'expectation'}
            name="feedback-kind"
            onChange={() => {
              setKind('expectation');
              setStatus('idle');
            }}
            type="radio"
          />{' '}
          {t('feedback.expectation')}
        </label>
      </fieldset>
      {kind === 'selection' ? (
        <p>
          {selected
            ? t('feedback.selected', { name: selected.name })
            : t('feedback.choose')}
        </p>
      ) : (
        <label className="feedback-field">
          {t('feedback.expected')}
          <textarea
            className="text-input"
            disabled={status === 'sending'}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(event) => {
              setExpectedOutput(event.target.value);
              setStatus('idle');
            }}
            rows={3}
            value={expectedOutput}
          />
        </label>
      )}
      <label className="feedback-field">
        {t('feedback.comment')}
        <textarea
          className="text-input"
          disabled={status === 'sending'}
          maxLength={4000}
          onChange={(event) => {
            setComment(event.target.value);
            setStatus('idle');
          }}
          rows={2}
          value={comment}
        />
      </label>
      <div className="feedback-actions">
        <button
          className="btn-subtle"
          disabled={
            !configured ||
            !ready ||
            status === 'sending' ||
            saved ||
            (kind === 'selection' ? !selected : !expectedOutput.trim())
          }
          onClick={() => {
            void submit();
          }}
          type="button"
        >
          {status === 'sending' ? t('feedback.sending') : t('feedback.submit')}
        </button>
        <span aria-live="polite" role="status">
          {saved
            ? t('feedback.success')
            : status === 'invalid'
              ? t('feedback.tooLarge')
              : status === 'error'
                ? t('feedback.error')
                : !ready
                  ? t('feedback.wait')
                  : ''}
        </span>
      </div>
    </section>
  );
}
