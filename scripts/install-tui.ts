import { access, chmod, copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--bin-dir' || args[1].trim() === '') {
    process.stderr.write(
      'Usage: bun run tui:install -- --bin-dir <directory>\n',
    );
    process.exitCode = 2;
    return;
  }

  const binary = resolve(import.meta.dir, '../dist-tui/magic-box-tui');
  const destination = resolve(args[1], 'magic-box-tui');
  try {
    await access(binary);
  } catch {
    throw new Error('Build the executable first with `bun run tui:build`');
  }
  if (binary === destination)
    throw new Error('Choose a bin directory outside dist-tui');

  await mkdir(dirname(destination), { recursive: true });
  await copyFile(binary, destination);
  await chmod(destination, 0o755);
  process.stdout.write(`Installed ${destination}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`magic-box-tui install failed: ${String(error)}\n`);
  process.exitCode = 1;
});
