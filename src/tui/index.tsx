#!/usr/bin/env node
import { render } from 'ink';
import { createElement } from 'react';

import { App, ResultList } from './App';
import { runBoxes } from './runBoxes';

// reads all of stdin when the process is being piped to (non-TTY). returns an
// empty string when stdin is a TTY so the interactive prompt can take over.
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return '';
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8').trim();
}

// entry point for the magic-box terminal UI. input resolves in priority order:
//   1. CLI args (everything after the bin name), joined by spaces
//   2. piped stdin
//   3. interactive ink prompt (when neither is supplied and stdin is a TTY)
async function main(): Promise<void> {
  const argInput = process.argv.slice(2).join(' ').trim();
  const stdinInput = argInput ? '' : await readStdin();
  const initialInput = argInput || stdinInput;

  // non-interactive: compute results up front, render once, then exit. computing
  // before render avoids racing ink's reconciler against process teardown.
  if (initialInput.length > 0) {
    const boxes = await runBoxes(initialInput);
    const { unmount, waitUntilExit } = render(
      createElement(ResultList, { boxes }),
    );
    unmount();
    await waitUntilExit();
    return;
  }

  const { waitUntilExit } = render(createElement(App, {}));
  await waitUntilExit();
}

main().catch((error: unknown) => {
  process.stderr.write(`magic-box tui failed: ${String(error)}\n`);
  process.exitCode = 1;
});
