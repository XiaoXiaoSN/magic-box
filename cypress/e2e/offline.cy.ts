/// <reference types="cypress" />

interface VersionManifest {
  version: string;
  serviceWorker: string;
}

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

  it('discovers a new build after an offline reload while the old worker still controls the page', () => {
    resetOrigin();
    loadControlledShell();

    cy.request<VersionManifest>('/version.json')
      .its('body')
      .then((current) => {
        const currentWorkerUrl = new URL(
          current.serviceWorker,
          Cypress.config('baseUrl') as string,
        ).href;
        cy.window()
          .its('navigator.serviceWorker.controller.scriptURL')
          .should('eq', currentWorkerUrl);
        cy.window().then(async (win) => {
          expect(
            await win.caches.match('/version.json', { ignoreSearch: true }),
          ).to.be.undefined;
        });

        cy.task<VersionManifest>('buildPwaUpdateManifest').then((next) => {
          expect(next.version).not.to.equal(current.version);
          expect(next.serviceWorker).not.to.equal(current.serviceWorker);

          cy.setNetworkOffline();
          cy.reload();
          cy.get('textarea[name="magicInput"]', { timeout: 15_000 }).should(
            'be.visible',
          );
          cy.get('.pwa-update-title').should('not.exist');
          cy.window().then((win) =>
            win.fetch('/version.json', { cache: 'no-store' }).then(
              () => {
                throw new Error(
                  'Version discovery unexpectedly succeeded offline',
                );
              },
              (error: unknown) => {
                expect(error).to.have.property('name', 'TypeError');
              },
            ),
          );

          // Serve B's generated manifest at A's origin without touching A's caches or registration.
          cy.intercept('GET', '/version.json', { body: next }).as(
            'nextVersion',
          );
          cy.setNetworkOnline();
          cy.window().then((win) => {
            win.dispatchEvent(new win.Event('online'));
          });
          cy.wait('@nextVersion')
            .its('response.body')
            .should('deep.equal', next);
          cy.get('.pwa-update-title').should('be.visible');
          cy.window()
            .its('navigator.serviceWorker.controller.scriptURL')
            .should('eq', currentWorkerUrl);
        });
      });
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
