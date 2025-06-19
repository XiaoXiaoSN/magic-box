function fallbackCopyTextToClipboard(content: string) {
  const textArea = document.createElement('textarea');
  textArea.value = content;

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
     
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

function copyTextToClipboard(content: string): void {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(content);
    return;
  }
  navigator.clipboard.writeText(content).then(() => {}, (err) => {     
    console.error('Async: Could not copy text: ', err);
  });
}

export default copyTextToClipboard;
