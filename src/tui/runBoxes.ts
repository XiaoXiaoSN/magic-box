import { parseInput } from '@functions/parseOptions';
import type { Box } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';

import { tuiBoxSources } from './sources';

// runs the headless boxSources against raw input and returns the matching boxes,
// enriched with each source's tag/kind. mirrors the web MagicBox pipeline
// (parse `::option` directives, run sources concurrently, preserve source order)
// but produces no react output — boxes carry `props.plaintextOutput` only.
export async function runBoxes(
  rawInput: string,
  sources: BoxSource[] = tuiBoxSources,
): Promise<Box[]> {
  const [input, options] = parseInput(rawInput);

  const grouped = await Promise.all(
    sources.map(async (source) => {
      // isolate each source like the web pipeline: a throwing source must not
      // wipe out every other source's output
      try {
        const generated = await source.generateBoxes(input, options);
        return generated.map((box) => ({
          ...box,
          props: {
            ...box.props,
            tag: box.props.tag ?? source.tag,
            kind: box.props.kind ?? source.kind,
          },
        }));
      } catch {
        return [];
      }
    }),
  );

  return grouped.flat();
}

export default runBoxes;
