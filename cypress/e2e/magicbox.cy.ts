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

  describe('MagicBox Input', () => {
    const testCases = [
      {
        testTitle: 'Base64 Encode',
        input: 'Hello World',
        output: [
          {
            title: 'Base64 encode',
            text: 'SGVsbG8gV29ybGQ=',
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
            title: 'Base64 encode',
            text: 'U0dWc2JHOGdWMjl5YkdRPQ==',
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
            title: 'Base64 encode',
            text: 'KiAqLzIgKiAqIDE=',
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
            title: 'Base64 encode',
            text: 'KiAqLzIgKiAqIDM=',
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
            title: 'Base64 encode',
            text: 'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnpkV0lpT2lJeE1qTTBOVFkzT0Rrd0lpd2libUZ0WlNJNklrcHZhRzRnUkc5bElpd2lhV0YwSWpveE5URTJNak01TURJeWZRLlNmbEt4d1JKU01lS0tGMlFUNGZ3cE1lSmYzNlBPazZ5SlZfYWRRc3N3NWM=',
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
            title: 'Base64 encode',
            text: 'MTAwKzM5',
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
            title: 'Base64 encode',
            text: 'eyJuYW1lIjogIkpvaG4iLCJhZ2UiOiAzMCwiY2l0eSI6ICJOZXcgWW9yayJ9',
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
            title: 'Base64 encode',
            text: 'MjAyNC0xMi0xNVQxOTozNDo1Ny41MzArMDg6MDA=',
          },
        ],
      },
      {
        testTitle: 'URLEncode decode',
        input: 'https://www.google.com/search?q=hello%20world',
        output: [
          {
            title: 'URLEncode decode',
            text: 'https://www.google.com/search?q=hello world',
          },
          {
            title: 'Base64 encode',
            text: 'aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9zZWFyY2g/cT1oZWxsbyUyMHdvcmxk',
          },
        ],
      },
    ];

    testCases.forEach((testCase) => {
      it(`MagicBox input: ${testCase.testTitle}`, () => {
        cy.get('[name="magicInput"]').type(testCase.input, { parseSpecialCharSequences: false });

        const magicBoxResults = cy.get('[data-testid="magic-box-result"]');
        magicBoxResults.should('be.visible').should('have.length', testCase.output.length);

        let result = magicBoxResults.first();

        testCase.output.forEach((output, index) => {
          result.within(() => {
            cy.get('[data-testid="magic-box-result-title"]').should('have.text', output.title);
            cy.get('[data-testid="magic-box-result-text"]').should('have.text', output.text);
          });

          if (index < testCase.output.length - 1) {
            result = result.next();
          }
        });
      });
    });
  });
});
