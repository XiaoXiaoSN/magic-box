import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';

import { NotingMatchBoxTemplate } from '@components/BoxTemplate';
import CustomizedSnackbar from '@components/Snackbar';
import copyTextToClipboard from '@functions/clipboard';
import { trim } from '@functions/helper';

import { useSettings } from '../../contexts/SettingsContext';

import type { Box as BoxType, BoxOptions, BoxTemplate } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';

interface Props {
  input: string;
  sources?: BoxSource[];
  onPasteInput?: (value: string) => void;
  resetTrigger?: number;
}

// Interface for BoxComponent with static supportsLarge property.
interface LargeSupportBoxComponent extends BoxTemplate {
  supportsLarge?: boolean;
}

// Type guard to check if a BoxComponent supports the 'large' prop.
function isLargeSupportBoxComponent(
  comp: BoxTemplate
): comp is LargeSupportBoxComponent {
  return !!(comp as LargeSupportBoxComponent).supportsLarge;
}

// hoist static JSX to avoid re-creating on every render
const EmptyState = <NotingMatchBoxTemplate />;

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

  const itemRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const { filteredBoxSources } = useSettings();

  // reset selection when parent triggers reset
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setSelectedIndex(-1);
    }
  }, [resetTrigger]);

  // This parses input text to extract the input and options.
  //
  // Example:
  //   Hello World
  //   ::option1
  //   ::option2=
  //   ::Option3=value
  //
  // Will be parsed to:
  //   input: Hello World (string)
  //   options: { option1: true, option2: true, option3: 'value' } (object)
  const parseInput = useCallback((input: string): [string, BoxOptions] => {
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
  }, []);

  const copyText = useCallback((text: string) => {
    copyTextToClipboard(text);
    setNotify([Date.now()]);
  }, []);

  const handleOpenModal = (box: BoxType) => {
    setModalBox(box);
    setModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setModalBox(null);
  }, []);

  // memoize modal content to avoid re-creating on every render
  const modalContent = useMemo(() => {
    if (!modalBox) return null;

    const Comp = modalBox.boxTemplate;
    const props = {
      name: modalBox.props.name,
      onClick: (output: string) => {
        copyText(output);
        modalBox.props.onClick(output);
      },
      onClose: handleCloseModal,
      options: modalBox.props.options,
      plaintextOutput: modalBox.props.plaintextOutput,
      priority: modalBox.props.priority,
    };

    if (isLargeSupportBoxComponent(Comp) && Comp.supportsLarge) {
      return <Comp {...props} largeModal />;
    }
    return <Comp {...props} />;
  }, [modalBox, copyText, handleCloseModal]);

  useEffect(() => {
    let cancelled = false;

    if (trim(magicIn) === '') {
      setBoxes([]);
      setSelectedIndex(-1);
      return () => {
        cancelled = true;
      };
    }

    const boxSources = sources ?? filteredBoxSources;
    const [input, options] = parseInput(magicIn);

    const promises = boxSources.map(async (boxSource) =>
      boxSource.generateBoxes(input, options)
    );
    Promise.all(promises).then((resultBoxes) => {
      if (cancelled) return;

      const newBoxes = resultBoxes
        .filter((box) => box)
        .flat()
        .sort((a, b) => {
          const priorityA = a.props.priority ?? 0;
          const priorityB = b.props.priority ?? 0;
          return priorityB - priorityA;
        })
        .map((box) => {
          const updatedBox = box;
          updatedBox.props.priority = box.props.priority ?? 0;
          return updatedBox;
        });

      setBoxes(newBoxes);
      setSelectedIndex(-1);

      console.log(`input: ${input}\n`, 'boxes:', newBoxes, 'options:', options);
    });
    return () => {
      cancelled = true;
    };
  }, [magicIn, sources, filteredBoxSources, parseInput]);

  // Ensure selected index stays within bounds and reset when boxes change
  useEffect(() => {
    if (boxes.length === 0) {
      setSelectedIndex(-1);
      return;
    }
    if (selectedIndex >= boxes.length) {
      setSelectedIndex(boxes.length - 1);
    }
  }, [boxes, selectedIndex]);

  // Scroll the selected item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        // noop
      }
    }
  }, [selectedIndex]);

  // Keyboard handlers: Ctrl+N (next), Ctrl+Shift+N (prev), Enter (copy)
  useEffect(() => {
    const pasteAsInput = (value: string) => {
      if (onPasteInput) {
        onPasteInput(value);
        return;
      }
      // Fallback: try to find input by name attribute instead of ID
      const input = document.querySelector(
        'input[name="magicInput"]'
      ) as HTMLInputElement | null;
      if (!input) return;
      input.focus();
      // Set value and notify React via input event
      input.value = value;
      try {
        const evt = new Event('input', { bubbles: true });
        input.dispatchEvent(evt);
      } catch {
        // noop
      }
    };

    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey; // support macOS
      const tag = (e.target as HTMLElement | null)?.tagName?.toUpperCase?.();
      const isTypingField = tag === 'INPUT' || tag === 'TEXTAREA';

      // Copy + Paste into input with Cmd/Ctrl + Enter
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

      // Navigate with Ctrl+N / Ctrl+Shift+N
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

      // Navigate with Ctrl+P (previous)
      if (e.ctrlKey && !e.metaKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();

        if (boxes.length === 0) return;

        setSelectedIndex((prev) => {
          const next = prev - 1;
          if (next < 0) return 0;
          return next;
        });
        return;
      }

      // Copy selected with Enter (works even when typing in input/textarea)
      if (e.key === 'Enter' && !isCtrl) {
        if (boxes.length === 0) return;
        
        const selected = boxes[selectedIndex];
        if (!selected) return;

        // Avoid inserting a newline in inputs when copying
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

  return (
    <React.Fragment>
      {boxes.length > 0 ? (
        boxes.map((src, idx) => {
          const {
            name,
            plaintextOutput: stdout,
            options,
            onClick,
            priority,
          } = src.props;

          const onClickWithCopy = (output: string) => {
            copyText(output);
            onClick(output);
          };

          const showExpand = src.props.showExpandButton !== false;
          return (
            <button
              key={src?.props.name || idx}
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(idx, el);
                } else {
                  itemRefs.current.delete(idx);
                }
              }}
              data-testid="magic-box-result"
              onClick={() => setSelectedIndex(idx)}
              type="button"
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {showExpand ? (
                <IconButton
                  aria-label="expand"
                  component="span"
                  onClick={() => handleOpenModal(src)}
                  size="small"
                  style={{
                    position: 'absolute',
                    top: '.6rem',
                    right: '.6rem',
                    zIndex: 2,
                    background: 'rgba(255,255,255,0.8)',
                  }}
                >
                  <ZoomOutMapIcon fontSize="small" />
                </IconButton>
              ) : null}
              <src.boxTemplate
                name={name}
                onClick={onClickWithCopy}
                options={options}
                plaintextOutput={stdout}
                priority={priority}
                selected={idx === selectedIndex}
              />
            </button>
          );
        })
      ) : (
        EmptyState
      )}
      <Modal
        aria-describedby="box-modal-description"
        aria-labelledby="box-modal-title"
        onClose={handleCloseModal}
        open={modalOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: '95vw',
            maxHeight: '90vh',
            width: '100%',
            height: 'auto',
            bgcolor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {modalContent ? <div>{modalContent}</div> : null}
        </Box>
      </Modal>
      <CustomizedSnackbar notify={notify} />
    </React.Fragment>
  );
};

export default MagicBox;
