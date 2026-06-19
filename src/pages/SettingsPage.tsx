import type { DragEndEvent } from '@dnd-kit/core';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { buildVersion } from '@global/buildInfo';
import env from '@global/env';
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import {
  isValidServerUrl,
  usePreferences,
} from '../contexts/PreferencesContext';
import type { BoxSetting, Settings } from '../contexts/SettingsContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  isValidTimezoneOffset,
  MAX_TIMEZONE_OFFSET,
  MIN_TIMEZONE_OFFSET,
} from '../functions/timezone';
import { DEFAULT_LOCALE, type Locale } from '../i18n';
import { boxSources } from '../modules/boxSources';

const GripIcon = () => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    height="16"
    viewBox="0 0 10 16"
    width="10"
  >
    <circle cx="2" cy="3" r="1.3" />
    <circle cx="2" cy="8" r="1.3" />
    <circle cx="2" cy="13" r="1.3" />
    <circle cx="8" cy="3" r="1.3" />
    <circle cx="8" cy="8" r="1.3" />
    <circle cx="8" cy="13" r="1.3" />
  </svg>
);

interface SortableRowProps {
  box: BoxSetting;
  source?: (typeof boxSources)[number];
  index: number;
  onToggle: (id: string) => void;
}

const SortableRow = ({ box, source, index, onToggle }: SortableRowProps) => {
  const { t } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: box.id });

  const className = [
    'dnd-row',
    isDragging ? 'is-dragging' : '',
    box.enabled ? '' : 'is-off',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'none',
      }}
    >
      <button
        aria-label={t('settings.dragReorderLabel', { name: box.id })}
        className="dnd-grip"
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <span className="dnd-index mono">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span aria-hidden="true" className="dnd-tag">
        {source?.tag ?? '·'}
      </span>
      <span className="dnd-title">{box.id}</span>
      <span className="dnd-kind">{source?.kind ?? ''}</span>
      <button
        aria-label={
          box.enabled
            ? t('settings.disableBoxLabel', { name: box.id })
            : t('settings.enableBoxLabel', { name: box.id })
        }
        className={`toggle${box.enabled ? ' on' : ''}`}
        onClick={() => onToggle(box.id)}
        type="button"
      >
        <span className="toggle-dot" />
      </button>
    </div>
  );
};

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const Section = ({ title, subtitle, children }: SectionProps) => (
  <section className="settings-section">
    <div className="settings-section-head">
      <h2 className="settings-section-title">{title}</h2>
      {subtitle ? <p className="settings-section-sub">{subtitle}</p> : null}
    </div>
    <div className="settings-section-body">{children}</div>
  </section>
);

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

const Field = ({ label, hint, children }: FieldProps) => (
  <div className="field">
    <div className="field-info">
      <div className="field-label">{label}</div>
      {hint ? <div className="field-hint">{hint}</div> : null}
    </div>
    <div className="field-control">{children}</div>
  </div>
);

interface SegOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
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

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

