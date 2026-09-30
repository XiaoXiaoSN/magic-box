import { useState } from 'react';
import { deleteLocalAIDownloads } from './caches';
import type { LocalAIClient } from './client';
import type { UILocale } from './labels';
import { localAIMessages } from './messages';
import { describeSetupStep } from './setupStep';
import type { AIState } from './types';
import { isBusy } from './types';

// The setup and storage actions every surface offers — the box, its dialog and
// Settings → Local AI. One implementation, so a fix to the download step, the
// delete flow or their guards cannot land in one surface and miss another.
export function useLocalAISetup(
  client: LocalAIClient,
  state: AIState,
  locale: UILocale,
) {
  const m = localAIMessages[locale];
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const busy = isBusy(state.phase);
  const step = describeSetupStep(state, locale);

  // Performs the next setup step. For a download, the click IS the consent:
  // the label carries the byte count and the note names the sources.
  const advance = () => {
    if (!step || busy || deleting) return;
    setNotice('');
    if (step.action === 'inspect') {
      client.inspect();
      return;
    }
    // Best effort: a persisted origin is far less likely to have the ~500 MB
    // of weights evicted between visits.
    if (typeof navigator.storage?.persist === 'function') {
      void navigator.storage.persist().catch(() => false);
    }
    client.prepare();
  };

  const removeDownloads = async () => {
    if (deleting) return;
    if (typeof window !== 'undefined' && !window.confirm(m.removeConfirm)) {
      return;
    }
    // Terminate first: this tab must not be able to repopulate the cache it is
    // about to delete. Other tabs still can, hence the warning in the prompt.
    client.reset();
    setDeleting(true);
    setNotice('');
    try {
      await deleteLocalAIDownloads();
      setNotice(m.removed);
    } catch {
      setNotice(m.errors.storage);
    } finally {
      setDeleting(false);
    }
  };

  return {
    step,
    advance,
    removeDownloads,
    deleting,
    notice,
    clearNotice: () => setNotice(''),
    // Stop belongs to the work the user asked for — the download and the
    // generation — not to the metadata check a box may start by itself.
    canStop: busy && state.phase !== 'inspecting',
    // Deleting is offered at any time but during another deletion: it
    // terminates the worker first, which also aborts whatever was in flight —
    // including the self-started check, which has no Stop of its own.
    canRemove: !deleting,
  };
}
