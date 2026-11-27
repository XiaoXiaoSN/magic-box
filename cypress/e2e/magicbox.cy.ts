/// <reference types="cypress" />

describe('MagicBox Page', () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit('/', {
      timeout: 30000,
      retryOnStatusCodeFailure: true,
      onBeforeLoad: (window) => {
        window.localStorage.setItem(
          'mb_prefs',
          JSON.stringify({ timezoneMode: 'fixed', timezoneOffset: 8 }),
        );
      },
    });

    // Wait for the page to be fully loaded
    cy.get('body').should('be.visible');

    // Wait for React app to mount (check for root element)
    cy.get('#root', { timeout: 10000 }).should('exist');

    // Wait for lazy loaded components to be ready
    // Wait for the input/textarea field to be visible (indicates MagicBoxPage is loaded)
    // MUI TextField with multiline uses textarea, so we check for either input or textarea
    cy.get('input[name="magicInput"], textarea[name="magicInput"]', {
      timeout: 15000,
    }).should('be.visible');

    // Wait for QR reader button to be available (indicates QRCodeReader is loaded)
    cy.get('[data-testid="qr-reader-open-button"]', { timeout: 15000 }).should(
      'be.visible',
    );
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

  it('uses inline timezone directives for worker-backed Timestamp and Now', () => {
    const input = 'textarea[name="magicInput"]';
    const title = '[data-testid="magic-box-result-title"]';
    const output = '[data-testid="magic-box-result-text"]';
    cy.get(input).type('1700000000\n::tz=-5');
    cy.contains(title, /^RFC 3339 \(UTC-5\)$/).should('be.visible');
    cy.contains(output, '2023-11-14T17:13:20.000-05:00').should('be.visible');

    cy.get(input).clear().type('now\n::timezone=0');
    cy.contains(title, /^RFC 3339 \(UTC\+0\)$/).should('be.visible');
    cy.contains(title, 'Timestamp (s)').should('be.visible');

    cy.get(input).clear().type('now\n::tz=invalid-zone');
    cy.contains(output, 'Unknown timezone "invalid-zone"').should('be.visible');
  });

  describe('Shared input', () => {
    it('keeps the edited draft through browser Back from Settings and Tools', () => {
      const input = 'textarea[name="magicInput"]';
      cy.visit('/?input=original');
      cy.get(input)
        .should('have.value', 'original')
        .clear()
        .type('edited draft');

      cy.get('header a[href="/settings"]').click();
      cy.location('pathname').should('eq', '/settings');
      cy.go('back');
      cy.location('search').should('eq', '?input=original');
      cy.get(input).should('have.value', 'edited draft').type('{end} again');

      cy.get('header a[href="/boxes"]').click();
      cy.location('pathname').should('eq', '/boxes');
      cy.go('back');
      cy.location('search').should('eq', '?input=original');
      cy.get(input).should('have.value', 'edited draft again');
    });

    it('opens an empty preview from its copied link and an empty home from its query', () => {
      const previewInput = 'textarea[data-magic-input="true"]';
      let copiedLink = '';
      cy.visit('/list?box=word-count#preview');
      cy.location('pathname').should('eq', '/boxes');
      cy.location('search').should('eq', '?box=word-count');
      cy.location('hash').should('eq', '#preview');
      cy.window().then((win) => {
        cy.stub(win.navigator.clipboard, 'writeText')
          .callsFake(async (url: string) => {
            copiedLink = url;
          })
          .as('copyShareLink');
      });
      cy.get(previewInput).should('not.have.value', '').clear();
      cy.get('[data-testid="copy-tool-share-link"]').click();
      cy.get('@copyShareLink')
        .should('have.been.calledOnce')
        .then(() => {
          const url = new URL(copiedLink);
          expect(url.searchParams.get('input')).to.equal('');
          cy.visit(`${url.pathname}${url.search}`);
        });
      cy.get(previewInput).should('have.value', '');

      cy.visit('/?input=', {
        onBeforeLoad: (win) => {
          win.sessionStorage.setItem(
            'mb_input_draft',
            JSON.stringify({ version: 1, input: 'recipient draft' }),
          );
        },
      });
      cy.get('textarea[name="magicInput"]').should('have.value', '');
    });
  });

  describe('Tool preview copy and paste', () => {
    const previewInput = 'textarea[data-magic-input="true"]';
    const result = '[data-testid="magic-box-result"]';
    const output = '[data-testid="magic-box-result-text"]';

    function openPreview(copyMode: 'enter' | 'paste') {
      cy.visit('/boxes?box=base64-encode&input=Hello');
      if (copyMode === 'paste') {
        cy.get('header a[href="/settings"]').click();
        cy.findByRole('radio', { name: 'Copy & paste back' })
          .check({ force: true })
          .should('be.checked');
        cy.go('back');
      }

      cy.get(previewInput).should('have.value', 'Hello').focus();
      cy.get(result).find(output).should('have.text', 'SGVsbG8=');
      cy.get(previewInput).trigger('keydown', {
        eventConstructor: 'KeyboardEvent',
        key: 'Home',
        altKey: true,
      });
      cy.get(result).should('have.class', 'is-selected');
    }

    for (const shortcut of [
      { label: 'Ctrl+Enter', copyMode: 'enter', ctrlKey: true },
      { label: 'Cmd+Enter', copyMode: 'enter', metaKey: true },
      { label: 'Enter in paste mode', copyMode: 'paste' },
    ] as const) {
      it(`copies and pastes the selected preview result with ${shortcut.label}`, () => {
        openPreview(shortcut.copyMode);
        cy.window().then((win) => {
          cy.stub(win.navigator.clipboard, 'writeText')
            .as('copyPreviewResult')
            .resolves();
        });

        cy.get(previewInput).trigger('keydown', {
          eventConstructor: 'KeyboardEvent',
          key: 'Enter',
          ctrlKey: 'ctrlKey' in shortcut,
          metaKey: 'metaKey' in shortcut,
        });

        cy.get('@copyPreviewResult').should(
          'have.been.calledOnceWithExactly',
          'SGVsbG8=',
        );
        cy.get<HTMLTextAreaElement>(previewInput).should(([input]) => {
          expect(input.value).to.equal('SGVsbG8=');
          expect(input.ownerDocument.activeElement).to.equal(input);
          expect(input.selectionStart).to.equal('SGVsbG8='.length);
          expect(input.selectionEnd).to.equal('SGVsbG8='.length);
        });
        cy.get(result).find(output).should('have.text', 'U0dWc2JHOD0=');
      });
    }

    it('keeps the preview input unchanged when both clipboard methods fail', () => {
      openPreview('paste');
      cy.window().then((win) => {
        cy.stub(win.navigator.clipboard, 'writeText')
          .as('copyPreviewResult')
          .rejects(new Error('Clipboard blocked'));
        cy.stub(win.document, 'execCommand').as('fallbackCopy').returns(false);
      });
      cy.get(previewInput).trigger('keydown', {
        eventConstructor: 'KeyboardEvent',
        key: 'Enter',
      });

      cy.get('@copyPreviewResult').should(
        'have.been.calledOnceWithExactly',
        'SGVsbG8=',
      );
      cy.get('@fallbackCopy').should('have.been.calledOnceWithExactly', 'copy');
      cy.get(previewInput).should('have.value', 'Hello');
      cy.get(result).find(output).should('have.text', 'SGVsbG8=');
    });
  });

  describe('MagicBox Input', () => {
    const enableJsonTools = () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'mb_settings',
          JSON.stringify({
            version: 2,
            boxes: { 'json-tools': { enabled: true } },
          }),
        );
      });
      cy.reload();
    };

    it('runs JSON Tools aliases through the web input', () => {
      enableJsonTools();

      const input = 'textarea[name="magicInput"]';
      const title = '[data-testid="magic-box-result-title"]';
      const result = '[data-testid="magic-box-result"]';
      const output = '[data-testid="magic-box-result-text"]';
      const typeInput = (value: string) =>
        cy.get(input).clear().type(value, { parseSpecialCharSequences: false });

      for (const [value, name, expected] of [
        [
          '{"a":1}\n---\n{"b":2}\n::merge',
          'JSON Merge',
          '{\n  "a": 1,\n  "b": 2\n}',
        ],
        ['{"a":1}\n::jsonptr=/a', 'JSON Pointer', '1'],
        ['[{"a":1}]\n::ndjson', 'To JSONL', '{"a":1}'],
      ]) {
        typeInput(value);
        cy.contains(title, new RegExp(`^${name}$`))
          .closest(result)
          .find(output)
          .should('have.text', expected);
      }

      typeInput('{"a":1}\n::json');
      cy.contains(title, /^JSON Output$/).should('be.visible');
      cy.get('[data-testid="magic-box-pending"]').should('not.exist');
      cy.contains(
        title,
        /^(JSON Tools|JSON Merge|JSON Pointer|To JSONL)$/,
      ).should('not.exist');
    });

    it('shows the worker limit for a valid JSON Pointer that is too long to transfer', () => {
      enableJsonTools();

      const input = 'textarea[name="magicInput"]';
      const title = '[data-testid="magic-box-result-title"]';
      const result = '[data-testid="magic-box-result"]';
      const output = '[data-testid="magic-box-result-text"]';
      cy.get(input).type('{"invoice":42}\n::jsonpointer=/invoice', {
        parseSpecialCharSequences: false,
      });
      cy.contains(title, /^JSON Pointer$/)
        .closest(result)
        .find(output)
        .should('have.text', '42');

      const field = 'invoice'.padEnd(4097, '0');
      const oversized = `${JSON.stringify({ [field]: 42 })}\n::jsonpointer=/${field}`;
      cy.get<HTMLTextAreaElement>(input).then((elements) => {
        const textarea = elements[0];
        const win = textarea.ownerDocument.defaultView;
        if (!win) throw new Error('The input has no browser window.');
        const setValue = Object.getOwnPropertyDescriptor(
          win.HTMLTextAreaElement.prototype,
          'value',
        )?.set;
        if (!setValue) throw new Error('The textarea value setter is missing.');
        setValue.call(textarea, oversized);
        textarea.dispatchEvent(new win.Event('input', { bubbles: true }));
      });

      cy.contains(title, /^JSON Tools$/)
        .closest(result)
        .find(output)
        .should(
          'have.text',
          'A worker option value exceeds the 4096-character limit.',
        );
      cy.contains(title, /^JSON Pointer$/).should('not.exist');
      cy.get('[data-testid="magic-box-pending"]').should('not.exist');
    });

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
        freezeAt: '2024-01-01T00:00:00.000Z',
        output: [
          {
            title: 'Cron Expression',
            text: 'Every minute, every 2 hours, only on Monday',
          },
          {
            title: 'Next executions',
            text: [
              '1: 2024-01-01T08:01:00.000+08:00',
              '2: 2024-01-01T08:02:00.000+08:00',
              '3: 2024-01-01T08:03:00.000+08:00',
              '4: 2024-01-01T08:04:00.000+08:00',
              '5: 2024-01-01T08:05:00.000+08:00',
            ].join('\n'),
          },
          {
            title: 'Base64 Encode',
            text: 'KiAqLzIgKiAqIDE=',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 2\ncharacters: 11',
          },
        ],
      },
      {
        testTitle: 'Cron Expression in Chinese',
        input: `* */2 * * 3
::lang=tw`,
        freezeAt: '2024-01-01T00:00:00.000Z',
        output: [
          {
            title: 'Cron Expression',
            text: '每分鐘, 每 2 小時, 僅在 星期三',
          },
          {
            title: 'Next executions',
            text: [
              '1: 2024-01-03T00:00:00.000+08:00',
              '2: 2024-01-03T00:01:00.000+08:00',
              '3: 2024-01-03T00:02:00.000+08:00',
              '4: 2024-01-03T00:03:00.000+08:00',
              '5: 2024-01-03T00:04:00.000+08:00',
            ].join('\n'),
          },
          {
            title: 'Base64 Encode',
            text: 'KiAqLzIgKiAqIDM=',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 2\ncharacters: 11',
          },
        ],
      },
      {
        testTitle: 'JWT Decode',
        input:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
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
    },
    "details": {
        "Signature": "Unverified (decode only)",
        "Issued At": "2018-01-18T09:30:22.000+08:00",
        "Validity": "No validity window"
    }
}`,
          },
          {
            title: 'Base64 Encode',
            text: 'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnpkV0lpT2lJeE1qTTBOVFkzT0Rrd0lpd2libUZ0WlNJNklrcHZhRzRnUkc5bElpd2lhV0YwSWpveE5URTJNak01TURJeWZRLlNmbEt4d1JKU01lS0tGMlFUNGZ3cE1lSmYzNlBPazZ5SlZfYWRRc3N3NWM=',
          },
          {
            title: 'Word Count',
            text: 'lines: 1\nwords: 3\ncharacters: 155',
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
            text: 'lines: 1\nwords: 2\ncharacters: 6',
          },
        ],
      },
      {
        testTitle: 'Pretty JSON',
        input: '{"name": "John","age": 30,"city": "New York"}',
        output: [
          {
            title: 'JSON Output',
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
            text: 'lines: 1\nwords: 7\ncharacters: 45',
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
            text: 'lines: 1\nwords: 7\ncharacters: 29',
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
            text: 'lines: 1\nwords: 8\ncharacters: 45',
          },
        ],
      },
    ];

    testCases.forEach((testCase) => {
      it(`MagicBox input: ${testCase.testTitle}`, () => {
        if ('freezeAt' in testCase && typeof testCase.freezeAt === 'string') {
          cy.clock(new Date(testCase.freezeAt).getTime(), ['Date']);
        }

        // MUI TextField with multiline uses textarea
        cy.get('input[name="magicInput"], textarea[name="magicInput"]', {
          timeout: 10000,
        })
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
              cy.get('[data-testid="magic-box-result-title"]', {
                timeout: 10000,
              })
                .should('be.visible')
                .should('have.text', output.title);

              // Structured boxes display key-value pairs instead of plain text.
              if (
                output.title === 'Word Count' ||
                output.title === 'Next executions'
              ) {
                // Structured boxes display their key-value pairs separately.
                // The text format is "lines: X\nwords: Y\ncharacters: Z"
                // KeyValueBoxTemplate renders these as separate key-value pairs in Paper elements
                const parts = output.text.split('\n');
                parts.forEach((part) => {
                  const [key, value] = part.split(': ');
                  // Use the testid attributes added to KeyValueBoxTemplate
                  cy.get(`[data-testid="magic-box-key-value-pair-${key}"]`, {
                    timeout: 10000,
                  })
                    .should('exist')
                    .within(() => {
                      // Verify the key exists
                      cy.get(`[data-testid="magic-box-key-${key}"]`, {
                        timeout: 10000,
                      })
                        .should('be.visible')
                        .should('have.text', key);
                      // Verify the value exists
                      cy.get(`[data-testid="magic-box-value-${key}"]`, {
                        timeout: 10000,
                      })
                        .should('be.visible')
                        .should('have.text', value);
                    });
                });
              } else {
                // For other boxes, check the text content directly
                // Use scrollIntoView for elements that might be clipped
                cy.get('[data-testid="magic-box-result-text"]', {
                  timeout: 10000,
                })
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

describe('Interactive Text Diff', () => {
  const card = '[data-testid="magic-box-result"]';
  const cardTitle = '[data-testid="magic-box-result-title"]';

  function openDiff(source: string) {
    const input = source === '' ? '::diff' : `${source}\n::diff`;
    cy.visit(`/?input=${encodeURIComponent(input)}`);
    cy.contains(cardTitle, /^Text Diff$/)
      .closest(card)
      .as('diffCard');
  }

  function expectDiff(output: string) {
    cy.findByText('Comparison result').should('be.visible');
    cy.get('[data-testid="magic-box-result-text"]')
      .last()
      .should('have.text', output);
  }

  it('compares an empty target as a pure deletion', () => {
    openDiff('x');
    cy.get('@diffCard').within(() => {
      cy.findByRole('textbox', { name: 'Paste the second text' }).should(
        'have.value',
        '',
      );
      cy.findByRole('button', { name: 'Compare' }).click();
      expectDiff('@@ +0 -1 @@\n- x');
    });
  });

  it('compares an empty source with empty and nonempty targets', () => {
    openDiff('');
    cy.get('@diffCard').within(() => {
      cy.findByRole('button', { name: 'Compare' }).click();
      expectDiff('@@ +0 -0 @@');
      cy.findByRole('textbox', { name: 'Paste the second text' }).type('x');
      cy.findByRole('button', { name: 'Compare' }).click();
      expectDiff('@@ +1 -0 @@\n+ x');
    });
  });

  it('keeps edits, output and copied plaintext in sync with the expanded view', () => {
    const firstDiff = '@@ +1 -1 @@\n- old\n+ new';
    const target = 'third\n\n';
    const nextDiff = '@@ +3 -1 @@\n- old\n+ third\n+ \n+ ';
    openDiff('old');
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('copy').resolves();
    });
    cy.get('@diffCard').within(() => {
      cy.findByRole('textbox', { name: 'Paste the second text' }).type('new');
      cy.findByRole('button', { name: 'Compare' }).click();
      expectDiff(firstDiff);
      cy.findByRole('button', { name: 'Expand Text Diff' }).click();
    });

    cy.get('.box-modal-card')
      .should('be.visible')
      .within(() => {
        expectDiff(firstDiff);
        cy.findByRole('textbox', { name: 'Paste the second text' })
          .should('have.value', 'new')
          .clear()
          .type(target);
        cy.findByText('Comparison result').should('not.exist');
        cy.findByRole('button', { name: 'Compare' }).click();
        expectDiff(nextDiff);
        cy.findByRole('button', { name: 'Close' }).click();
      });

    cy.get('@diffCard').within(() => {
      cy.findByRole('textbox', { name: 'Paste the second text' }).should(
        'have.value',
        target,
      );
      expectDiff(nextDiff);
      cy.findByRole('button', { name: 'Copy Text Diff output' }).click();
      cy.findByRole('button', { name: 'Expand Text Diff' }).click();
    });
    cy.get('@copy').should('have.been.calledOnceWithExactly', nextDiff);

    cy.get('.box-modal-card')
      .should('be.visible')
      .within(() => {
        cy.findByRole('textbox', { name: 'Paste the second text' }).should(
          'have.value',
          target,
        );
        expectDiff(nextDiff);
      });
  });
});

describe('Tool browser accessibility', () => {
  it('filters boxes with the keyboard and returns focus to the category control', () => {
    cy.visit('/boxes');
    const category = () => cy.findByRole('combobox', { name: 'Box category' });

    category().should('contain.text', 'All categories').focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.findByRole('option', { name: 'All categories' }).should('be.focused');
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.focused()
      .invoke('text')
      .then((label) => {
        cy.press(Cypress.Keyboard.Keys.ENTER);
        category().should('have.text', label).and('be.focused');
      });

    cy.findByRole('button', { name: 'Reorder' }).click();
    cy.findByRole('button', { name: 'Done' }).click();
    category().should('have.text', 'All categories');
  });

  it('moves focus between the mobile library and detail and keeps desktop selection focused', () => {
    cy.viewport(390, 844);
    cy.visit('/boxes');

    const back = () => cy.findByRole('button', { name: /All boxes/ });
    const search = () => cy.findByRole('textbox', { name: 'Search boxes' });
    const tool = () => cy.findByRole('button', { name: 'UUID' });

    search().type('UUID');
    tool().focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.findByRole('heading', { name: 'UUID' }).should('be.visible');
    back().should('be.focused');
    search().should('not.exist');
    tool().should('not.exist');

    cy.press(Cypress.Keyboard.Keys.ESC);
    tool().should('be.focused');
    search().should('have.value', 'UUID');
    back().should('not.exist');

    cy.press(Cypress.Keyboard.Keys.SPACE);
    back().should('be.focused');
    cy.press(Cypress.Keyboard.Keys.SPACE);
    tool().should('be.focused');

    cy.viewport(900, 844);
    tool().focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.findByRole('heading', { name: 'UUID' }).should('be.visible');
    tool().should('be.focused');
    search().should('be.visible');
  });
});

describe('Shared dialog accessibility', () => {
  it('focuses Cancel in the reset dialog and restores focus on Escape', () => {
    cy.visit('/settings');
    const reset = () =>
      cy.findByRole('button', { name: 'Restore all defaults' });

    reset().focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.findByRole('alertdialog', { name: 'Restore all defaults?' })
      .findByRole('button', { name: 'Cancel' })
      .should('be.focused');
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.findByRole('alertdialog').should('not.exist');
    reset().should('be.focused');
  });

  it('names the expanded result, traps focus, and restores it after Escape or a backdrop click', () => {
    cy.visit('/boxes?box=word-count&input=Hello');
    const expand = () => cy.findByRole('button', { name: 'Expand Word Count' });
    const dialog = () => cy.findByRole('dialog', { name: 'Word Count' });

    expand().focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    dialog().should('have.attr', 'aria-modal', 'true').and('be.focused');
    dialog().findByRole('heading', { name: 'Word Count' }).should('be.visible');

    for (let index = 0; index < 4; index += 1) {
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.focused().closest('[role="dialog"]').should('exist');
    }

    cy.press(Cypress.Keyboard.Keys.ESC);
    dialog().should('not.exist');
    expand().should('be.focused');

    cy.press(Cypress.Keyboard.Keys.SPACE);
    dialog().click(8, 8);
    dialog().should('not.exist');
    expand().should('be.focused');
  });

  it('names the AI settings dialog and returns focus to its opener', () => {
    cy.visit('/boxes?box=local-ai', {
      onBeforeLoad: (window) => {
        cy.stub(window, 'Worker').returns({
          postMessage: () => {},
          terminate: () => {},
        });
      },
    });
    const gear = () => cy.findByRole('button', { name: 'AI settings' });
    const dialog = () => cy.findByRole('dialog', { name: 'AI settings' });

    gear().focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    dialog().should('have.attr', 'aria-modal', 'true').and('be.focused');
    dialog()
      .findByRole('heading', { name: 'AI settings' })
      .should('be.visible');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().closest('[role="dialog"]').should('exist');
    cy.press(Cypress.Keyboard.Keys.ESC);
    dialog().should('not.exist');
    gear().should('be.focused');
  });
});
