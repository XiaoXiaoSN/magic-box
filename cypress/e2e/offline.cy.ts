/// <reference types="cypress" />

describe('offline application shell', () => {
  afterEach(() => {
    cy.setNetworkOnline();
  });

  it('loads the controlled precached app and evaluates locally offline', () => {
    cy.visit('/');
    cy.window().then(async (window) => {
      await window.navigator.serviceWorker.ready;
    });
    cy.reload();
    cy.window().its('navigator.serviceWorker.controller').should('exist');

    cy.window().then(async (window) => {
      const cacheName = (await window.caches.keys()).find((name) =>
        name.includes('workbox-precache'),
      );
      expect(cacheName).to.exist;
      const precache = await window.caches.open(cacheName as string);
      const cachedIndex = (await precache.keys()).find(
        (request) => new URL(request.url).pathname === '/index.html',
      );
      expect(cachedIndex).to.exist;
      expect(await precache.match(cachedIndex as Request)).to.exist;
    });

    cy.setNetworkOffline();
    cy.reload();
    cy.get('textarea[name="magicInput"]', { timeout: 15000 })
      .should('be.visible')
      .clear()
      .type('100+39', { parseSpecialCharSequences: false });
    cy.contains('[data-testid="magic-box-result-title"]', 'Math Expression', {
      timeout: 15000,
    }).should('be.visible');
    cy.contains('[data-testid="magic-box-result-text"]', '139').should(
      'be.visible',
    );
  });
});
