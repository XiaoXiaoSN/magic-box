import { LocalAIBoxTemplate } from '@components/BoxTemplate';
import { LOCAL_AI_OPTION_KEYS } from '@functions/localAIPrivacy';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';

const Priority = 10;

// Option-gated like `::roll`: typing ordinary text must never surface a box that
// can download half a gigabyte. `generateBoxes` stays synchronous and pure — no
// capability probe, no fetch, no worker — so it costs one `hasOptionKeys` check
// per keystroke inside MagicBox's `Promise.all`. Everything expensive happens
// behind explicit clicks inside the template.
//
// `plaintextOutput` starts empty; the template republishes the settled model
// output through `onResultChange`, so the card Copy button and Enter shortcut
// work without streaming every token through the box list.
//
// Not node-safe: the template pulls in React and a module worker, so this source
// is excluded from `src/tui/sources.ts`.
export const LocalAIBoxSource: BoxSource = {
  name: 'Local AI',
  description:
    'Run a small language model entirely in this browser with WebGPU: ask, translate, rewrite or summarize. Nothing is downloaded or generated until you ask for it, and prompts never leave the device. ::ai',
  defaultInput: '::ai',
  tag: '✦',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    _input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, ...LOCAL_AI_OPTION_KEYS)) return [];

    return [
      new BoxBuilder('Local AI', '')
        .setOptions(options)
        .setTemplate(LocalAIBoxTemplate)
        .setPriority(Priority)
        // The panel is tall and stateful; re-mounting it in a modal would drop
        // the loaded model and the in-flight draft.
        .setShowExpandButton(false)
        .build(),
    ];
  },
};

export default LocalAIBoxSource;
