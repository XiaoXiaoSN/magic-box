import { boxSources } from '@modules/boxSources';

import { TerminalUsageError } from './options';

export const tuiBoxSources = boxSources.filter(
  (source) => source.headless === true && source.sideEffects !== 'network',
);

export interface TerminalSourceInfo {
  id: string;
  name: string;
  description: string;
  defaultInput: string;
  tag: string;
  kind: string;
  optionKeys: readonly string[];
  defaultDisabled?: boolean;
}

export function terminalSourceInfo(
  sources: typeof tuiBoxSources = tuiBoxSources,
): TerminalSourceInfo[] {
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    description: source.description,
    defaultInput: source.defaultInput,
    tag: source.tag,
    kind: source.kind,
    optionKeys: source.optionKeys,
    defaultDisabled: source.defaultDisabled,
  }));
}

export function selectTerminalSources(
  selectors: string[],
): typeof tuiBoxSources {
  if (selectors.length === 0) return tuiBoxSources;

  const selected = new Map<string, (typeof tuiBoxSources)[number]>();
  for (const selector of selectors) {
    const normalized = selector.trim().toLowerCase();
    const idMatch = tuiBoxSources.find(
      (source) => source.id.toLowerCase() === normalized,
    );
    if (idMatch) {
      selected.set(idMatch.id, idMatch);
      continue;
    }

    const nameMatches = tuiBoxSources.filter((source) =>
      [source.name, ...(source.legacyNames ?? [])].some(
        (name) => name.toLowerCase() === normalized,
      ),
    );
    if (nameMatches.length === 0)
      throw new TerminalUsageError(`Unknown headless source: ${selector}`);
    if (nameMatches.length > 1) {
      throw new TerminalUsageError(
        `Ambiguous source name "${selector}"; use one of: ${nameMatches
          .map((source) => source.id)
          .join(', ')}`,
      );
    }
    const source = nameMatches[0];
    selected.set(source.id, source);
  }

  return [...selected.values()];
}

export function formatTerminalSourceList(
  sources: typeof tuiBoxSources = tuiBoxSources,
): string {
  return terminalSourceInfo(sources)
    .map((source) => {
      const example = source.defaultInput
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
      return `${source.id} (${source.name})\n  ${source.description}\n  default input:\n${example}`;
    })
    .join('\n\n');
}

export default tuiBoxSources;
