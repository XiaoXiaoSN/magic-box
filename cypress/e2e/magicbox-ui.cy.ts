/// <reference types="cypress" />

describe('QR Code Scanner', () => {
  beforeEach(() => {
    cy.visit('/', {
      timeout: 30000,
      retryOnStatusCodeFailure: true,
    });
    cy.get('body').should('be.visible');
    cy.get('#root', { timeout: 10000 }).should('exist');
    cy.get('input[name="magicInput"], textarea[name="magicInput"]', {
      timeout: 15000,
    }).should('be.visible');
    cy.get('[data-testid="qr-reader-open-button"]', { timeout: 15000 }).should(
      'be.visible',
    );
  });

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

describe('Shared input', () => {
  it('keeps the edited draft through browser Back from Settings and Tools', () => {
    const input = 'textarea[name="magicInput"]';
    cy.visit('/?input=original');
    cy.get(input).should('have.value', 'original').clear().type('edited draft');

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
