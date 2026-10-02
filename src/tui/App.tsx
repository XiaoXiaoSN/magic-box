import type { Box as MagicBoxResult } from '@modules/Box';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useCallback, useEffect, useRef, useState } from 'react';

import { copyToClipboard } from './clipboard';
import { moveSelection, terminalResults, terminalText } from './model';
import { runBoxes } from './runBoxes';

interface ResultListProps {
  boxes: MagicBoxResult[];
  selectedIndex?: number;
}

// renders the matched boxes as a vertical list of name + plaintext output,
// coloring each box's tag and name so the terminal output stays scannable.
// shared by the interactive App and the non-interactive one-shot render.
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
        // box props carry no stable id; index within a single render is stable.
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
  // pre-fills the prompt; the user can edit and resubmit.
  initialInput?: string;
  generate?: typeof runBoxes;
  copy?: (text: string) => void | Promise<void>;
}

// interactive prompt: type input, submit, and see matching boxes update live.
export function App({
  initialInput,
  generate = runBoxes,
  copy = copyToClipboard,
}: AppProps): React.ReactElement {
  const [query, setQuery] = useState(initialInput ?? '');
  const [boxes, setBoxes] = useState<MagicBoxResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState(
    'Enter: convert · Ctrl+N/P: next/previous · Ctrl+Y: copy · Ctrl+C: exit',
  );
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );

  const handleSubmit = useCallback(
    async (value: string): Promise<void> => {
      const id = ++request.current;
      setStatus('Converting…');
      try {
        const next = await generate(value);
        if (id !== request.current) return;
        setBoxes(next);
        setSelected(0);
        setStatus(`${next.length} results · Ctrl+N/P: select · Ctrl+Y: copy`);
      } catch (error) {
        if (id === request.current)
          setStatus(`Conversion failed: ${String(error)}`);
      }
    },
    [generate],
  );

  useInput((input, key) => {
    if (!key.ctrl) return;
    if (input === 'n' || input === 'p') {
      setSelected((current) =>
        moveSelection(current, input === 'n' ? 1 : -1, boxes.length),
      );
    } else if (input === 'y' && boxes[selected]) {
      const output = boxes[selected].props.plaintextOutput;
      void Promise.resolve()
        .then(() => copy(output))
        .then(
          () =>
            setStatus(
              'Clipboard request sent (requires OSC 52 support in your terminal)',
            ),
          (error) => setStatus(`Copy failed: ${String(error)}`),
        );
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta">magic-box ❯ </Text>
        <TextInput
          onChange={setQuery}
          onSubmit={(value) => void handleSubmit(value)}
          value={query}
        />
      </Box>
      <Text dimColor>{terminalText(status)}</Text>
      <Box marginTop={1}>
        <ResultList boxes={boxes} selectedIndex={selected} />
      </Box>
    </Box>
  );
}

export default App;
