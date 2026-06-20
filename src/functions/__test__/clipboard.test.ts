import { beforeEach, describe, expect, it, vi } from 'vitest';
import copyTextToClipboard from '../clipboard';

type ExecCommand = (
  commandId: string,
  showUI?: boolean,
  value?: string,
) => boolean;

const installExecCommand = () => {
  const execCommand = vi.fn<ExecCommand>().mockReturnValue(true);
  Object.defineProperty(document, 'execCommand', {
    value: execCommand,
    configurable: true,
  });
  return execCommand;
};

describe('copyTextToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installExecCommand();
  });

  it('uses fallback when navigator.clipboard is unavailable', async () => {
    const exec = installExecCommand();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    const result = await copyTextToClipboard('hello');

    expect(result).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('uses fallback when not in secure context', async () => {
    const exec = installExecCommand();
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
    const exec = installExecCommand();
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
    installExecCommand();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    const bodyChildrenBefore = document.body.children.length;

    await copyTextToClipboard('hello');

    expect(document.body.children.length).toBe(bodyChildrenBefore);
  });
});
