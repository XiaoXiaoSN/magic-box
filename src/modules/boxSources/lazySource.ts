import type { BoxOptions } from '@modules/Box';
import type { BoxSource, BoxSourceContext } from '../BoxSource';

export interface LazyBoxSourceDefinition
  extends Omit<BoxSource, 'generateBoxes' | 'id' | 'load'> {
  id: string;
  legacyNames?: readonly string[];
  load: () => Promise<BoxSource>;
}

export interface LazyBoxSource extends BoxSource {
  id: string;
  legacyNames?: readonly string[];
  optionKeys: readonly string[];
  load: () => Promise<BoxSource>;
}

/** Wraps a source loader while retaining cancellation and retry semantics. */
export function createLazyBoxSource(
  definition: LazyBoxSourceDefinition,
): LazyBoxSource {
  let cachedLoad: Promise<BoxSource> | null = null;

  const load = (): Promise<BoxSource> => {
    if (cachedLoad === null) {
      cachedLoad = definition.load().catch((error: unknown) => {
        cachedLoad = null;
        throw error;
      });
    }
    return cachedLoad;
  };

  const generateBoxes = async (
    input: string,
    options: BoxOptions,
    context?: BoxSourceContext,
  ) => {
    if (context?.signal.aborted) return [];
    if (definition.canHandle && !definition.canHandle(input, options)) {
      return [];
    }

    const source = await load();
    if (context?.signal.aborted) return [];
    return source.generateBoxes.call(source, input, options, context);
  };

  return {
    ...definition,
    optionKeys: definition.optionKeys ?? [],
    load,
    generateBoxes,
  };
}
