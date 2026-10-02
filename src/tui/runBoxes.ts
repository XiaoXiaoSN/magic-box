import { parseInput } from '@functions/parseOptions';
import { type Box, errorBox } from '@modules/Box';
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
      let generated: Box[];
      try {
        generated = await source.generateBoxes(input, options);
      } catch (error) {
        // One unavailable capability must not hide all other conversions.
        generated = [
          errorBox(
            source.name,
            error instanceof Error ? error.message : String(error),
          ),
        ];
      }
      return generated.map((box) => ({
        ...box,
        props: {
          ...box.props,
          tag: box.props.tag ?? source.tag,
          kind: box.props.kind ?? source.kind,
        },
      }));
    }),
  );

  return grouped.flat();
}

export default runBoxes;
