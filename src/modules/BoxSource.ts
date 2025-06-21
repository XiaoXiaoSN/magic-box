import type { Box, BoxOptions } from '@modules/Box';

export type CheckFunction = (input: string, options: BoxOptions) => Box[];

export interface BoxSource {
  name: string,
  description: string,
  defaultInput: string,
  generateBoxes: (input: string, options: BoxOptions) => Promise<Box[]>
}
