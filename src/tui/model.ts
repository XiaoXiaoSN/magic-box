import type { Box } from '@modules/Box';

export interface TerminalResult {
  name: string;
  output: string;
  tag?: string;
  kind?: string;
}

export function terminalResults(boxes: Box[]): TerminalResult[] {
  return boxes.map(({ props }) => ({
    name: props.name,
    output: props.plaintextOutput,
    tag: props.tag,
    kind: props.kind,
  }));
}

// Never allow input-derived terminal escape sequences to operate the terminal.
export function terminalText(value: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally filter terminal control bytes
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');
}

export function moveSelection(
  current: number,
  delta: number,
  count: number,
): number {
  return count === 0 ? 0 : (((current + delta) % count) + count) % count;
}
