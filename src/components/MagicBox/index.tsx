import CustomizedSnackbar from '@components/Snackbar';
import copyTextToClipboard from '@functions/clipboard';
import { trim } from '@functions/helper';
import type { BoxOptions, Box as BoxType } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import BoxCard from './BoxCard';
import BoxModal from './BoxModal';

interface Props {
  input: string;
  sources?: BoxSource[];
  onPasteInput?: (value: string) => void;
  resetTrigger?: number;
}

const EmptyState = ({ input }: { input: string }): React.JSX.Element => {
  if (trim(input) === '') {
    return (
      <div className="empty" data-testid="magic-box-empty">
        <div aria-hidden="true" className="empty-mark" />
        <div className="empty-title">Start typing</div>
        <div className="empty-sub">
          MagicBox auto-detects formats and shows every useful transformation.
        </div>
      </div>
    );
  }
  return (
    <div className="empty" data-testid="magic-box-empty">
      <div aria-hidden="true" className="empty-mark" />
      <div className="empty-title">No matches</div>
      <div className="empty-sub">
        Try a different format — JSON, JWT, timestamp, cron, base64, math…
      </div>
    </div>
  );
};

// Parses input text and inline `::option=value` directives.
// Example:
//   Hello World
//   ::option1
//   ::Option3=value
// becomes input='Hello World' / options={option1:true, option3:'value'}.
const parseInput = (input: string): [string, BoxOptions] => {
  const regex = /\n::(\w+)=?(.*)/gm;
  const matches = Array.from(input.matchAll(regex), (match) => [
    match[1],
    match[2],
  ]);

  const initOptions: BoxOptions = {};
  const options = matches.reduce((opts, [key, value]) => {
    const updatedOpts = opts;
    updatedOpts[key.toLowerCase()] = value || true;
    return updatedOpts;
  }, initOptions);

  const replacedInput = input.replaceAll(regex, '');
  return [replacedInput, options];
};

