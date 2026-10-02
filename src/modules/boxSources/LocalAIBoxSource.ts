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
// The text in front of the directive travels with the box as `sourceInput`, so
// `say hello\n::ai` needs no second textarea. It is carried, never executed:
// nothing runs until the model is loaded and the panel decides to submit it.
//
// Text after the directive on the same line is the prompt too. `parseInput`
// reads `::ai what is WebGPU?` as the option value ` what is WebGPU?` and strips
// the whole line from `input`, so without this the question typed in the most
// natural chat-style form was silently dropped.
//
// The source is headless-safe, but generation requires a browser WebGPU worker
// in the web renderer, so this capability is excluded from the terminal.
export const LocalAIBoxSource: BoxSource = {
  name: 'Local AI',
  description:
    'Run a small language model entirely in this browser with WebGPU: ask, translate, rewrite or summarize. Nothing is downloaded or generated until you ask for it, and prompts never leave the device. ::ai',
  defaultInput: '::ai',
  tag: '✦',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, ...LOCAL_AI_OPTION_KEYS)) return [];

    const inline = LOCAL_AI_OPTION_KEYS.map((key) => options?.[key])
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
    const prompt = [input.trim(), ...inline].filter(Boolean).join('\n');

    return [
      new BoxBuilder('Local AI', '')
        .setOptions(options)
        .setSourceInput(prompt)
        .setView('localAI')
        .setPriority(Priority)
        // The panel is tall and stateful; re-mounting it in a modal would drop
        // the loaded model and the in-flight draft.
        .setShowExpandButton(false)
        .build(),
    ];
  },
};

export default LocalAIBoxSource;
