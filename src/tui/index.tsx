#!/usr/bin/env bun
import { readFile } from 'node:fs/promises';

import { inkRenderer } from './inkRenderer';
import { terminalResults, terminalText } from './model';
import {
  applyTerminalPreferences,
  parseArguments,
  TerminalUsageError,
  terminalHelp,
  withTerminalDirectives,
} from './options';
import { runTerminalSources } from './runBoxes';
import {
  formatTerminalSourceList,
  selectTerminalSources,
  terminalSourceInfo,
} from './sources';

const MAX_STDIN_BYTES = 1024 * 1024;

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bytes.length;
    if (totalBytes > MAX_STDIN_BYTES) {
      process.stdin.destroy();
      throw new TerminalUsageError('stdin input exceeds 1 MiB');
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, totalBytes).toString('utf8');
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(terminalHelp);
    return;
  }

  const sources = selectTerminalSources(options.only);
  if (options.list) {
    const output = options.json
      ? `${JSON.stringify(terminalSourceInfo(sources), null, 2)}\n`
      : `${terminalText(formatTerminalSourceList(sources))}\n`;
    process.stdout.write(output);
    return;
  }

  let saved: unknown = {};
  if (options.prefsPath) {
    try {
      saved = JSON.parse(await readFile(options.prefsPath, 'utf8'));
    } catch (error) {
      throw new TerminalUsageError(
        `Could not read preferences file: ${String(error)}`,
      );
    }
  }
  applyTerminalPreferences(options, saved);

  if (
    process.stdin.isTTY &&
    !options.hasInput &&
    options.directives.length === 0 &&
    !options.json &&
    !options.raw
  ) {
    await inkRenderer.startInteractive(sources);
    return;
  }

  const stdinInput = options.hasInput ? '' : await readStdin();
  if (
    !process.stdin.isTTY &&
    !options.hasInput &&
    stdinInput.length === 0 &&
    options.directives.length === 0
  ) {
    throw new TerminalUsageError('No input received from stdin');
  }

  const input = options.hasInput ? options.input : stdinInput;
  const result = await runTerminalSources(
    withTerminalDirectives(input, options.directives),
    sources,
  );

  for (const error of result.errors) {
    process.stderr.write(
      `Source ${error.id} (${terminalText(error.name)}) failed: ${terminalText(error.message)}\n`,
    );
  }

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(terminalResults(result.boxes), null, 2)}\n`,
    );
  } else if (options.raw) {
    const firstResult = result.boxes[0]?.props.plaintextOutput;
    if (firstResult === undefined) {
      process.stderr.write('No matching boxes.\n');
    } else {
      process.stdout.write(terminalText(firstResult));
    }
  } else {
    await inkRenderer.showResults(result.boxes);
  }

  if (result.boxes.length === 0) {
    if (options.json) process.stderr.write('No matching boxes.\n');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  if (error instanceof TerminalUsageError) {
    process.stderr.write(
      `magic-box-tui: ${terminalText(error.message)}\nTry 'magic-box-tui --help' for usage.\n`,
    );
    process.exitCode = 2;
    return;
  }
  process.stderr.write(
    `magic-box-tui failed: ${terminalText(String(error))}\n`,
  );
  process.exitCode = 1;
});
