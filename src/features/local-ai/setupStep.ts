import { formatModelSize, type UILocale } from './labels';
import { localAIMessages } from './messages';
import type { AIState } from './types';

export interface SetupStep {
  // The client call this step performs. Never more than one per click.
  action: 'inspect' | 'prepare';
  label: string;
  // Disclosure rendered under the button, naming what the click costs. It is
  // attached to the action, not to a first run: the sources are part of the
  // offer every time bytes are about to move.
  note: string | null;
}

// The single definition of "what is the next setup step". The box and the
// settings page both render from it, so one action can never be presented as
// two different things — and the size a user commits to is the size they were
// shown. Returns null once the model is loaded: there is nothing left to set up.
export function describeSetupStep(
  state: AIState,
  locale: UILocale,
): SetupStep | null {
  if (state.loaded) return null;

  const m = localAIMessages[locale];
  // Metadata first: the byte count has to be real before it can be quoted.
  if (!state.info) return { action: 'inspect', label: m.inspect, note: null };

  const size = formatModelSize(state.info.bytes, locale);
  return {
    action: 'prepare',
    label: `${state.info.cached ? m.loadAction : m.downloadAction} · ${size}`,
    note: state.info.cached ? m.cached : m.sourceNote,
  };
}

// `loading` is one phase but three user-visible activities: fetching weights,
// building the ONNX session and the one-token warm-up. Naming all three at once
// ("Downloading / initializing / warming up…") describes the phase rather than
// the moment, and it is read aloud in full on every status change because the
// box status is a live region. Split it on evidence instead: progress events
// only arrive while bytes move, and a cached model moves none.
export function describePhase(state: AIState, locale: UILocale): string {
  const m = localAIMessages[locale];
  if (state.phase === 'loading' && state.progress && !state.info?.cached) {
    return m.downloading;
  }
  return m.phases[state.phase];
}
