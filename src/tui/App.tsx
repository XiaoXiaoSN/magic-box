import type { Box as MagicBoxResult } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type ClipboardMethod, copyToClipboard } from './clipboard';
import { moveSelection, terminalResults, terminalText } from './model';
import { runTerminalSources, type TerminalSourceError } from './runBoxes';

interface ResultListProps {
  boxes: MagicBoxResult[];
  selectedIndex?: number;
}

// Renders the renderer-neutral plaintext fields so sources never need an Ink component.
export function ResultList({
  boxes,
  selectedIndex,
}: ResultListProps): React.ReactElement {
  if (boxes.length === 0) {
    return <Text dimColor>no matching boxes.</Text>;
  }

  return (
    <Box flexDirection="column">
      {terminalResults(boxes).map(({ name, output, tag, kind }, index) => {
        const key = `${name}-${index}`;
        return (
          <Box key={key} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color="cyan">
                {selectedIndex === index ? '›' : terminalText(tag ?? '·')}{' '}
              </Text>
              <Text bold color="green">
                {terminalText(name)}
              </Text>
              {kind ? <Text dimColor> [{terminalText(kind)}]</Text> : null}
            </Box>
            <Text>{terminalText(output)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

interface AppProps {
  initialInput?: string;
  sources?: BoxSource[];
  generate?: typeof runTerminalSources;
  copy?: (
    text: string,
  ) => ClipboardMethod | undefined | Promise<ClipboardMethod | undefined>;
}

export function App({
  initialInput,
  sources,
  generate = runTerminalSources,
  copy = copyToClipboard,
}: AppProps): React.ReactElement {
  const [query, setQuery] = useState(initialInput ?? '');
  const [boxes, setBoxes] = useState<MagicBoxResult[]>([]);
  const [errors, setErrors] = useState<TerminalSourceError[]>([]);
  const [selected, setSelected] = useState(0);
  const [resultsFocused, setResultsFocused] = useState(false);
  const [pending, setPending] = useState(Boolean(initialInput?.trim()));
  const [status, setStatus] = useState(
    'Type to search · Up/Down selects · Enter or y copies · Esc exits',
  );
  const request = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const { exit } = useApp();

  const copySelected = useCallback(async (): Promise<void> => {
    const box = boxes[selected];
    if (!box) {
      setStatus('No result selected');
      return;
    }
    try {
      const method = await copy(box.props.plaintextOutput);
      setStatus(
        method === 'system'
          ? 'Copied to the system clipboard'
          : 'Clipboard request sent (terminal OSC 52 support may be required)',
      );
    } catch (error) {
      setStatus(`Copy failed: ${String(error)}`);
    }
  }, [boxes, copy, selected]);

  const changeQuery = useCallback(
    (value: string): void => {
      if (value === query) return;
      request.current += 1;
      activeController.current?.abort();
      activeController.current = null;
      setQuery(value);
      setBoxes([]);
      setErrors([]);
      setSelected(0);
      setResultsFocused(false);
      setPending(value.trim().length > 0);
      setStatus(
        value.trim().length > 0
          ? 'Waiting for results…'
          : 'Type to search · Up/Down selects · Enter or y copies · Esc exits',
      );
    },
    [query],
  );

  const runQuery = useCallback(
    (value: string, requestId: number, signal: AbortSignal): void => {
      setStatus('Converting…');
      void generate(value, sources, signal).then(
        (result) => {
          if (requestId !== request.current) return;
          setBoxes(result.boxes);
          setErrors(result.errors);
          setSelected(0);
          setPending(false);
          setStatus(
            `${result.boxes.length} results${result.errors.length > 0 ? ` · ${result.errors.length} source errors` : ''} · Up/Down selects · Enter or y copies · Esc exits`,
          );
        },
        (error: unknown) => {
          if (requestId !== request.current) return;
          setBoxes([]);
          setErrors([]);
          setPending(false);
          setStatus(`Conversion failed: ${String(error)}`);
        },
      );
    },
    [generate, sources],
  );

  useEffect(() => {
    if (!query.trim()) {
      setBoxes([]);
      setErrors([]);
      setSelected(0);
      setPending(false);
      return;
    }

    const requestId = request.current;
    const controller = new AbortController();
    activeController.current = controller;
    const timeout = setTimeout(
      () => runQuery(query, requestId, controller.signal),
      200,
    );
    return () => {
      clearTimeout(timeout);
      controller.abort();
      if (activeController.current === controller)
        activeController.current = null;
    };
  }, [query, runQuery]);

  useEffect(
    () => () => {
      request.current += 1;
      activeController.current?.abort();
    },
    [],
  );

  useInput((input, key) => {
    if (key.escape) {
      exit();
      return;
    }
    if (key.upArrow || key.downArrow) {
      if (boxes.length === 0) return;
      setResultsFocused(true);
      setSelected((current) =>
        moveSelection(current, key.downArrow ? 1 : -1, boxes.length),
      );
      return;
    }
    if (key.tab) {
      setResultsFocused(false);
      return;
    }
    if (key.ctrl && input === 'y') {
      void copySelected();
      return;
    }
    if (resultsFocused && input === 'y') {
      void copySelected();
      return;
    }
    if (resultsFocused && key.return) {
      void copySelected();
      return;
    }
    if (resultsFocused && input.length === 1 && !key.ctrl) {
      setResultsFocused(false);
      changeQuery(`${query}${input}`);
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta">magic-box ❯ </Text>
        {resultsFocused ? (
          <Text>{terminalText(query)}</Text>
        ) : (
          <TextInput
            onChange={changeQuery}
            onSubmit={() => void copySelected()}
            value={query}
          />
        )}
      </Box>
      <Text dimColor>{terminalText(status)}</Text>
      <Box marginTop={1}>
        {query.trim().length === 0 ? (
          <Text dimColor>Type input to see matching boxes.</Text>
        ) : pending ? (
          <Text dimColor>Waiting for matching boxes…</Text>
        ) : (
          <ResultList boxes={boxes} selectedIndex={selected} />
        )}
      </Box>
      {errors.map((error) => (
        <Text color="yellow" key={error.id}>
          {terminalText(`${error.name}: ${error.message}`)}
        </Text>
      ))}
    </Box>
  );
}

export default App;
