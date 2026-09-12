import { hasOptionKeys } from '@modules/Box';

import { parseInput } from './parseOptions';

// The single definition of the trigger. LocalAIBoxSource reads it from here so
// the box and this pre-init detector can never drift apart — a mismatch would
// mount the panel with telemetry still armed.
export const LOCAL_AI_OPTION_KEYS = ['ai', 'localai'] as const;

// Sticky for the lifetime of this document. Re-enabling telemetry after leaving
// the AI box could flush breadcrumbs and queued events that were collected
// while a private prompt was on screen, so the gate only ever closes.
let active = false;
const listeners = new Set<() => void>();

// `::ai` is the box trigger, so a shared link can mount the panel on first
// paint. Detect it from the seeded input before any SDK is initialized rather
// than waiting for the React tree to mount.
export const isLocalAIMode = (search: string): boolean => {
  const params = new URLSearchParams(search);
  const seeded = params.get('input') ?? params.get('i');
  if (!seeded) return false;
  const [, options] = parseInput(seeded);
  return hasOptionKeys(options, ...LOCAL_AI_OPTION_KEYS);
};

export const isLocalAIPrivate = (): boolean => active;

export function activateLocalAIPrivacy(): void {
  if (active) return;
  active = true;
  for (const listener of listeners) listener();
}

export function subscribeLocalAIPrivacy(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
