import './commands';
import '@testing-library/cypress/add-commands';

// Handle uncaught exceptions from the application
Cypress.on('uncaught:exception', (err) => {
  // Ignore errors related to modules/imports that might occur during app initialization
  // These are often false positives when the app is still loading
  if (err.message.includes('Cannot use import statement outside a module')) {
    return false;
  }
  // Ignore other common false positives
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  // Ignore media errors when closing QR scanner (camera stream interruption)
  if (err.message.includes('play() request was interrupted') || 
      err.message.includes('media was removed from the document')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});
