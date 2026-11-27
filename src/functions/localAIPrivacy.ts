import { type BoxOptionValues, hasOptionKeys } from '@modules/Box';

import { HMAC_KEY_DIRECTIVES, PBKDF2_DIRECTIVE } from './cryptoDirectives';
import { parseInput } from './parseOptions';

// The single definition of the trigger. LocalAIBoxSource reads it from here so
// the box and this pre-init detector can never drift apart — a mismatch would
// mount the panel with telemetry still armed.
export const LOCAL_AI_OPTION_KEYS = ['ai', 'localai'] as const;

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
const isLocalAIDirective = (key: string): boolean =>
  LOCAL_AI_OPTION_KEYS.some((option) => option === key);

const isHmacKey = (key: string, value: BoxOptionValues): boolean =>
  typeof value === 'string' && HMAC_KEY_DIRECTIVES.includes(key);

export const shouldMaskDirectiveValue = (
  key: string,
  value: BoxOptionValues,
): boolean =>
  key === 'secret' || isLocalAIDirective(key) || isHmacKey(key, value);

const hasPrivateDirective = (raw: string, includeLocalAI: boolean): boolean => {
  let privateInput = false;
  // An overridden directive can still carry a key in the original input.
  parseInput(raw, ({ key, value }) => {
    privateInput ||=
      key === 'secret' ||
      key === PBKDF2_DIRECTIVE ||
      isHmacKey(key, value) ||
      (includeLocalAI && isLocalAIDirective(key));
  });
  return privateInput;
};

export const isPrivateInput = (raw: string): boolean =>
  hasPrivateDirective(raw, true);

export const isSensitiveInput = (raw: string): boolean =>
  hasPrivateDirective(raw, false);

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
