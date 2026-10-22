import type { Box } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';

export interface TerminalRenderer {
  readonly name: string;
  showResults(boxes: Box[]): Promise<void>;
  startInteractive(sources?: BoxSource[]): Promise<void>;
}
