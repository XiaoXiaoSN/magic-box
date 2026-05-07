import MagicBox from '@components/MagicBox';
import type { BoxSource } from '@modules/BoxSource';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';

const SELECTION_KEY = 'mb:list:selected';
const COLLAPSED_KEY = 'mb:list:collapsed';

const KIND_ORDER = [
  'Decode',
  'Encode',
  'Time',
  'Format',
  'Transform',
  'Compute',
  'Generate',
  'Analyze',
  'Info',
];

const Chevron = ({ direction }: { direction: 'left' | 'right' | 'down' }) => {
  const points =
    direction === 'left'
      ? '15 18 9 12 15 6'
      : direction === 'right'
        ? '9 18 15 12 9 6'
        : '6 9 12 15 18 9';
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
      width="14"
    >
      <polyline points={points} />
    </svg>
  );
};

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="14"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="14"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ClearIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="12"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
    width="12"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const ToolsListPage = (): React.JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === '1',
  );
  const { filteredBoxSources } = useSettings();

  const [selectedName, setSelectedName] = useState<string | null>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('box');
    return fromUrl ?? localStorage.getItem(SELECTION_KEY);
  });

  // Persist sidebar collapsed state.
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Persist selected box.
  useEffect(() => {
    if (selectedName) localStorage.setItem(SELECTION_KEY, selectedName);
  }, [selectedName]);

  // Sync URL ?box= param ↔ state when URL changes externally.
  useEffect(() => {
    const fromUrl = searchParams.get('box');
    if (fromUrl && fromUrl !== selectedName) {
      setSelectedName(fromUrl);
    }
  }, [searchParams, selectedName]);

  // Drawer Esc-to-close.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const filteredSources = useMemo(() => {
    if (!query) return filteredBoxSources;
    const q = query.toLowerCase();
    return filteredBoxSources.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.kind?.toLowerCase().includes(q),
    );
  }, [filteredBoxSources, query]);

  const grouped = useMemo(() => {
    const byKind: Record<string, BoxSource[]> = {};
    for (const b of filteredSources) {
      const k = b.kind ?? 'Other';
      if (!byKind[k]) byKind[k] = [];
      byKind[k].push(b);
    }
    const orderedKinds = [
      ...KIND_ORDER.filter((k) => byKind[k]),
      ...Object.keys(byKind).filter((k) => !KIND_ORDER.includes(k)),
    ];
    return orderedKinds.map((k) => [k, byKind[k]] as const);
  }, [filteredSources]);

  const selected = useMemo(() => {
    if (!selectedName) return filteredBoxSources[0];
    return (
      filteredBoxSources.find((b) => b.name === selectedName) ??
      filteredBoxSources[0]
    );
  }, [filteredBoxSources, selectedName]);

  const handleSelect = (source: BoxSource) => {
    setSelectedName(source.name);
    setDrawerOpen(false);
    const next = new URLSearchParams(searchParams);
    next.set('box', source.name);
    setSearchParams(next, { replace: true });
  };

  if (!selected) {
    return (
      <div className="list-page">
        <div className="preview-empty">
          <div className="preview-empty-mark" />
          <div className="preview-empty-title">No boxes available</div>
          <div className="preview-empty-sub">
            Enable some in Settings to get started.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="list-page"
      data-browser-open={drawerOpen ? 'true' : 'false'}
      data-sidebar-collapsed={collapsed ? 'true' : 'false'}
    >
      <button
        aria-expanded={drawerOpen}
        className="browser-toggle"
        onClick={() => setDrawerOpen((o) => !o)}
        type="button"
      >
        <span className="browser-toggle-label">Box</span>
        <span className="browser-toggle-current">{selected.name}</span>
        <span className="browser-toggle-chevron">
          <Chevron direction="down" />
        </span>
      </button>
      <div
        aria-hidden="true"
        className="browser-backdrop"
        onClick={() => setDrawerOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setDrawerOpen(false);
        }}
      />

      {collapsed ? (
        <button
          aria-label="Expand sidebar"
          className="browser-expand"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          type="button"
        >
          <Chevron direction="right" />
        </button>
      ) : null}

      <div className="list-shell">
        <aside className="browser">
          <header className="browser-head">
            <div>
              <h1 className="browser-title">Boxes</h1>
            </div>
            <button
              aria-label="Collapse sidebar"
              className="browser-collapse"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              type="button"
            >
              <Chevron direction="left" />
            </button>
          </header>
          <div className="browser-search">
            <SearchIcon />
            <input
              aria-label="Search boxes"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search boxes"
              value={query}
            />
            {query ? (
              <button
                aria-label="Clear search"
                className="browser-search-clear"
                onClick={() => setQuery('')}
                type="button"
              >
                <ClearIcon />
              </button>
            ) : null}
          </div>

          <div className="browser-list">
            {grouped.map(([kind, items]) => (
              <div className="browser-group" key={kind}>
                <div className="browser-group-head">
                  <span>{kind}</span>
                  <span className="browser-group-count">{items.length}</span>
                </div>
                {items.map((b) => (
                  <button
                    className={`browser-row${b.name === selected.name ? ' active' : ''}`}
                    key={b.name}
                    onClick={() => handleSelect(b)}
                    type="button"
                  >
                    <span aria-hidden="true" className="browser-row-tag">
                      {b.tag ?? '·'}
                    </span>
                    <span className="browser-row-title">{b.name}</span>
                    <span className="browser-row-chevron">
                      <Chevron direction="right" />
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {filteredSources.length === 0 ? (
              <div className="browser-empty">
                No boxes match &ldquo;{query}&rdquo;.
              </div>
            ) : null}
          </div>
        </aside>

        <section className="preview">
          <PreviewPane key={selected.name} source={selected} />
        </section>
      </div>
    </div>
  );
};

interface PreviewPaneProps {
  source: BoxSource;
}

const PreviewPane = ({ source }: PreviewPaneProps): React.JSX.Element => {
  const [input, setInput] = useState(source.defaultInput ?? '');
  const [magicIn, setMagicIn] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setMagicIn(input), 400);
    return () => window.clearTimeout(id);
  }, [input]);

  return (
    <div className="preview-stack">
      <div className="preview-meta">
        <h2 className="preview-title">{source.name}</h2>
        {source.kind ? (
          <span className="preview-kind">{source.kind}</span>
        ) : null}
      </div>
      {source.description ? (
        <p className="preview-desc">{source.description}</p>
      ) : null}

      <div className="preview-col-head">
        <span aria-hidden="true" className="dot" />
        <span>Input</span>
        <span className="preview-hint">try your own — it updates live</span>
      </div>
      <div className="preview-input-card">
        <textarea
          className="mono"
          onChange={(e) => setInput(e.target.value)}
          rows={Math.min(8, Math.max(3, input.split('\n').length + 1))}
          spellCheck={false}
          value={input}
        />
      </div>

      <div className="preview-col-head">
        <span aria-hidden="true" className="dot" />
        <span>Output</span>
      </div>
      <div className="boxes">
        <MagicBox input={magicIn} sources={[source]} />
      </div>
    </div>
  );
};

export default ToolsListPage;
