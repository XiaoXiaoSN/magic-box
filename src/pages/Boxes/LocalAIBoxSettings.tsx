import { Field, Select, Toggle } from '@components/Controls';
import { lazy, Suspense } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import {
  aiLanguageOptions,
  aiTaskOptions,
} from '../../features/local-ai/labels';

// model setup stays lazy until its settings are opened.
const LocalAIModelSettings = lazy(
  async () => import('../../features/local-ai/LocalAIModelSettings'),
);

export default function LocalAIBoxSettings(): React.JSX.Element {
  const { t, locale } = useLocale();
  const { prefs, setPref } = usePreferences();
  return (
    <div className="box-preferences">
      <Field hint={t('settings.aiTaskHint')} label={t('settings.aiTask')}>
        <Select
          label={t('settings.aiTask')}
          onChange={(v) => setPref('aiTask', v)}
          options={aiTaskOptions(locale)}
          value={prefs.aiTask}
        />
      </Field>
      <Field
        hint={t('settings.aiLanguageHint')}
        label={t('settings.aiLanguage')}
      >
        <Select
          label={t('settings.aiLanguage')}
          onChange={(v) => setPref('aiLanguage', v)}
          options={aiLanguageOptions(locale)}
          value={prefs.aiLanguage}
        />
      </Field>
      <Field hint={t('settings.aiAutoRunHint')} label={t('settings.aiAutoRun')}>
        <Toggle
          checked={prefs.aiAutoRun}
          label={t('settings.aiAutoRun')}
          onChange={(v) => setPref('aiAutoRun', v)}
        />
      </Field>
      <Field
        hint={t('settings.aiAutoCheckHint')}
        label={t('settings.aiAutoCheck')}
      >
        <Toggle
          checked={prefs.aiAutoCheck}
          label={t('settings.aiAutoCheck')}
          onChange={(v) => setPref('aiAutoCheck', v)}
        />
      </Field>
      {/* model downloads live separately from browser preferences. */}
      <Suspense fallback={<div className="loader" />}>
        <LocalAIModelSettings />
      </Suspense>
    </div>
  );
}
