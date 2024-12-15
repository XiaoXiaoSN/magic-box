/// <reference types="cypress" />

// ***********************************************
// Custom commands for QR Reader testing
// ***********************************************

export { };

Cypress.Commands.add('openQRReader', () => {
  cy.get('[data-testid="qr-reader-open-button"]').click();
});

Cypress.Commands.add('closeQRReader', () => {
  cy.get('[data-testid="qr-reader-close-button"]').click();
});

Cypress.Commands.add('verifyQRReaderOpen', () => {
  cy.get('[data-testid="qr-reader-modal"]').should('be.visible');
  cy.get('[data-testid="qr-reader-container"]').should('be.visible');
  cy.get('[data-testid="qr-reader-close-button"]').should('be.visible');
});

Cypress.Commands.add('verifyQRReaderClosed', () => {
  cy.get('[data-testid="qr-reader-modal"]').should('not.exist');
});
