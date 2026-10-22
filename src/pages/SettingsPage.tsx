import {
  type ControlOption,
  Field,
  Select,
  Toggle,
} from '@components/Controls';
import { buildVersion } from '@global/buildInfo';
import env from '@global/env';
import { useEffect, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import {
  isValidServerUrl,
  usePreferences,
} from '../contexts/PreferencesContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  DEFAULT_TIMEZONE_OFFSET,
  formatOffsetLabel,
  MAX_TIMEZONE_OFFSET,
  MIN_TIMEZONE_OFFSET,
} from '../functions/timezone';
import { DEFAULT_LOCALE, type Locale } from '../i18n';
import { boxSources } from '../modules/boxSources';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const Section = ({ title, subtitle, children }: SectionProps) => (
  <section className="settings-section">
    <div className="settings-section-head">
      <h2 className="settings-section-title" title={subtitle}>
        {title}
      </h2>
    </div>
    <div className="settings-section-body">{children}</div>
  </section>
);

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ControlOption<T>[];
}

const Segmented = <T extends string>({
  value,
  onChange,
  options,
}: SegmentedProps<T>) => (
  <div className="seg">
    {options.map((o) => (
      <button
        className={`seg-item${o.value === value ? ' active' : ''}`}
        key={o.value}
        onClick={() => onChange(o.value)}
        type="button"
      >
        {o.label}
      </button>
    ))}
  </div>
);

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel: string;
  inputMode?: 'text' | 'numeric' | 'url';
}

const TextInput = ({
  value,
  onChange,
  placeholder,
  invalid,
  ariaLabel,
  inputMode = 'text',
}: TextInputProps) => (
  <input
    aria-invalid={invalid ?? false}
    aria-label={ariaLabel}
    className={`text-input${invalid ? ' is-invalid' : ''}`}
    inputMode={inputMode}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    type="text"
    value={value}
  />
);

const Shortcut = ({ keys, label }: { keys: string[]; label: string }) => (
  <div className="shortcut-row">
    <span className="shortcut-label">{label}</span>
    <span className="shortcut-keys">
      {keys.map((k) => (
        <span className="kbd" key={k}>
          {k}
        </span>
      ))}
    </span>
  </div>
);

