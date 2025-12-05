/// <reference types="cypress" />

// ***********************************************
// Custom commands for QR Reader testing
// ***********************************************

export { };

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
  cy.get('[data-testid="qr-reader-modal"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="qr-reader-container"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="qr-reader-close-button"]', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('verifyQRReaderClosed', () => {
  cy.get('[data-testid="qr-reader-modal"]', { timeout: 10000 }).should('not.exist');
});
