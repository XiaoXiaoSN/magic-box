import type { Box, BoxOptions } from '@modules/Box';

export type CheckFunction = (input: string, options: BoxOptions) => Box[];

export interface BoxSourceContext {
  signal: AbortSignal;
  preview: boolean;
  now?: number;
  locale?: string;
  timezone?: string;
  timezoneOffset?: number;
  timezoneMode?: 'fixed' | 'system';
}

export interface BoxSource {
  /** stable settings and URL identifier; legacy source objects may omit it. */
  id?: string;
  name: string;
  description: string;
  defaultInput: string;
  tag: string;
  kind: string;
  defaultDisabled?: boolean;
  optionKeys?: readonly string[];
  headless?: boolean;
  /** explicitly permits execution in the browser compute worker. */
  workerSafe?: boolean;
  /** permits worker execution beyond the automatic input-size threshold. */
  supportsLargeInput?: boolean;
  sideEffects?: 'network';
  canHandle?: (input: string, options: BoxOptions) => boolean;
  load?: () => Promise<BoxSource>;
  generateBoxes: (
    input: string,
    options: BoxOptions,
    context?: BoxSourceContext,
  ) => Promise<Box[]>;
}
