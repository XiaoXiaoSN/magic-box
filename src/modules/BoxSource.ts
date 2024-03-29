import { Box, BoxOptions } from '@modules/Box';

export type CheckFunction = (input: string, options: BoxOptions) => Box[];

export interface BoxSource {
  generateBoxes(input: string, options: BoxOptions): Promise<Box[]>
}
