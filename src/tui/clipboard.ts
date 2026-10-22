import { spawnSync } from 'node:child_process';

// OSC 52 works over SSH without spawning platform-specific clipboard programs.
// Copying is opt-in, and terminal policy may disable OSC 52.
export type ClipboardMethod = 'system' | 'osc52';

export function copyToClipboard(text: string): ClipboardMethod {
  if (process.platform === 'darwin') {
    const result = spawnSync('pbcopy', [], { encoding: 'utf8', input: text });
    if (!result.error) {
      if (result.status !== 0)
        throw new Error(result.stderr.trim() || 'pbcopy failed');
      return 'system';
    }
    if (!result.error.message.includes('ENOENT')) throw result.error;
  }
  if (!process.stdout.isTTY)
    throw new Error('Clipboard copy requires a terminal');
  process.stdout.write(clipboardSequence(text));
  return 'osc52';
}

export function clipboardSequence(text: string): string {
  const bytes = Buffer.from(text, 'utf8');
  if (bytes.length > 100_000)
    throw new Error('Clipboard output exceeds 100 KB');
  return `\u001b]52;c;${bytes.toString('base64')}\u0007`;
}
