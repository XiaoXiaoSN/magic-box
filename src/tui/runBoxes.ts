import { parseInput } from '@functions/parseOptions';
import { type Box, errorBox } from '@modules/Box';
import type { BoxSource, BoxSourceContext } from '@modules/BoxSource';

import { tuiBoxSources } from './sources';

export interface TerminalSourceError {
  id: string;
  name: string;
  message: string;
}

export interface TerminalRunResult {
  boxes: Box[];
  errors: TerminalSourceError[];
}

interface SourceRunResult {
  boxes: Box[];
  errors: TerminalSourceError[];
}

// Runs only the selected headless sources and keeps source failures out of results.
export async function runTerminalSources(
  rawInput: string,
  sources: readonly BoxSource[] = tuiBoxSources,
  signal: AbortSignal = new AbortController().signal,
): Promise<TerminalRunResult> {
  const [input, options] = parseInput(rawInput);
  const context: BoxSourceContext = { signal, preview: false };
  const grouped: SourceRunResult[] = await Promise.all(
    sources.map(async (source): Promise<SourceRunResult> => {
      if (signal.aborted) return { boxes: [], errors: [] };
      try {
        const generated = await source.generateBoxes(input, options, context);
        const sourceId = source.id ?? source.name;
        const boxes: Box[] = [];
        const errors: TerminalSourceError[] = [];
        for (const box of generated) {
          if (box.props.isError) {
            errors.push({
              id: sourceId,
              name: source.name,
              message: box.props.plaintextOutput,
            });
            continue;
          }
          if (box.props.plaintextOutput.length === 0) continue;
          boxes.push({
            ...box,
            props: {
              ...box.props,
              tag: box.props.tag ?? source.tag,
              kind: box.props.kind ?? source.kind,
            },
          });
        }
        return {
          boxes,
          errors,
        };
      } catch (error) {
        if (signal.aborted) return { boxes: [], errors: [] };
        return {
          boxes: [],
          errors: [
            {
              id: source.id ?? source.name,
              name: source.name,
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }),
  );

  return {
    boxes: grouped.flatMap((result) => result.boxes),
    errors: grouped.flatMap((result) => result.errors),
  };
}

// Retains the renderer-facing error boxes used by the original TUI seam.
export async function runBoxes(
  rawInput: string,
  sources: BoxSource[] = tuiBoxSources,
): Promise<Box[]> {
  const result = await runTerminalSources(rawInput, sources);
  return [
    ...result.boxes,
    ...result.errors.map((error) => errorBox(error.name, error.message)),
  ];
}

export default runBoxes;
