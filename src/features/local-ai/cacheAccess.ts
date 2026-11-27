import type { AICommand, AIEvent } from './types';

export const CACHE_LOCK_NAME = 'magic-box-local-ai-cache';

export async function handleWithCacheAccess(
  command: AICommand,
  handle: (command: AICommand) => Promise<void>,
  send: (event: AIEvent) => void,
): Promise<void> {
  // Only inspect and prepare can open or write caches. The worker owns this
  // lock so it covers the task even if the tab starts terminating the worker.
  // Browsers without Web Locks still support inspection, but cannot delete.
  const locks = globalThis.navigator?.locks;
  if (!locks || (command.type !== 'inspect' && command.type !== 'prepare')) {
    await handle(command);
    return;
  }
  try {
    await locks.request(CACHE_LOCK_NAME, { mode: 'shared' }, () =>
      handle(command),
    );
  } catch {
    send({ type: 'error', id: command.id, code: 'busy' });
  }
}
