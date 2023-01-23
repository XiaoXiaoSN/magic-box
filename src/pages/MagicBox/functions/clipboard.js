function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    // var successful = document.execCommand('copy');
    // var msg = successful ? 'successful' : 'unsuccessful';
    // console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

function copyTextToClipboard(content) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(content);
    return;
  }
  navigator.clipboard.writeText(content).then(() => {}, (err) => {
    // eslint-disable-next-line no-console
    console.error('Async: Could not copy text: ', err);
  });
}

export default copyTextToClipboard;
