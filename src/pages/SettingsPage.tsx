import {
  type ControlOption,
  Field,
  Select,
  Toggle,
} from '@components/Controls';
import { buildVersion } from '@global/buildInfo';
import env from '@global/env';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import {
  isValidServerUrl,
  usePreferences,
} from '../contexts/PreferencesContext';
import { buildDefaultSettings, useSettings } from '../contexts/SettingsContext';
import { clearLocalStorage } from '../functions/storage';
import {
  DEFAULT_TIMEZONE_OFFSET,
  formatOffsetLabel,
  MAX_TIMEZONE_OFFSET,
  MIN_TIMEZONE_OFFSET,
} from '../functions/timezone';
import { DEFAULT_LOCALE, type Locale } from '../i18n';

const primaryModifierLabel = (): string => {
  if (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform)
  ) {
    return '⌘';
  }
  return 'Ctrl';
};

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
  label: string;
}

const Segmented = <T extends string>({
  value,
  onChange,
  options,
  label,
}: SegmentedProps<T>) => {
  const moveFocus = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    const next = options[index];
    if (!next) return;
    event.preventDefault();
    onChange(next.value);
    const nextButton = event.currentTarget
      .closest('.seg')
      ?.querySelector(
        `input[data-segment-index="${index}"]`,
      ) as HTMLInputElement | null;
    nextButton?.focus();
  };

  return (
    <div aria-label={label} className="seg" role="radiogroup">
      {options.map((o, index) => (
        <label
          className={`seg-item${o.value === value ? ' active' : ''}`}
          key={o.value}
        >
          <input
            aria-checked={o.value === value}
            checked={o.value === value}
            data-segment-index={index}
            name={`settings-${label}`}
            onChange={() => onChange(o.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                moveFocus((index + 1) % options.length, event);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                moveFocus((index - 1 + options.length) % options.length, event);
              } else if (event.key === 'Home') {
                moveFocus(0, event);
              } else if (event.key === 'End') {
                moveFocus(options.length - 1, event);
              }
            }}
            type="radio"
            value={o.value}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
};

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel: string;
  id?: string;
  inputMode?: 'text' | 'numeric' | 'url';
}

const TextInput = ({
  value,
  onChange,
  placeholder,
  invalid,
  ariaLabel,
  id,
  inputMode = 'text',
}: TextInputProps) => (
  <input
    aria-invalid={invalid ?? false}
    aria-label={ariaLabel}
    className={`text-input${invalid ? ' is-invalid' : ''}`}
    id={id}
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
  const { resetSettings, updateSettings } = useSettings();
  const { prefs, setPref, resetPrefs } = usePreferences();
  // draft strings let the user type intermediate/invalid values; we only
  // commit to prefs once the value parses/validates.
  const [toolboxDraft, setToolboxDraft] = useState(prefs.toolboxUrl);
  const [shortenDraft, setShortenDraft] = useState(prefs.shortenUrl);
  const [CloudSettings, setCloudSettings] =
    useState<React.ComponentType | null>(null);
  const [cloudLoad, setCloudLoad] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  const openCloud = async () => {
    setCloudLoad('loading');
    try {
      const module = await import('../features/cloud-settings/CloudSettings');
      setCloudSettings(() => module.default);
    } catch {
      setCloudLoad('error');
    }
  };
  const primaryModifier = primaryModifierLabel();

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

  const handleResetOrder = () => updateSettings(buildDefaultSettings());

  const handleClearLocalData = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(t('settings.clearConfirm'))
    ) {
      return;
    }
    clearLocalStorage();
    setLocale(DEFAULT_LOCALE);
    resetPrefs();
    resetSettings();
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

        <Section title={t('cloud.title')} subtitle={t('cloud.hint')}>
          {CloudSettings ? (
            <CloudSettings />
          ) : (
            <>
              <button
                className="btn-subtle"
                disabled={cloudLoad === 'loading'}
                onClick={openCloud}
                type="button"
              >
                {t(cloudLoad === 'loading' ? 'cloud.loading' : 'cloud.open')}
              </button>
              {cloudLoad === 'error' && <p role="alert">{t('cloud.error')}</p>}
            </>
          )}
        </Section>

        <Link
          className="settings-boxes-link"
          to="/boxes"
          title={t('boxes.manageHint')}
        >
          <strong>{t('boxes.manage')}</strong>
          <span aria-hidden="true">↗</span>
        </Link>

        <Section title={t('settings.section.appearance')}>
          <Field group label={t('settings.theme')}>
            <Segmented
              label={t('settings.theme')}
              onChange={(v) => setPref('theme', v)}
              options={[
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
                { value: 'system', label: t('settings.themeSystem') },
              ]}
              value={prefs.theme}
            />
          </Field>
          <Field
            group
            label={t('settings.density')}
          >
            <Segmented
              label={t('settings.density')}
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
            controlId="settings-language"
            hint={t('settings.languageHint')}
            label={t('settings.language')}
          >
            <Select<Locale>
              id="settings-language"
              onChange={setLocale}
              options={[
                { value: 'en', label: t('settings.langEn') },
                { value: 'tw', label: t('settings.langTw') },
              ]}
              value={locale}
            />
          </Field>
          <Field
            group
            hint={t('settings.enterBehaviorHint')}
            label={t('settings.enterBehavior')}
          >
            <Segmented
              label={t('settings.enterBehavior')}
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
            controlId="settings-timezone"
            hint={t('settings.timezoneHint')}
            label={t('settings.timezone')}
          >
            <Select
              id="settings-timezone"
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
            controlId="settings-toolbox-url"
            hint={t('settings.toolboxUrlHint')}
            label={t('settings.toolboxUrl')}
          >
            <TextInput
              ariaLabel={t('settings.toolboxUrl')}
              id="settings-toolbox-url"
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
            controlId="settings-shorten-url"
            hint={t('settings.shortenUrlHint')}
            label={t('settings.shortenUrl')}
          >
            <TextInput
              ariaLabel={t('settings.shortenUrl')}
              id="settings-shorten-url"
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
            <Shortcut keys={['Alt', '↓']} label={t('settings.shortcutNext')} />
            <Shortcut keys={['Alt', '↑']} label={t('settings.shortcutPrev')} />
            <Shortcut
              keys={['Alt', 'Home']}
              label={t('settings.shortcutFirst')}
            />
            <Shortcut
              keys={['Alt', 'End']}
              label={t('settings.shortcutLast')}
            />
            <Shortcut keys={['↵']} label={t('settings.shortcutCopy')} />
            <Shortcut
              keys={[primaryModifier, '↵']}
              label={t('settings.shortcutPaste')}
            />
          </div>
        </Section>

        <Section title={t('settings.section.privacy')}>
          <Field
            hint={t('settings.collectFeedbackHint')}
            label={t('settings.collectFeedback')}
          >
            <Toggle
              checked={prefs.collectFeedback}
              label={t('settings.collectFeedback')}
              onChange={(v) => setPref('collectFeedback', v)}
            />
          </Field>
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
