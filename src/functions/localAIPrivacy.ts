import { hasOptionKeys } from '@modules/Box';

import { parseInput } from './parseOptions';

// The single definition of the trigger. LocalAIBoxSource reads it from here so
// the box and this pre-init detector can never drift apart — a mismatch would
// mount the panel with telemetry still armed.
export const LOCAL_AI_OPTION_KEYS = ['ai', 'localai'] as const;
export const PRIVATE_OPTION_KEYS = ['ai', 'localai', 'secret'] as const;
export const SENSITIVE_OPTION_KEYS = ['secret'] as const;

// Sticky for the lifetime of this document. Re-enabling telemetry after leaving
// private input could flush breadcrumbs and queued events that were collected
// while it was on screen, so the gate only ever closes.
let active = false;
const listeners = new Set<() => void>();

// True when raw magic input carries a local AI trigger. The text in front of
// the directive is the model prompt, so callers use this to keep that text out
// of stores it would otherwise land in — search history above all.
export const isLocalAIInput = (raw: string): boolean => {
  const [, options] = parseInput(raw);
  return hasOptionKeys(options, ...LOCAL_AI_OPTION_KEYS);
};

// Private directives must never cross persistence, sharing, or telemetry
// boundaries. Keep this check on the parsed options so aliases and case
// normalization follow the same contract as every source.
export const isPrivateInput = (raw: string): boolean => {
  const [, options] = parseInput(raw);
  return hasOptionKeys(options, ...PRIVATE_OPTION_KEYS);
};

export const isSensitiveInput = (raw: string): boolean => {
  const [, options] = parseInput(raw);
  return hasOptionKeys(options, ...SENSITIVE_OPTION_KEYS);
};

export const isSensitiveOptionKey = (key: string): boolean =>
  (SENSITIVE_OPTION_KEYS as readonly string[]).includes(key.toLowerCase());

// A private shared link can mount a box on first paint. Detect it from the
// seeded input before any SDK is initialized rather than waiting for React.
export const isLocalAIMode = (search: string): boolean => {
  const params = new URLSearchParams(search);
  const seeded = params.get('input') ?? params.get('i');
  if (!seeded) return false;
  return isLocalAIInput(seeded);
};

export const isPrivateInputMode = (search: string): boolean => {
  const params = new URLSearchParams(search);
  const seeded = params.get('input') ?? params.get('i');
  if (!seeded) return false;
  return isPrivateInput(seeded);
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
