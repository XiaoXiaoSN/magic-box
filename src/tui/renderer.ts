import type { Box } from '@modules/Box';

export interface TerminalRenderer {
  readonly name: string;
  showResults(boxes: Box[]): Promise<void>;
  startInteractive(): Promise<void>;
}