const Toggle = ({ checked, onChange, label }: ToggleProps) => {
  const { t } = useLocale();
  return (
    <button
      aria-label={label ?? t('settings.toggle')}
      aria-pressed={checked}
      className={`toggle${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="toggle-dot" />
    </button>
  );
};

interface SelectProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
}

const Select = <T extends string>({
  value,
  onChange,
  options,
}: SelectProps<T>) => (
  <select
    className="select"
    onChange={(e) => onChange(e.target.value as T)}
    value={value}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
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
  const [orderedBoxes, setOrderedBoxes] = useState<BoxSetting[]>([]);
  // draft strings let the user type intermediate/invalid values; we only
  // commit to prefs once the value parses/validates.
  const [tzDraft, setTzDraft] = useState(String(prefs.timezoneOffset));
  const [toolboxDraft, setToolboxDraft] = useState(prefs.toolboxUrl);
  const [shortenDraft, setShortenDraft] = useState(prefs.shortenUrl);

  // resync drafts when prefs change out of band (e.g. clear local data).
  useEffect(() => {
    setTzDraft(String(prefs.timezoneOffset));
    setToolboxDraft(prefs.toolboxUrl);
    setShortenDraft(prefs.shortenUrl);
  }, [prefs.timezoneOffset, prefs.toolboxUrl, prefs.shortenUrl]);

  const tzInvalid = (() => {
    const parsed = Number(tzDraft);
    return tzDraft.trim() === '' || !isValidTimezoneOffset(parsed);
  })();
  const toolboxInvalid = !isValidServerUrl(toolboxDraft);
  const shortenInvalid = !isValidServerUrl(shortenDraft);

  const commitTimezone = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() !== '' && isValidTimezoneOffset(parsed)) {
      setPref('timezoneOffset', parsed);
    }
  };

  const commitServerUrl = (key: 'toolboxUrl' | 'shortenUrl', raw: string) => {
    if (isValidServerUrl(raw)) {
      setPref(key, raw.trim());
    }
  };

  const sourceLookup = useMemo(
    () => new Map(boxSources.map((s) => [s.name, s])),
    [],
  );

  // Mirror settings → local ordered list (sorted by secondaryOrder).
  useEffect(() => {
    const arr = Object.values(settings.boxes).sort(
      (a, b) => a.secondaryOrder - b.secondaryOrder,
    );
    setOrderedBoxes(arr);
  }, [settings]);

  const persistOrder = (next: BoxSetting[]) => {
    const newSettings: Settings = { ...settings, boxes: { ...settings.boxes } };
    next.forEach((b, idx) => {
      newSettings.boxes[b.id] = {
        ...newSettings.boxes[b.id],
        secondaryOrder: idx,
        priority: 10,
        enabled: b.enabled,
      };
    });
    updateSettings(newSettings);
  };

  const handleToggle = (id: string) => {
    const next = orderedBoxes.map((b) =>
      b.id === id ? { ...b, enabled: !b.enabled } : b,
    );
    setOrderedBoxes(next);
    persistOrder(next);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = orderedBoxes.findIndex((b) => b.id === active.id);
    const newIdx = orderedBoxes.findIndex((b) => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(orderedBoxes, oldIdx, newIdx).map((b, idx) => ({
      ...b,
      secondaryOrder: idx,
    }));
    setOrderedBoxes(next);
    persistOrder(next);
  };

  const handleResetOrder = () => {
    const defaults = boxSources.map((s, idx) => ({
      id: s.name,
      enabled: true,
      priority: 10,
      secondaryOrder: idx,
    }));
    setOrderedBoxes(defaults);
    persistOrder(defaults);
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

  return (
    <div className="page">
      <div className="page-inner">
        <header className="page-head">
          <div>
            <h1 className="page-title">{t('settings.title')}</h1>
            <p className="page-sub">{t('settings.subtitle')}</p>
          </div>
        </header>

        <Section
          subtitle={t('settings.section.boxOrderHint')}
          title={t('settings.section.boxOrder')}
        >
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={orderedBoxes.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="dnd-list">
                {orderedBoxes.map((box, idx) => (
                  <SortableRow
                    key={box.id}
                    box={box}
                    index={idx}
                    onToggle={handleToggle}
                    source={sourceLookup.get(box.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            className="btn-subtle"
            onClick={handleResetOrder}
            type="button"
          >
            {t('settings.resetOrder')}
          </button>
        </Section>

        <Section title={t('settings.section.appearance')}>
          <Field hint={t('settings.themeHint')} label={t('settings.theme')}>
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
          <Field hint={t('settings.densityHint')} label={t('settings.density')}>
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
            <TextInput
              ariaLabel={t('settings.timezone')}
              inputMode="numeric"
              invalid={tzInvalid}
              onChange={(v) => {
                setTzDraft(v);
                commitTimezone(v);
              }}
              placeholder={`${MIN_TIMEZONE_OFFSET}…${MAX_TIMEZONE_OFFSET}`}
              value={tzDraft}
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
