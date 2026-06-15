function fallbackCopyTextToClipboard(content: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = content;

  // avoid scrolling to bottom when the fallback textarea receives focus
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';

  document.body.appendChild(textArea);
  try {
    textArea.focus();
    textArea.select();
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }
}

async function copyTextToClipboard(content: string): Promise<boolean> {
  if (!navigator.clipboard || !window.isSecureContext) {
    return fallbackCopyTextToClipboard(content);
  }
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (err) {
    console.error('Async: Could not copy text: ', err);
    return fallbackCopyTextToClipboard(content);
  }
}

export default copyTextToClipboard;
