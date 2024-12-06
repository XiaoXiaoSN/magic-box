/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Opens the QR Reader modal
     * @example cy.openQRReader()
     */
    openQRReader(): Chainable<void>

    /**
     * Closes the QR Reader modal using close button
     * @example cy.closeQRReader()
     */
    closeQRReader(): Chainable<void>

    /**
     * Verifies that QR Reader is open and all elements are visible
     * @example cy.verifyQRReaderOpen()
     */
    verifyQRReaderOpen(): Chainable<void>

    /**
     * Verifies that QR Reader is closed
     * @example cy.verifyQRReaderClosed()
     */
    verifyQRReaderClosed(): Chainable<void>
  }
}
