import { afterEach, describe, expect, it, vi } from 'vitest';

interface SentryMock {
  browserTracingIntegration: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  getClient: ReturnType<typeof vi.fn>;
  init: ReturnType<typeof vi.fn>;
  logger: { error: ReturnType<typeof vi.fn> };
}

const createSentryMock = (): SentryMock => {
  const close = vi.fn();
  return {
    browserTracingIntegration: vi.fn(() => ({})),
    close,
    getClient: vi.fn(() => ({ close })),
    init: vi.fn(),
    logger: { error: vi.fn() },
  };
};

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@sentry/react');
  vi.restoreAllMocks();
});

describe('consent-gated Sentry loading', () => {
  it('does not initialize when permission is revoked while the chunk loads', async () => {
    const sentry = createSentryMock();
    let resolveModule: ((module: SentryMock) => void) | undefined;
    const pending = new Promise<SentryMock>((resolve) => {
      resolveModule = resolve;
    });
    vi.doMock('@sentry/react', () => pending);

    const prefs = await import('../runtimePrefs');
    prefs.setRuntimePrefs({ analytics: true });
    const gate = await import('../sentry');
    gate.startSentryWhenAllowed();
    prefs.setRuntimePrefs({ analytics: false });
    resolveModule?.(sentry);
    await settle();

    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('does not import or report when Local AI starts while analytics is disabled', async () => {
    const sentry = createSentryMock();
    const importer = vi.fn(() => Promise.resolve(sentry));
    vi.doMock('@sentry/react', () => {
      importer();
      return sentry;
    });

    const prefs = await import('../runtimePrefs');
    prefs.setRuntimePrefs({ analytics: false });
    const privacy = await import('../localAIPrivacy');
    const gate = await import('../sentry');
    gate.startSentryWhenAllowed();
    privacy.activateLocalAIPrivacy();
    gate.reportSentryError('scanner failed');
    await settle();

    expect(importer).not.toHaveBeenCalled();
    expect(sentry.logger.error).not.toHaveBeenCalled();
  });

  it('closes an already loaded client when Local AI activates', async () => {
    const sentry = createSentryMock();
    vi.doMock('@sentry/react', () => sentry);

    const prefs = await import('../runtimePrefs');
    prefs.setRuntimePrefs({ analytics: true });
    const gate = await import('../sentry');
    gate.startSentryWhenAllowed();
    await settle();

    const privacy = await import('../localAIPrivacy');
    privacy.activateLocalAIPrivacy();
    gate.closeSentry();
    await settle();

    expect(sentry.init).toHaveBeenCalledOnce();
    expect(sentry.close).toHaveBeenCalledWith(1);
  });
});