const SettingsPage = (): React.JSX.Element => {
  const { t, locale, setLocale } = useLocale();
  const { settings, updateSettings } = useSettings();
  const { prefs, setPref, resetPrefs } = usePreferences();
  // draft strings let the user type intermediate/invalid values; we only
  // commit to prefs once the value parses/validates.
  const [toolboxDraft, setToolboxDraft] = useState(prefs.toolboxUrl);
  const [shortenDraft, setShortenDraft] = useState(prefs.shortenUrl);

  // resync drafts when prefs change out of band (e.g. clear local data).
  useEffect(() => {
    setToolboxDraft(prefs.toolboxUrl);
    setShortenDraft(prefs.shortenUrl);
  }, [prefs.toolboxUrl, prefs.shortenUrl]);
  const toolboxInvalid = !isValidServerUrl(toolboxDraft);
  const shortenInvalid = !isValidServerUrl(shortenDraft);

  const timezoneOptions = [
    { value: 'system', label: t('settings.timezoneSystem') },
    ...Array.from(
      { length: (MAX_TIMEZONE_OFFSET - MIN_TIMEZONE_OFFSET) * 4 + 1 },
      (_, index) => {
        const offset = MIN_TIMEZONE_OFFSET + index / 4;
        return {
          value: String(offset),
          label: `${formatOffsetLabel(offset)}${offset === DEFAULT_TIMEZONE_OFFSET ? ` (${t('settings.default')})` : ''}`,
        };
      },
    ),
  ];

  const commitServerUrl = (key: 'toolboxUrl' | 'shortenUrl', raw: string) => {
    if (isValidServerUrl(raw)) {
      setPref(key, raw.trim());
    }
  };

  const handleResetOrder = () => {
    updateSettings({
      ...settings,
      boxes: Object.fromEntries(
        boxSources.map((source, index) => [
          source.name,
          {
            id: source.name,
            enabled: !source.defaultDisabled,
            priority: source.priority ?? 10,
            secondaryOrder: index,
          },
        ]),
      ),
    });
  };

  const handleClearLocalData = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(t('settings.clearConfirm'))
    ) {
      return;
    }
    window.localStorage.clear();
    setLocale(DEFAULT_LOCALE);
    resetPrefs();
    handleResetOrder();
  };

  const handleResetDefaults = () => {
    resetPrefs();
    setLocale(DEFAULT_LOCALE);
    handleResetOrder();
  };

  return (
    <div className="page">
      <div className="page-inner">
        <header className="page-head">
          <div>
            <h1 className="page-title">{t('settings.title')}</h1>
            <p className="page-sub">{t('settings.subtitle')}</p>
          </div>
          <button
            className="btn-subtle"
            title={t('settings.defaultsHint')}
            onClick={handleResetDefaults}
            type="button"
          >
            {t('settings.resetPreferences')}
          </button>
        </header>

        <Section title={t('settings.section.appearance')}>
          <Field label={t('settings.theme')}>
            <Segmented
              onChange={(v) => setPref('theme', v)}
              options={[
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
                { value: 'system', label: t('settings.themeSystem') },
              ]}
              value={prefs.theme}
            />
          </Field>
          <Field label={t('settings.density')}>
            <Segmented
              onChange={(v) => setPref('density', v)}
              options={[
                {
                  value: 'comfortable',
                  label: t('settings.densityComfortable'),
                },
                { value: 'compact', label: t('settings.densityCompact') },
              ]}
              value={prefs.density}
            />
          </Field>
        </Section>

        <Section title={t('settings.section.io')}>
          <Field
            hint={t('settings.languageHint')}
            label={t('settings.language')}
          >
            <Select<Locale>
              onChange={setLocale}
              options={[
                { value: 'en', label: t('settings.langEn') },
                { value: 'tw', label: t('settings.langTw') },
              ]}
              value={locale}
            />
          </Field>
          <Field
            hint={t('settings.enterBehaviorHint')}
            label={t('settings.enterBehavior')}
          >
            <Segmented
              onChange={(v) => setPref('copyMode', v)}
              options={[
                { value: 'enter', label: t('settings.enterCopy') },
                { value: 'paste', label: t('settings.enterPaste') },
                { value: 'off', label: t('settings.enterOff') },
              ]}
              value={prefs.copyMode}
            />
          </Field>
          <Field
            hint={t('settings.timezoneHint')}
            label={t('settings.timezone')}
          >
            <Select
              label={t('settings.timezone')}
              options={timezoneOptions}
              value={
                prefs.timezoneMode === 'system'
                  ? 'system'
                  : String(prefs.timezoneOffset)
              }
              onChange={(value) => {
                setPref(
                  'timezoneMode',
                  value === 'system' ? 'system' : 'fixed',
                );
                if (value !== 'system')
                  setPref('timezoneOffset', Number(value));
              }}
            />
          </Field>
        </Section>

        <Section
          subtitle={t('settings.section.serverHint')}
          title={t('settings.section.server')}
        >
          <Field
            hint={t('settings.toolboxUrlHint')}
            label={t('settings.toolboxUrl')}
          >
            <TextInput
              ariaLabel={t('settings.toolboxUrl')}
              inputMode="url"
              invalid={toolboxInvalid}
              onChange={(v) => {
                setToolboxDraft(v);
                commitServerUrl('toolboxUrl', v);
              }}
              placeholder={env.TOOLBOX_URL}
              value={toolboxDraft}
            />
          </Field>
          <Field
            hint={t('settings.shortenUrlHint')}
            label={t('settings.shortenUrl')}
          >
            <TextInput
              ariaLabel={t('settings.shortenUrl')}
              inputMode="url"
              invalid={shortenInvalid}
              onChange={(v) => {
                setShortenDraft(v);
                commitServerUrl('shortenUrl', v);
              }}
              placeholder={env.SHORTEN_URL}
              value={shortenDraft}
            />
          </Field>
        </Section>

        <Section title={t('settings.section.shortcuts')}>
          <div className="shortcut-list">
            <Shortcut keys={['⌃', 'N']} label={t('settings.shortcutNext')} />
            <Shortcut
              keys={['⌃', '⇧', 'N']}
              label={t('settings.shortcutPrev')}
            />
            <Shortcut keys={['⌃', 'P']} label={t('settings.shortcutPrevAlt')} />
            <Shortcut keys={['↵']} label={t('settings.shortcutCopy')} />
            <Shortcut keys={['⌘', '↵']} label={t('settings.shortcutPaste')} />
          </div>
        </Section>

        <Section title={t('settings.section.privacy')}>
          <Field
            hint={t('settings.analyticsHint')}
            label={t('settings.analytics')}
          >
            <Toggle
              checked={prefs.analytics}
              label={t('settings.analytics')}
              onChange={(v) => setPref('analytics', v)}
            />
          </Field>
          <Field
            hint={t('settings.clearDataHint')}
            label={t('settings.clearData')}
          >
            <button
              className="btn-danger"
              onClick={handleClearLocalData}
              type="button"
            >
              {t('settings.clear')}
            </button>
          </Field>
        </Section>

        <Section title={t('settings.section.about')}>
          <div className="about">
            <div className="about-row">
              <span>{t('settings.version')}</span>
              <span className="mono">{buildVersion}</span>
            </div>
            <div className="about-row">
              <span>{t('settings.license')}</span>
              <span className="mono">MIT</span>
            </div>
            <div className="about-row">
              <span>{t('settings.source')}</span>
              <a
                className="about-link"
                href="https://github.com/XiaoXiaoSN/magic-box"
                rel="noreferrer"
                target="_blank"
              >
                github.com/XiaoXiaoSN/magic-box ↗
              </a>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default SettingsPage;
