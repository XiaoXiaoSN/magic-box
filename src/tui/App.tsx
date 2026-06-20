import type { Box as MagicBoxResult } from '@modules/Box';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useCallback, useState } from 'react';

import { runBoxes } from './runBoxes';

interface ResultListProps {
  boxes: MagicBoxResult[];
}

// renders the matched boxes as a vertical list of name + plaintext output,
// coloring each box's tag and name so the terminal output stays scannable.
// shared by the interactive App and the non-interactive one-shot render.
export function ResultList({ boxes }: ResultListProps): React.ReactElement {
  if (boxes.length === 0) {
    return <Text dimColor>no matching boxes.</Text>;
  }

  return (
    <Box flexDirection="column">
      {boxes.map((box, index) => {
        const { name, plaintextOutput, tag, kind } = box.props;
        // box props carry no stable id; index within a single render is stable.
        const key = `${name}-${index}`;
        return (
          <Box key={key} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color="cyan">{tag ?? '·'} </Text>
              <Text bold color="green">
                {name}
              </Text>
              {kind ? <Text dimColor> [{kind}]</Text> : null}
            </Box>
            <Text>{plaintextOutput}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

interface AppProps {
  // pre-fills the prompt; the user can edit and resubmit.
  initialInput?: string;
}

// interactive prompt: type input, submit, and see matching boxes update live.
export function App({ initialInput }: AppProps): React.ReactElement {
  const [query, setQuery] = useState(initialInput ?? '');
  const [boxes, setBoxes] = useState<MagicBoxResult[]>([]);

  const handleSubmit = useCallback(async (value: string): Promise<void> => {
    setBoxes(await runBoxes(value));
  }, []);

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
      <Box marginTop={1}>
        <ResultList boxes={boxes} />
      </Box>
    </Box>
  );
}

export default App;
