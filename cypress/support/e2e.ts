import './commands';
import '@testing-library/cypress/add-commands';

Cypress.on('window:before:load', (win) => {
  const originalError = win.console.error;
  win.console.error = (...args) => {
    originalError.apply(win.console, args);
    throw new Error(args.join(' '));
  };
});
