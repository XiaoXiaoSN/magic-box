// Sticky for the lifetime of this document: re-enabling telemetry when leaving
// AI could flush queued breadcrumbs/events collected during a private session.
let active = false;
const listeners = new Set<() => void>();

export const isLocalAIMode = (search: string): boolean =>
  new URLSearchParams(search).get('mode') === 'local-ai';

export const isLocalAIPrivate = (): boolean => active;

export function activateLocalAIPrivacy(): void {
  if (active) return;
  active = true;
  for (const listener of listeners) listener();
}

export function subscribeLocalAIPrivacy(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
