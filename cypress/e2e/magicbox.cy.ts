/// <reference types="cypress" />

describe('MagicBox Page', () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit('/');
    cy.get('body').should('be.visible');
  });

  describe('QR Code Scanner', () => {
    it('should open camera modal when clicking QR code icon', () => {
      cy.openQRReader();
      cy.verifyQRReaderOpen();
    });

    it('should close camera modal when clicking close button', () => {
      cy.openQRReader();
      cy.closeQRReader();
      cy.verifyQRReaderClosed();
    });

    it('should close camera modal when clicking outside', () => {
      cy.openQRReader();
      cy.get('[data-testid="qr-reader-modal"]').click('topLeft');
      cy.verifyQRReaderClosed();
    });
  });
});
