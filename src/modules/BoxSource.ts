import type { Box, BoxOptions } from '@modules/Box';

export type CheckFunction = (input: string, options: BoxOptions) => Box[];

export interface BoxSource {
  name: string;
  description: string;
  defaultInput: string;
  // Shared option definitions for sources that delegate parsing to a helper.
  optionKeys?: readonly string[];
  tag: string;
  kind: string;
  priority?: number;
  defaultDisabled?: boolean;
  generateBoxes: (input: string, options: BoxOptions) => Promise<Box[]>;
}
