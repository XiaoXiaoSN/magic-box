import { beforeEach, describe, expect, it, vi } from 'vitest';

// The privacy flag is module-global and deliberately one-way, so each test
// needs a fresh module registry rather than a reset helper that production
// code could accidentally call.
beforeEach(() => {
  vi.resetModules();
});

const load = async () => ({
  privacy: await import('../localAIPrivacy'),
  prefs: await import('../runtimePrefs'),
});

describe('isLocalAIMode', () => {
  it('detects the ::ai trigger in a seeded input before React mounts', async () => {
    const { privacy } = await load();
    expect(privacy.isLocalAIMode('?input=%3A%3Aai')).toBe(true);
    expect(privacy.isLocalAIMode('?i=%3A%3Alocalai')).toBe(true);
    expect(privacy.isLocalAIMode('?input=ask%20this%0A%3A%3Aai')).toBe(true);
  });

  it('does not fire on ordinary input or a lookalike option', async () => {
    const { privacy } = await load();
    expect(privacy.isLocalAIMode('')).toBe(false);
    expect(privacy.isLocalAIMode('?input=hello')).toBe(false);
    expect(privacy.isLocalAIMode('?input=%3A%3Aaim')).toBe(false);
    expect(privacy.isLocalAIMode('?box=Local%20AI')).toBe(false);
  });
});

describe('telemetry gating', () => {
  it('is sticky and notifies each subscriber exactly once', async () => {
    const { privacy } = await load();
    const listener = vi.fn();
    const unsubscribe = privacy.subscribeLocalAIPrivacy(listener);
    expect(privacy.isLocalAIPrivate()).toBe(false);

    privacy.activateLocalAIPrivacy();
    expect(listener).toHaveBeenCalledTimes(1);
    privacy.activateLocalAIPrivacy();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(privacy.isLocalAIPrivate()).toBe(true);

    unsubscribe();
    privacy.activateLocalAIPrivacy();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('closes the shared analytics gate even when the preference is on', async () => {
    const { privacy, prefs } = await load();
    prefs.setRuntimePrefs({ analytics: true });
    expect(prefs.isAnalyticsEnabled()).toBe(true);

    const permission = vi.fn();
    prefs.subscribeAnalyticsPermission(permission);
    expect(permission).toHaveBeenLastCalledWith(true);

    privacy.activateLocalAIPrivacy();
    // Every consumer inherits the gate, and a live SDK is told to stop.
    expect(prefs.isAnalyticsEnabled()).toBe(false);
    expect(permission).toHaveBeenLastCalledWith(false);

    // Re-enabling the preference cannot reopen it for this document.
    prefs.setRuntimePrefs({ analytics: true });
    expect(prefs.isAnalyticsEnabled()).toBe(false);
  });
});
