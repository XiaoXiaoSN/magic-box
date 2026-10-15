import type { Box, BoxOptions } from '@modules/Box';

export type CheckFunction = (input: string, options: BoxOptions) => Box[];

export interface BoxSourceContext {
  signal: AbortSignal;
  preview: boolean;
}

export interface BoxSource {
  name: string;
  description: string;
  defaultInput: string;
  tag: string;
  kind: string;
  priority?: number;
  defaultDisabled?: boolean;
  generateBoxes: (
    input: string,
    options: BoxOptions,
    context?: BoxSourceContext,
  ) => Promise<Box[]>;
}
