import { Select, Toggle } from '@components/Controls';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BoxSource } from '@modules/BoxSource';
import { boxSources } from '@modules/boxSources';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useLocale } from '../../contexts/LocaleContext';
import { useSettings } from '../../contexts/SettingsContext';
import { getKindLabel, getSourceDisplay } from './display';
import PreviewPane from './PreviewPane';
import './boxes.css';

const LocalAIBoxSettings = lazy(async () => import('./LocalAIBoxSettings'));
const kinds = [...new Set(boxSources.map((source) => source.kind))].sort();
type Status = 'all' | 'enabled' | 'disabled';

interface BoxRowProps {
  source: BoxSource;
  index: number;
  showOrder: boolean;
  enabled: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

function BoxRow({
  source,
  index,
  showOrder,
  enabled,
  selected,
  onSelect,
  onToggle,
}: BoxRowProps): React.JSX.Element {
  const { t } = useLocale();
  const display = getSourceDisplay(source, t);
  return (
    <div className={`box-library-row${selected ? ' is-selected' : ''}`}>
      {showOrder ? (
        <span className="box-library-position mono">
          {String(index + 1).padStart(2, '0')}
        </span>
      ) : null}
      <button
        title={`${display.kind}: ${display.description}`}
        className="box-library-select"
        onClick={onSelect}
        type="button"
        aria-pressed={selected}
      >
        <span className="browser-row-tag" aria-hidden="true">
          {source.tag}
        </span>
        <span className="box-library-name">
          <strong>{display.name}</strong>
        </span>
      </button>
      <Toggle
        checked={enabled}
        label={t(
          enabled ? 'settings.disableBoxLabel' : 'settings.enableBoxLabel',
          { name: source.name },
        )}
        onChange={onToggle}
      />
    </div>
  );
}

interface SortableBoxRowProps extends BoxRowProps {
  count: number;
  onMove: (offset: number) => void;
}

function SortableBoxRow({
  count,
  onMove,
  ...props
}: SortableBoxRowProps): React.JSX.Element {
  const { t } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.source.name });
  return (
    <div
      ref={setNodeRef}
      className={`box-sortable${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className="dnd-grip"
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t('settings.dragReorderLabel', { name: props.source.name })}
      >
        ⠿
      </button>
      <BoxRow {...props} />
      <div className="box-order-buttons">
        <button
          type="button"
          disabled={props.index === 0}
          onClick={() => onMove(-1)}
          aria-label={t('boxes.moveUp', { name: props.source.name })}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={props.index === count - 1}
          onClick={() => onMove(1)}
          aria-label={t('boxes.moveDown', { name: props.source.name })}
        >
          ↓
        </button>
      </div>
    </div>
  );
}

export default function BoxesPage(): React.JSX.Element {
  const { t } = useLocale();
  const { settings, updateSettings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [kind, setKind] = useState('all');
  const [arranging, setArranging] = useState(false);
  const [panel, setPanel] = useState<'preview' | 'settings'>('preview');
  const [mobileDetail, setMobileDetail] = useState(() =>
    searchParams.has('box'),
  );
  const [rememberedName, setRememberedName] = useState(() =>
    localStorage.getItem('mb:list:selected'),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ordered = useMemo(
    () =>
      [...boxSources].sort(
        (a, b) =>
          settings.boxes[a.name].secondaryOrder -
          settings.boxes[b.name].secondaryOrder,
      ),
    [settings.boxes],
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordered.filter((source) => {
      const enabled = settings.boxes[source.name].enabled;
      const display = getSourceDisplay(source, t);
      return (
        (status === 'all' || enabled === (status === 'enabled')) &&
        (kind === 'all' || source.kind === kind) &&
        (!q ||
          [
            source.name,
            source.description,
            source.kind,
            display.name,
            display.description,
            display.kind,
          ].some((text) => text?.toLowerCase().includes(q)))
      );
    });
  }, [ordered, settings.boxes, query, status, kind, t]);
  const selectedName = searchParams.get('box') ?? rememberedName;
  const selected =
    visible.find((source) => source.name === selectedName) ?? visible[0];
  const enabledCount = ordered.filter(
    (source) => settings.boxes[source.name].enabled,
  ).length;

  const selectSource = (source: BoxSource) => {
    setRememberedName(source.name);
    localStorage.setItem('mb:list:selected', source.name);
    const next = new URLSearchParams(searchParams);
    if (next.get('box') !== source.name) next.delete('input');
    next.set('box', source.name);
    setSearchParams(next);
    setMobileDetail(!arranging);
  };
  const toggleSource = (source: BoxSource) => {
    const box = settings.boxes[source.name];
    updateSettings({
      ...settings,
      boxes: {
        ...settings.boxes,
        [source.name]: { ...box, enabled: !box.enabled },
      },
    });
  };
  const persistOrder = (sources: BoxSource[]) => {
    const boxes = { ...settings.boxes };
    sources.forEach((source, index) => {
      boxes[source.name] = { ...boxes[source.name], secondaryOrder: index };
    });
    updateSettings({ ...settings, boxes });
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ordered.findIndex((source) => source.name === active.id);
    const to = ordered.findIndex((source) => source.name === over.id);
    if (from >= 0 && to >= 0) persistOrder(arrayMove(ordered, from, to));
  };
  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setKind('all');
  };
  const selectedEnabled = selected
    ? settings.boxes[selected.name].enabled
    : false;

  return (
    <div className="boxes-page" data-detail-open={mobileDetail}>
      <div className="boxes-workspace">
        <section className="box-library" aria-label={t('boxes.library')}>
          <div className="box-library-toolbar">
            <div className="box-library-summary">
              <strong>{t('boxes.total', { count: ordered.length })}</strong>
              <button
                type="button"
                className={`btn-subtle${arranging ? ' is-active' : ''}`}
                title={t('boxes.orderHint')}
                aria-pressed={arranging}
                onClick={() => {
                  if (selected) setRememberedName(selected.name);
                  clearFilters();
                  setArranging(!arranging);
                }}
              >
                {t(arranging ? 'boxes.done' : 'boxes.reorder')}
              </button>
            </div>
            {arranging ? (
              <div className="box-reorder-note">
                <button
                  type="button"
                  className="btn-subtle"
                  onClick={() => persistOrder(boxSources)}
                >
                  {t('boxes.resetOrder')}
                </button>
              </div>
            ) : (
              <>
                <div className="box-search">
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                  <input
                    aria-label={t('toolsList.search')}
                    placeholder={t('toolsList.search')}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label={t('toolsList.clearSearch')}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                <fieldset
                  className="box-status-filters"
                  aria-label={t('boxes.status')}
                >
                  {(['all', 'enabled', 'disabled'] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={status === value}
                      onClick={() => setStatus(value)}
                    >
                      {t(`boxes.${value}`)}{' '}
                      <span>
                        {value === 'all'
                          ? ordered.length
                          : value === 'enabled'
                            ? enabledCount
                            : ordered.length - enabledCount}
                      </span>
                    </button>
                  ))}
                </fieldset>
                <div className="box-library-filter">
                  <Select
                    label={t('boxes.category')}
                    value={kind}
                    onChange={setKind}
                    options={[
                      { value: 'all', label: t('boxes.allCategories') },
                      ...kinds.map((value) => ({
                        value,
                        label: getKindLabel(value, t),
                      })),
                    ]}
                  />
                  {visible.length !== ordered.length ? (
                    <span>{t('boxes.showing', { count: visible.length })}</span>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div className="box-library-list">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={arranging ? ordered.map((source) => source.name) : []}
                strategy={verticalListSortingStrategy}
              >
                {visible.map((source) => {
                  const index = ordered.indexOf(source);
                  const props = {
                    source,
                    index,
                    showOrder: arranging,
                    enabled: settings.boxes[source.name].enabled,
                    selected: selected?.name === source.name,
                    onSelect: () => selectSource(source),
                    onToggle: () => toggleSource(source),
                  };
                  return arranging ? (
                    <SortableBoxRow
                      key={source.name}
                      {...props}
                      count={ordered.length}
                      onMove={(offset) =>
                        persistOrder(arrayMove(ordered, index, index + offset))
                      }
                    />
                  ) : (
                    <BoxRow key={source.name} {...props} />
                  );
                })}
              </SortableContext>
            </DndContext>
            {visible.length === 0 ? (
              <div className="box-library-empty">
                <strong>{t('boxes.noResults')}</strong>
                <p>{t('boxes.noResultsHint')}</p>
                <button
                  className="btn-subtle"
                  type="button"
                  onClick={clearFilters}
                >
                  {t('boxes.clearFilters')}
                </button>
              </div>
            ) : null}
          </div>
        </section>
        <section className="box-detail" aria-label={t('boxes.details')}>
          <button
            className="btn-subtle box-detail-back"
            type="button"
            onClick={() => setMobileDetail(false)}
          >
            ← {t('boxes.back')}
          </button>
          {selected ? (
            <>
              <div className="box-detail-toolbar">
                <div className="box-detail-tabs">
                  <button
                    type="button"
                    aria-pressed={panel === 'preview'}
                    onClick={() => setPanel('preview')}
                  >
                    {t('boxes.preview')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={panel === 'settings'}
                    onClick={() => setPanel('settings')}
                  >
                    {t('nav.settings')}
                  </button>
                </div>
                <span
                  className={`box-status${selectedEnabled ? ' is-enabled' : ''}`}
                >
                  <span className="box-status-dot" aria-hidden="true" />
                  {t(selectedEnabled ? 'boxes.enabled' : 'boxes.disabled')}
                </span>
              </div>
              {panel === 'preview' ? (
                <PreviewPane
                  key={`${selected.name}:${searchParams.get('input') ?? ''}`}
                  source={selected}
                />
              ) : (
                <div className="box-settings-panel" key={selected.name}>
                  <div>
                    <h2 className="preview-title">
                      {getSourceDisplay(selected, t).name}
                    </h2>
                  </div>
                  <div
                    className="box-availability"
                    title={t('boxes.showOnHomeHint')}
                  >
                    <div>
                      <strong>{t('boxes.showOnHome')}</strong>
                    </div>
                    <Toggle
                      checked={selectedEnabled}
                      onChange={() => toggleSource(selected)}
                      label={t('boxes.showOnHome')}
                    />
                  </div>
                  {selected.name === 'Local AI' ? (
                    <Suspense fallback={<div className="loader" />}>
                      <LocalAIBoxSettings />
                    </Suspense>
                  ) : null}
                  <Link
                    to="/settings"
                    className="box-global-settings"
                    title={t('boxes.inlineSettingsHint')}
                  >
                    {t('boxes.globalSettings')} ↗
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="box-detail-empty">
              <h2>{t('boxes.noResults')}</h2>
              <p>{t('boxes.noResultsHint')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
