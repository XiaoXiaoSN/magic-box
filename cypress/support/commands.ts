/// <reference types="cypress" />

// ***********************************************
// Custom commands for QR Reader testing
// ***********************************************

export {};

Cypress.Commands.add('openQRReader', () => {
  cy.get('[data-testid="qr-reader-open-button"]', { timeout: 10000 })
    .should('be.visible')
    .click();
});

Cypress.Commands.add('closeQRReader', () => {
  cy.get('[data-testid="qr-reader-close-button"]', { timeout: 10000 })
    .should('be.visible')
    .click();
});

Cypress.Commands.add('verifyQRReaderOpen', () => {
  cy.get('[data-testid="qr-reader-modal"]', { timeout: 10000 }).should(
    'be.visible',
  );
  cy.get('[data-testid="qr-reader-container"]', { timeout: 10000 }).should(
    'be.visible',
  );
  cy.get('[data-testid="qr-reader-close-button"]', { timeout: 10000 }).should(
    'be.visible',
  );
});

Cypress.Commands.add('verifyQRReaderClosed', () => {
  cy.get('[data-testid="qr-reader-modal"]', { timeout: 10000 }).should(
    'not.exist',
  );
});

function setNetworkOffline(offline: boolean): Cypress.Chainable<void> {
  return cy
    .then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.enable',
      }),
    )
    .then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.emulateNetworkConditions',
        params: {
          offline,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1,
        },
      }),
    )
    .then(() => undefined);
}

Cypress.Commands.add('setNetworkOffline', () => setNetworkOffline(true));
Cypress.Commands.add('setNetworkOnline', () => setNetworkOffline(false));
