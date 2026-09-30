import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeWorker } from './fakeWorker';

// The privacy gate is sticky for the life of the module, so every case loads
// a fresh copy of it together with the components that read it.
const load = async () => {
  vi.resetModules();
  const [privacy, panel, preview, locale, prefs] = await Promise.all([
    import('@functions/localAIPrivacy'),
    import('../LocalAIPanel'),
    import('../../../contexts/BoxPreviewContext'),
    import('../../../contexts/LocaleContext'),
    import('../../../contexts/PreferencesContext'),
  ]);
  const LocalAIPanel = panel.default;
  const renderPreview = (sourceInput?: string) =>
    render(
      <locale.LocaleProvider>
        <prefs.PreferencesProvider>
          <preview.BoxPreviewProvider>
            <LocalAIPanel
              createWorker={() => new FakeWorker()}
              sourceInput={sourceInput}
            />
          </preview.BoxPreviewProvider>
        </prefs.PreferencesProvider>
      </locale.LocaleProvider>,
    );
  return { privacy, renderPreview };
};

describe('LocalAIPanel in the /list preview', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('leaves telemetry alone for someone only browsing the list', async () => {
    // Regression: mounting the preview closed the sticky gate, turning off
    // error reporting for the whole visit though no prompt was ever entered.
    const { privacy, renderPreview } = await load();
    renderPreview();
    await screen.findByTestId('local-ai-panel');
    expect(privacy.isLocalAIPrivate()).toBe(false);
  });

  it('closes it once a prompt is typed into the preview', async () => {
    const { privacy, renderPreview } = await load();
    renderPreview();
    fireEvent.change(await screen.findByTestId('local-ai-input'), {
      target: { value: 'a private question' },
    });
    expect(privacy.isLocalAIPrivate()).toBe(true);
  });

  it('closes it for a prompt carried into the preview', async () => {
    const { privacy, renderPreview } = await load();
    renderPreview('a private question');
    await screen.findByTestId('local-ai-panel');
    expect(privacy.isLocalAIPrivate()).toBe(true);
  });

  it('closes it on a setup click', async () => {
    const { privacy, renderPreview } = await load();
    renderPreview();
    fireEvent.click(await screen.findByTestId('local-ai-setup'));
    expect(privacy.isLocalAIPrivate()).toBe(true);
  });
});
