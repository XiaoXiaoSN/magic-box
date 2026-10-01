import type { BoxSource } from '@modules/BoxSource';
import { boxSources } from '@modules/boxSources';

// Capability policy, not a second manually maintained tool registry. No
// browser worker/canvas tools or implicit network requests in the terminal.
export const unsupportedTerminalSources = new Set([
  'Generate QR Code',
  'Local AI',
  'My IP',
  'Shorten URL',
]);

// Directive-driven tools remain available even when disabled by default on
// the web. Sources decide whether input matches; terminal preferences can
// retain the web source order and shared runtime preferences.
export const tuiBoxSources: BoxSource[] = boxSources.filter(
  (source) => !unsupportedTerminalSources.has(source.name),
);

export default tuiBoxSources;
