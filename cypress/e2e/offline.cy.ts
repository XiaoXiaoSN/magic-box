/// <reference types="cypress" />

function resetOrigin(): void {
  cy.setNetworkOnline();
  cy.visit('/');
  cy.window().then(async (win) => {
    const registrations = await win.navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
    await Promise.all(
      (await win.caches.keys()).map((name) => win.caches.delete(name)),
    );
    win.localStorage.clear();
    win.sessionStorage.clear();
  });
  cy.clearCookies();
}

function loadControlledShell(): void {
  cy.visit('/');
  cy.window().then(
    { timeout: 60_000 },
    (win) => win.navigator.serviceWorker.ready,
  );
  cy.reload();
  cy.window().its('navigator.serviceWorker.controller').should('exist');
}

describe('offline application shell', () => {
  afterEach(() => {
    cy.setNetworkOnline();
  });

  it('loads a cold controlled shell offline without visiting feature tools', () => {
    resetOrigin();
    loadControlledShell();

    cy.window().then(async (win) => {
      const cacheName = (await win.caches.keys()).find((name) =>
        name.includes('workbox-precache'),
      );
      expect(cacheName).to.exist;
      const precache = await win.caches.open(cacheName as string);
      const cachedIndex = (await precache.keys()).find(
        (request) => new URL(request.url).pathname === '/index.html',
      );
      expect(cachedIndex).to.exist;
      expect(await precache.match(cachedIndex as Request)).to.exist;
    });

    cy.setNetworkOffline();
    cy.reload();
    cy.get('textarea[name="magicInput"]', { timeout: 15_000 }).should(
      'be.visible',
    );
  });

  it('evaluates a warmed Math tool after an offline reload', () => {
    resetOrigin();
    loadControlledShell();

    cy.get('textarea[name="magicInput"]')
      .should('be.visible')
      .clear()
      .type('100+39', { parseSpecialCharSequences: false });
    cy.contains('[data-testid="magic-box-result-text"]', '139', {
      timeout: 15_000,
    }).should('be.visible');

    cy.setNetworkOffline();
    cy.reload();
    cy.get('textarea[name="magicInput"]', { timeout: 15_000 })
      .should('be.visible')
      .clear()
      .type('40+2', { parseSpecialCharSequences: false });
    cy.contains('[data-testid="magic-box-result-title"]', 'Math Expression', {
      timeout: 15_000,
    }).should('be.visible');
    cy.contains('[data-testid="magic-box-result-text"]', '42').should(
      'be.visible',
    );
  });
});
