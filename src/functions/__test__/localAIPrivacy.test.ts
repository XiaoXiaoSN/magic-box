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

describe('isLocalAIInput', () => {
  it('detects the trigger in raw magic input so the prompt can be withheld', async () => {
    const { privacy } = await load();
    expect(privacy.isLocalAIInput('::ai')).toBe(true);
    expect(privacy.isLocalAIInput('say hello\n::ai')).toBe(true);
    expect(privacy.isLocalAIInput('::localai\nsay hello')).toBe(true);
    expect(privacy.isLocalAIInput('::AI')).toBe(true);
  });

  it('does not fire on ordinary input or a lookalike option', async () => {
    const { privacy } = await load();
    expect(privacy.isLocalAIInput('')).toBe(false);
    expect(privacy.isLocalAIInput('ai')).toBe(false);
    expect(privacy.isLocalAIInput('::aim')).toBe(false);
    expect(privacy.isLocalAIInput('talk about ai')).toBe(false);
  });
});

describe('private input detection', () => {
  it.each([
    'apiVersion: v1\nkind: Secret\ndata:\n  token: ZHVtbXk=',
    '{"apiVersion":"v1","kind":"Secret","stringData":{"token":"dummy"}}',
    'apiVersion: v1\nkind: List\nitems:\n  - apiVersion: v1\n    kind: Secret\n    stringData: { token: dummy }',
    'apiVersion: v1\nkind: ConfigMap\n---\napiVersion: v1\nkind: Secret\nstringData: { token: dummy }',
    'apiVersion: v1\nkind: Secret\nstringData: { token: unfinished',
    `apiVersion: v1\nkind: Secret\nstringData:\n  token: ${'x'.repeat(65_536)}`,
  ])('protects Kubernetes Secret input %# before persistence or telemetry', async (input) => {
    const { privacy } = await load();
    expect(privacy.isPrivateInput(input)).toBe(true);
    expect(privacy.isSensitiveInput(input)).toBe(true);
    expect(
      privacy.isPrivateInputMode(`?${new URLSearchParams({ input })}`),
    ).toBe(true);
  });

  it.each([
    'apiVersion: v1\nkind: ConfigMap\ndata:\n  sample: |\n    kind: Secret',
    'apiVersion: v1\nkind: List\nitems:\n  - apiVersion: v1\n    kind: ConfigMap',
    '{"kind":"Secret","unrelated":true}',
  ])('keeps non-secret YAML and JSON shareable %#', async (input) => {
    const { privacy } = await load();
    expect(privacy.isPrivateInput(input)).toBe(false);
  });

  it.each([
    'hmac',
    'hmacsha1',
    'hmacsha256',
    'hmacsha512',
    'sha1',
    'sha256',
    'sha512',
  ])('protects values carried by ::%s even if overridden', async (key) => {
    const { privacy } = await load();
    const keyed = `some text\n::${key.toUpperCase()}=test-key`;
    expect(privacy.isSensitiveInput(keyed)).toBe(true);
    expect(privacy.isPrivateInput(`${keyed}\n::${key}`)).toBe(true);
    expect(privacy.isPrivateInput(`some text\n::${key}`)).toBe(false);
    expect(privacy.shouldMaskDirectiveValue(key, 'test-key')).toBe(true);
  });

  it('protects a PBKDF2 password as soon as the directive is present', async () => {
    const { privacy } = await load();
    expect(privacy.isSensitiveInput('test-password\n::pbkdf2')).toBe(true);
    expect(privacy.isPrivateInput('test-password\n::PBKDF2=salt')).toBe(true);
    expect(privacy.shouldMaskDirectiveValue('pbkdf2', 'salt')).toBe(false);
  });

  it('recognizes secret directives with parser case and value forms', async () => {
    const { privacy } = await load();
    for (const raw of [
      'payload\n::secret=top secret',
      'payload\n::SECRET top secret',
      'payload\n::secret = top=secret',
      'payload\n::SeCrEt=top=secret',
    ]) {
      expect(privacy.isPrivateInput(raw)).toBe(true);
      expect(privacy.isSensitiveInput(raw)).toBe(true);
    }
    expect(privacy.isPrivateInput('payload\n::secretive=value')).toBe(false);
  });

  it('detects private shared inputs before React mounts', async () => {
    const { privacy } = await load();
    expect(
      privacy.isPrivateInputMode(
        '?input=payload%0A%3A%3ASECRET%20%3D%20top-secret',
      ),
    ).toBe(true);
    expect(privacy.isPrivateInputMode('?input=payload')).toBe(false);
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
