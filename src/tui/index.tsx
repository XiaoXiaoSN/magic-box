#!/usr/bin/env bun
import { readFile } from 'node:fs/promises';

import { inkRenderer } from './inkRenderer';
import { terminalResults } from './model';
import {
  applyTerminalPreferences,
  parseArguments,
  terminalHelp,
} from './options';
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
  return Buffer.concat(chunks).toString('utf8');
}

// entry point for the magic-box terminal UI. input resolves in priority order:
//   1. CLI args (everything after the bin name), joined by spaces
//   2. piped stdin
//   3. interactive ink prompt (when neither is supplied and stdin is a TTY)
async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(terminalHelp);
    return;
  }
  const saved = options.prefsPath
    ? JSON.parse(await readFile(options.prefsPath, 'utf8'))
    : {};
  applyTerminalPreferences(options, saved);
  const argInput = options.input;
  const stdinInput = argInput ? '' : await readStdin();
  const initialInput = argInput || stdinInput;

  // non-interactive: compute results up front, render once, then exit. computing
  // before render avoids racing ink's reconciler against process teardown.
  if (initialInput.trim().length > 0) {
    const boxes = await runBoxes(initialInput);
    if (options.json)
      process.stdout.write(
        `${JSON.stringify(terminalResults(boxes), null, 2)}\n`,
      );
    else await inkRenderer.showResults(boxes);
    return;
  }

  if (!process.stdin.isTTY || options.json) {
    if (options.json) process.stdout.write('[]\n');
    return;
  }
  await inkRenderer.startInteractive();
}

main().catch((error: unknown) => {
  process.stderr.write(`magic-box tui failed: ${String(error)}\n`);
  process.exitCode = 1;
});
