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
import { useEffect, useMemo, useState } from 'react';
import type { BoxSetting, Settings } from '../contexts/SettingsContext';
import { useSettings } from '../contexts/SettingsContext';
import { boxSources } from '../modules/boxSources';

const PREFS_KEY = 'mb_prefs';

interface Prefs {
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
  locale: 'en' | 'tw';
  copyMode: 'enter' | 'paste' | 'off';
  analytics: boolean;
}

const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  density: 'comfortable',
  locale: 'en',
  copyMode: 'enter',
  analytics: false,
};

const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
};

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
  const {
    attributes,
    listeners,
    setNodeRef,
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
      {...attributes}
    >
      <button
        aria-label={`Drag to reorder ${box.id}`}
        className="dnd-grip"
        type="button"
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
        aria-label={box.enabled ? `Disable ${box.id}` : `Enable ${box.id}`}
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

const Toggle = ({ checked, onChange, label }: ToggleProps) => (
  <button
    aria-label={label ?? 'Toggle'}
    aria-pressed={checked}
    className={`toggle${checked ? ' on' : ''}`}
    onClick={() => onChange(!checked)}
    type="button"
  >
    <span className="toggle-dot" />
  </button>
);

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
  const { settings, updateSettings } = useSettings();
  const [orderedBoxes, setOrderedBoxes] = useState<BoxSetting[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

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

  // Persist preferences locally. UI only — behavior wiring is deferred.
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

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
      !window.confirm(
        'Clear all locally saved input, preferences, and order? This cannot be undone.',
      )
    ) {
      return;
    }
    localStorage.clear();
    setPrefs(DEFAULT_PREFS);
    handleResetOrder();
  };

  return (
    <div className="page">
      <div className="page-inner">
        <header className="page-head">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-sub">
              Preferences are saved locally in your browser.
            </p>
          </div>
        </header>

        <Section
          subtitle="Drag to reorder. Matches on the home screen appear in this order. Toggle off to hide a box."
          title="Box order"
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
            Reset to default
          </button>
        </Section>

        <Section title="Appearance">
          <Field hint="Match your OS or pick a fixed mode." label="Theme">
            <Segmented
              onChange={(v) => setPref('theme', v)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
              value={prefs.theme}
            />
          </Field>
          <Field hint="Compact fits more boxes per screen." label="Density">
            <Segmented
              onChange={(v) => setPref('density', v)}
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ]}
              value={prefs.density}
            />
          </Field>
        </Section>

        <Section title="Input &amp; Output">
          <Field
            hint="Used for human-readable cron and dates."
            label="Language"
          >
            <Select
              onChange={(v) => setPref('locale', v)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'tw', label: '繁體中文' },
              ]}
              value={prefs.locale}
            />
          </Field>
          <Field
            hint="What Enter does when focused on a box."
            label="Enter behavior"
          >
            <Segmented
              onChange={(v) => setPref('copyMode', v)}
              options={[
                { value: 'enter', label: 'Copy' },
                { value: 'paste', label: 'Copy & paste back' },
                { value: 'off', label: 'Off' },
              ]}
              value={prefs.copyMode}
            />
          </Field>
        </Section>

        <Section title="Shortcuts">
          <div className="shortcut-list">
            <Shortcut keys={['⌃', 'N']} label="Next box" />
            <Shortcut keys={['⌃', '⇧', 'N']} label="Previous box" />
            <Shortcut keys={['⌃', 'P']} label="Previous box (alt)" />
            <Shortcut keys={['↵']} label="Copy selected output" />
            <Shortcut keys={['⌘', '↵']} label="Paste output back into input" />
          </div>
        </Section>

        <Section title="Privacy">
          <Field
            hint="Help improve MagicBox by sharing anonymous box-match stats. Never your input."
            label="Anonymous usage"
          >
            <Toggle
              checked={prefs.analytics}
              label="Anonymous usage"
              onChange={(v) => setPref('analytics', v)}
            />
          </Field>
          <Field
            hint="Removes saved input, preferences, order and history."
            label="Clear local data"
          >
            <button
              className="btn-danger"
              onClick={handleClearLocalData}
              type="button"
            >
              Clear
            </button>
          </Field>
        </Section>

        <Section title="About">
          <div className="about">
            <div className="about-row">
              <span>Version</span>
              <span className="mono">{buildVersion}</span>
            </div>
            <div className="about-row">
              <span>License</span>
              <span className="mono">MIT</span>
            </div>
            <div className="about-row">
              <span>Source</span>
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