const MagicBox = ({
  input: magicIn,
  sources,
  onPasteInput,
  resetTrigger,
}: Props): React.JSX.Element => {
  const [notify, setNotify] = useState([0]);
  const [boxes, setBoxes] = useState([] as BoxType[]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBox, setModalBox] = useState<BoxType | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [tick, setTick] = useState(0);

  const itemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const { filteredBoxSources } = useSettings();

  // Tick once a second only when input actually depends on real time so the
  // Now / Timestamp boxes refresh without re-running sources for static input.
  const needsTick = useMemo(
    () =>
      /\bnow\b/i.test(magicIn) ||
      /^\s*-?\d{9,13}\s*$/.test(magicIn) ||
      /\bip\b/i.test(magicIn),
    [magicIn],
  );

  useEffect(() => {
    if (!needsTick) return undefined;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [needsTick]);

  useEffect(() => {
    if (resetTrigger !== undefined) {
      setSelectedIndex(-1);
    }
  }, [resetTrigger]);

  const copyText = useCallback((text: string) => {
    if (text === undefined || text === null || text === '') return;
    copyTextToClipboard(text);
    setNotify([Date.now()]);
  }, []);

  const handleOpenModal = useCallback((box: BoxType) => {
    setModalBox(box);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setModalBox(null);
  }, []);

  // tick is folded into the dep key so biome's exhaustive-deps check stays
  // happy while still re-firing the effect once a second for live boxes.
  const generationKey = `${magicIn}#${tick}`;

  useEffect(() => {
    let cancelled = false;
    void generationKey; // dependency anchor

    if (trim(magicIn) === '') {
      setBoxes([]);
      setSelectedIndex(-1);
      return () => {
        cancelled = true;
      };
    }

    const boxSources = sources ?? filteredBoxSources;
    const [input, options] = parseInput(magicIn);

    const promises = boxSources.map(async (boxSource) => {
      const generated = await boxSource.generateBoxes(input, options);
      // enrich each box with its source's tag/kind so the chrome can render them
      return generated.map((b) => ({
        ...b,
        props: {
          ...b.props,
          tag: b.props.tag ?? boxSource.tag,
          kind: b.props.kind ?? boxSource.kind,
        },
      }));
    });

    Promise.all(promises).then((resultBoxes) => {
      if (cancelled) return;

      // Path B: respect source order from SettingsContext (already sorted by
      // secondaryOrder); preserve each source's emission order.
      const newBoxes = resultBoxes.filter((box) => box).flat();

      setBoxes(newBoxes);
      setSelectedIndex(-1);
    });

    return () => {
      cancelled = true;
    };
  }, [generationKey, magicIn, sources, filteredBoxSources]);

  useEffect(() => {
    if (boxes.length === 0) {
      setSelectedIndex(-1);
      return;
    }
    if (selectedIndex >= boxes.length) {
      setSelectedIndex(boxes.length - 1);
    }
  }, [boxes, selectedIndex]);

  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        /* noop */
      }
    }
  }, [selectedIndex]);

  // Keyboard shortcuts: Ctrl+N (next), Ctrl+Shift+N / Ctrl+P (prev),
  // Enter (copy), Cmd/Ctrl+Enter (copy + paste back into input).
  useEffect(() => {
    const pasteAsInput = (value: string) => {
      if (onPasteInput) {
        onPasteInput(value);
        return;
      }
      const input = document.querySelector(
        'input[name="magicInput"], textarea[name="magicInput"]',
      ) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!input) return;
      input.focus();
      input.value = value;
      try {
        const evt = new Event('input', { bubbles: true });
        input.dispatchEvent(evt);
      } catch {
        /* noop */
      }
    };

    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement | null)?.tagName?.toUpperCase?.();
      const isTypingField = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();

        if (boxes.length === 0) return;
        const selected = boxes[selectedIndex];
        if (!selected) return;

        const stdout = selected.props.plaintextOutput ?? '';
        if (stdout) {
          copyText(stdout);
          selected.props.onClick(stdout);
          pasteAsInput(stdout);
        }
        return;
      }

      if (isCtrl && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        if (boxes.length === 0) return;

        setSelectedIndex((prev) => {
          const next = e.shiftKey ? prev - 1 : prev + 1;
          if (next < 0) return 0;
          if (next >= boxes.length) return boxes.length - 1;
          return next;
        });
        return;
      }

      if (e.ctrlKey && !e.metaKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (boxes.length === 0) return;
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter' && !isCtrl) {
        if (boxes.length === 0) return;
        const selected = boxes[selectedIndex];
        if (!selected) return;

        if (isTypingField) {
          e.preventDefault();
          e.stopPropagation();
        }

        const stdout = selected.props.plaintextOutput ?? '';
        if (stdout) {
          copyText(stdout);
          selected.props.onClick(stdout);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [boxes, selectedIndex, copyText, onPasteInput]);

  const setItemRef = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      if (el) {
        itemRefs.current.set(idx, el);
      } else {
        itemRefs.current.delete(idx);
      }
    },
    [],
  );

  const renderedBoxes = useMemo(
    () =>
      boxes.map((src, idx) => (
        <BoxCard
          key={src?.props?.name ? `${src.props.name}-${idx}` : idx}
          ref={setItemRef(idx)}
          box={src}
          onCopy={copyText}
          onExpand={
            src.props.showExpandButton !== false
              ? () => handleOpenModal(src)
              : undefined
          }
          onSelect={() => setSelectedIndex(idx)}
          selected={idx === selectedIndex}
        />
      )),
    [boxes, selectedIndex, copyText, handleOpenModal, setItemRef],
  );

  return (
    <React.Fragment>
      {boxes.length > 0 ? renderedBoxes : <EmptyState input={magicIn} />}
      <BoxModal
        box={modalBox}
        onClose={handleCloseModal}
        onCopy={copyText}
        open={modalOpen}
      />
      <CustomizedSnackbar notify={notify} />
    </React.Fragment>
  );
};

export default MagicBox;
