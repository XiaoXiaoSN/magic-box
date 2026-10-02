// OSC 52 works over SSH without spawning platform-specific clipboard programs.
// It is opt-in (Ctrl+Y), and terminal policy may disable it.
export function copyToClipboard(text: string): void {
  if (!process.stdout.isTTY)
    throw new Error('Clipboard copy requires a terminal');
  process.stdout.write(clipboardSequence(text));
}

export function clipboardSequence(text: string): string {
  const bytes = Buffer.from(text, 'utf8');
  if (bytes.length > 100_000)
    throw new Error('Clipboard output exceeds 100 KB');
  return `\u001b]52;c;${bytes.toString('base64')}\u0007`;
}
