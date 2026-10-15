function fallbackCopyTextToClipboard(content: string): boolean {
  const activeElement = document.activeElement;
  const inputSelection =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
      ? {
          direction: activeElement.selectionDirection,
          end: activeElement.selectionEnd,
          start: activeElement.selectionStart,
        }
      : null;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange(),
      )
    : [];
  let textArea: HTMLTextAreaElement | null = null;

  try {
    textArea = document.createElement('textarea');
    textArea.value = content;

    // avoid scrolling to bottom when the fallback textarea receives focus
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return document.execCommand('copy') === true;
  } catch (error) {
    console.error('Fallback: Could not copy text: ', error);
    return false;
  } finally {
    if (textArea?.parentNode) {
      textArea.parentNode.removeChild(textArea);
    }

    if (activeElement instanceof HTMLElement && activeElement.isConnected) {
      try {
        activeElement.focus();
        if (
          inputSelection &&
          (activeElement instanceof HTMLInputElement ||
            activeElement instanceof HTMLTextAreaElement) &&
          inputSelection.start !== null &&
          inputSelection.end !== null
        ) {
          activeElement.setSelectionRange(
            inputSelection.start,
            inputSelection.end,
            inputSelection.direction ?? undefined,
          );
        }
      } catch {
        // focus and selection restoration are best effort for detached controls
      }
    }

    if (selection && ranges.length > 0) {
      try {
        selection.removeAllRanges();
        for (const range of ranges) selection.addRange(range);
      } catch {
        // the selected nodes may have been removed while copying
      }
    }
  }
}

async function copyTextToClipboard(content: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || !window.isSecureContext) {
      return fallbackCopyTextToClipboard(content);
    }
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Async: Could not copy text: ', error);
      return fallbackCopyTextToClipboard(content);
    }
  } catch (error) {
    console.error('Clipboard: Could not copy text: ', error);
    return false;
  }
}

export default copyTextToClipboard;
