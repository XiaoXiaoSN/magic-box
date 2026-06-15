import { beforeEach, describe, expect, it, vi } from 'vitest';
import copyTextToClipboard from '../clipboard';

describe('copyTextToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // jsdom doesn't implement execCommand — shim it
    (document as any).execCommand = vi.fn().mockReturnValue(true);
  });

  it('uses fallback when navigator.clipboard is unavailable', async () => {
    const exec = vi.spyOn(document as any, 'execCommand').mockReturnValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    const result = await copyTextToClipboard('hello');

    expect(result).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('uses fallback when not in secure context', async () => {
    const exec = vi.spyOn(document as any, 'execCommand').mockReturnValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
    });

    const result = await copyTextToClipboard('hello');

    expect(result).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('uses writeText when clipboard API is available in secure context', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });

    const result = await copyTextToClipboard('hello');

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('fail'));
    const exec = vi.spyOn(document as any, 'execCommand').mockReturnValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });

    const result = await copyTextToClipboard('hello');

    expect(result).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('cleans up the textarea node after fallback', async () => {
    vi.spyOn(document as any, 'execCommand').mockReturnValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    const bodyChildrenBefore = document.body.children.length;

    await copyTextToClipboard('hello');

    expect(document.body.children.length).toBe(bodyChildrenBefore);
  });
});
