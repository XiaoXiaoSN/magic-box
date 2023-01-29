import { Box, BoxOptions } from '@modules/Box';

export type CheckFunction = (input: string, options: BoxOptions | null) => Box[];

export interface BoxSource {
  generateBoxes(input: string, options: BoxOptions | null): Promise<Box[]>
}
