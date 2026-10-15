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

  it('returns false when execCommand reports failure', async () => {
    const exec = installExecCommand().mockReturnValue(false);
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    await expect(copyTextToClipboard('hello')).resolves.toBe(false);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('returns false when execCommand throws', async () => {
    const exec = installExecCommand().mockImplementation(() => {
      throw new Error('denied');
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    await expect(copyTextToClipboard('hello')).resolves.toBe(false);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('restores the focused input and its selection after fallback', async () => {
    const input = document.createElement('input');
    input.value = 'hello world';
    document.body.appendChild(input);
    input.focus();
    input.setSelectionRange(2, 7, 'backward');
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    await copyTextToClipboard('copy me');

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(7);
    expect(input.selectionDirection).toBe('backward');
    input.remove();
  });

  it('restores a document selection range after fallback', async () => {
    const content = document.createElement('div');
    content.tabIndex = 0;
    content.textContent = 'hello world';
    document.body.appendChild(content);
    content.focus();
    const selection = document.getSelection();
    const range = document.createRange();
    range.setStart(content.firstChild as Text, 2);
    range.setEnd(content.firstChild as Text, 7);
    selection?.removeAllRanges();
    selection?.addRange(range);
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    await copyTextToClipboard('copy me');

    expect(document.activeElement).toBe(content);
    expect(selection?.rangeCount).toBe(1);
    expect(selection?.anchorNode).toBe(content.firstChild);
    expect(selection?.anchorOffset).toBe(2);
    expect(selection?.focusNode).toBe(content.firstChild);
    expect(selection?.focusOffset).toBe(7);
    content.remove();
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
