/// <reference types="cypress" />

describe('MagicBox Page', () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit('/', {
      timeout: 30000,
      retryOnStatusCodeFailure: true,
    });
    
    // Wait for the page to be fully loaded
    cy.get('body').should('be.visible');
    
    // Wait for React app to mount (check for root element)
    cy.get('#root', { timeout: 10000 }).should('exist');
    
    // Wait for lazy loaded components to be ready
    // Wait for the input/textarea field to be visible (indicates MagicBoxPage is loaded)
    // MUI TextField with multiline uses textarea, so we check for either input or textarea
    cy.get('input[name="magicInput"], textarea[name="magicInput"]', { timeout: 15000 }).should('be.visible');
    
    // Wait for QR reader button to be available (indicates QRCodeReader is loaded)
    cy.get('[data-testid="qr-reader-open-button"]', { timeout: 15000 }).should('be.visible');
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

  describe('MagicBox Input', () => {
    const testCases = [
      {
        testTitle: 'Base64 Encode',
        input: 'Hello World',
        output: [
          {
            title: 'Base64 Encode',
            text: 'SGVsbG8gV29ybGQ=',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 2\ncharacters: 11',
          },
        ],
      },
      {
        testTitle: 'Base64 Decode',
        input: 'SGVsbG8gV29ybGQ=',
        output: [
          {
            title: 'Base64 decode',
            text: 'Hello World',
          },
          {
            title: 'Base64 Encode',
            text: 'U0dWc2JHOGdWMjl5YkdRPQ==',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 1\ncharacters: 16',
          },
        ],
      },
      {
        testTitle: 'Cron Expression',
        input: '* */2 * * 1',
        output: [
          {
            title: 'Cron Expression',
            text: 'Every minute, every 2 hours, only on Monday',
          },
          {
            title: 'Base64 Encode',
            text: 'KiAqLzIgKiAqIDE=',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 5\ncharacters: 11',
          },
        ],
      },
      {
        testTitle: 'Cron Expression in Chinese',
        input: `* */2 * * 3
::lang=tw`,
        output: [
          {
            title: 'Cron Expression',
            text: '每分鐘, 每 2 小時, 僅在 星期三',
          },
          {
            title: 'Base64 Encode',
            text: 'KiAqLzIgKiAqIDM=',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 5\ncharacters: 11',
          },
        ],
      },
      {
        testTitle: 'JWT Decode',
        input: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        output: [
          {
            title: 'JWT Decode',
            text: `{
    "header": {
        "alg": "HS256",
        "typ": "JWT"
    },
    "body": {
        "sub": "1234567890",
        "name": "John Doe",
        "iat": 1516239022
    }
}`,
          },
          {
            title: 'Base64 Encode',
            text: 'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnpkV0lpT2lJeE1qTTBOVFkzT0Rrd0lpd2libUZ0WlNJNklrcHZhRzRnUkc5bElpd2lhV0YwSWpveE5URTJNak01TURJeWZRLlNmbEt4d1JKU01lS0tGMlFUNGZ3cE1lSmYzNlBPazZ5SlZfYWRRc3N3NWM=',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 1\ncharacters: 155',
          },
        ],
      },
      {
        testTitle: 'Math Expression',
        input: '100+39',
        output: [
          {
            title: 'Math Expression',
            text: '139',
          },
          {
            title: 'Base64 Encode',
            text: 'MTAwKzM5',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 1\ncharacters: 6',
          },
        ],
      },
      {
        testTitle: 'Pretty JSON',
        input: '{"name": "John","age": 30,"city": "New York"}',
        output: [
          {
            title: 'Pretty JSON',
            text: `{
    "name": "John",
    "age": 30,
    "city": "New York"
}`,
          },
          {
            title: 'Base64 Encode',
            text: 'eyJuYW1lIjogIkpvaG4iLCJhZ2UiOiAzMCwiY2l0eSI6ICJOZXcgWW9yayJ9',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 5\ncharacters: 45',
          },
        ],
      },
      {
        testTitle: 'Time Format',
        input: '2024-12-15T19:34:57.530+08:00',
        output: [
          {
            title: 'timestamp (s)',
            text: '1734262497.53',
          },
          {
            title: 'timestamp (ms)',
            text: '1734262497530',
          },
          {
            title: 'Base64 Encode',
            text: 'MjAyNC0xMi0xNVQxOTozNDo1Ny41MzArMDg6MDA=',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 1\ncharacters: 29',
          },
        ],
      },
      {
        testTitle: 'URLEncode decode',
        input: 'https://www.google.com/search?q=hello%20world',
        output: [
          {
            title: 'URLEncoding Decode',
            text: 'https://www.google.com/search?q=hello world',
          },
          {
            title: 'Base64 Encode',
            text: 'aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9zZWFyY2g/cT1oZWxsbyUyMHdvcmxk',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 1\ncharacters: 45',
          },
        ],
      },
    ];

    testCases.forEach((testCase) => {
      it(`MagicBox input: ${testCase.testTitle}`, () => {
        // MUI TextField with multiline uses textarea
        cy.get('input[name="magicInput"], textarea[name="magicInput"]', { timeout: 10000 })
          .should('be.visible')
          .clear()
          .type(testCase.input, { parseSpecialCharSequences: false });

        // Wait for results to appear (MagicBox processes input with 500ms debounce)
        cy.get('[data-testid="magic-box-result"]', { timeout: 10000 })
          .should('be.visible')
          .should('have.length', testCase.output.length);

        testCase.output.forEach((output, index) => {
          cy.get('[data-testid="magic-box-result"]')
            .eq(index)
            .within(() => {
              cy.get('[data-testid="magic-box-result-title"]', { timeout: 10000 })
                .should('be.visible')
                .should('have.text', output.title);
              
              // Word Count uses KeyValueBoxTemplate, which displays key-value pairs
              // Other boxes use DefaultBoxTemplate or CodeBoxTemplate with magic-box-result-text
              if (output.title === 'Word Count') {
                // For Word Count, check that the key-value pairs are displayed
                // The text format is "lines: X\nwords: Y\ncharacters: Z"
                // KeyValueBoxTemplate renders these as separate key-value pairs in Paper elements
                const parts = output.text.split('\n');
                parts.forEach((part) => {
                  const [key, value] = part.split(': ');
                  // Use the testid attributes added to KeyValueBoxTemplate
                  cy.get(`[data-testid="magic-box-key-value-pair-${key}"]`, { timeout: 10000 })
                    .should('exist')
                    .within(() => {
                      // Verify the key exists
                      cy.get(`[data-testid="magic-box-key-${key}"]`, { timeout: 10000 })
                        .should('be.visible')
                        .should('have.text', key);
                      // Verify the value exists
                      cy.get(`[data-testid="magic-box-value-${key}"]`, { timeout: 10000 })
                        .should('be.visible')
                        .should('have.text', value);
                    });
                });
              } else {
                // For other boxes, check the text content directly
                // Use scrollIntoView for elements that might be clipped
                cy.get('[data-testid="magic-box-result-text"]', { timeout: 10000 })
                  .should('exist')
                  .scrollIntoView()
                  .should('be.visible')
                  .should('have.text', output.text);
              }
            });
        });
      });
    });
  });
});
