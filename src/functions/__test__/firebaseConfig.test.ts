import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAnalytics, setAnalyticsCollectionEnabled } = vi.hoisted(() => ({
  getAnalytics: vi.fn(() => ({ id: 'analytics' })),
  setAnalyticsCollectionEnabled: vi.fn(),
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/analytics', () => ({
  getAnalytics,
  setAnalyticsCollectionEnabled,
}));

describe('firebaseConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    getAnalytics.mockClear();
    setAnalyticsCollectionEnabled.mockClear();
  });

  it('creates analytics when reporting is allowed later, not only at load', async () => {
    // Regression: permission was read once at module evaluation, so a flip
    // while the chunk downloaded — or an opt-in afterwards — left it off.
    const prefs = await import('../runtimePrefs');
    prefs.setRuntimePrefs({ analytics: false });
    const config = (await import('../../firebaseConfig')).default;
    expect(getAnalytics).not.toHaveBeenCalled();
    expect(config.analytics).toBeNull();

    prefs.setRuntimePrefs({ analytics: true });
    expect(getAnalytics).toHaveBeenCalledTimes(1);
    expect(config.analytics).toEqual({ id: 'analytics' });
    expect(setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(
      { id: 'analytics' },
      true,
    );

    prefs.setRuntimePrefs({ analytics: false });
    expect(setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(
      { id: 'analytics' },
      false,
    );
    expect(getAnalytics).toHaveBeenCalledTimes(1);
  });
});
