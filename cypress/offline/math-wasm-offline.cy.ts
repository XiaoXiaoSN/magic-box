/// <reference types="cypress" />

interface MathWasmGlue {
  initSync(options: { module: WebAssembly.Module }): unknown;
  evaluate(input: string): string;
}

interface CachedMathAssets {
  glueUrl: string;
  wasmUrl: string;
}

async function findCachedMathAssets(
  win: Cypress.AUTWindow,
): Promise<CachedMathAssets | null> {
  const cacheName = (await win.caches.keys()).find(
    (name) => name === 'magic-box-feature-assets-v1',
  );
  if (!cacheName) return null;

  const cache = await win.caches.open(cacheName);
  const requests = await cache.keys();
  const wasmRequest = requests.find((request) =>
    /\/math_box_bg-[^/]+\.wasm$/.test(new URL(request.url).pathname),
  );
  if (!wasmRequest) return null;

  for (const request of requests) {
    if (!new URL(request.url).pathname.endsWith('.js')) continue;
    const response = await cache.match(request);
    if (response && (await response.text()).includes('function initSync(')) {
      return { glueUrl: request.url, wasmUrl: wasmRequest.url };
    }
  }

  return null;
}

async function waitForCachedMathAssets(
  win: Cypress.AUTWindow,
): Promise<CachedMathAssets> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const assets = await findCachedMathAssets(win);
    if (assets) return assets;
    await new Promise((resolve) => win.setTimeout(resolve, 100));
  }
  throw new Error('raw math-box glue and WASM are missing from runtime cache');
}

describe('production math WASM recovery while offline', () => {
  it('loads a queried fresh glue module and its cached WASM after the server stops', () => {
    cy.visit('/');
    cy.window().then(async (win) => {
      const registrations =
        await win.navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
      await Promise.all(
        (await win.caches.keys()).map((name) => win.caches.delete(name)),
      );
    });
    cy.reload();
    cy.window().then(
      { timeout: 60_000 },
      (win) => win.navigator.serviceWorker.ready,
    );
    cy.reload();
    cy.window().should((win) => {
      expect(win.navigator.serviceWorker.controller).not.to.equal(null);
    });

    cy.get('textarea[name="magicInput"]')
      .clear()
      .type('21*2', { parseSpecialCharSequences: false });
    cy.contains('[data-testid="magic-box-result-title"]', 'Math Expression', {
      timeout: 15_000,
    }).should('be.visible');
    cy.contains('[data-testid="magic-box-result-text"]', '42').should(
      'be.visible',
    );

    cy.window()
      .then((win) => waitForCachedMathAssets(win))
      .then(({ glueUrl, wasmUrl }) => {
        cy.task('stopPreview').then(() => {
          cy.window().then(async (win) => {
            const cachedGlue = await win.fetch(`${glueUrl}?recovery=1`);
            expect(cachedGlue.status).to.equal(200);
            expect(cachedGlue.url).to.equal(`${glueUrl}?recovery=1`);
            expect(cachedGlue.headers.get('content-type')).to.include(
              'javascript',
            );
            expect(await cachedGlue.text()).to.include('initSync');

            const freshGlue = (await win.eval(
              `import(${JSON.stringify(`${glueUrl}?recovery=2`)})`,
            )) as MathWasmGlue;
            const wasmBytes = await win
              .fetch(wasmUrl)
              .then((response) => response.arrayBuffer());
            const wasmModule = await win.WebAssembly.compile(
              new win.Uint8Array(wasmBytes),
            );
            // wasm-bindgen validates the options and module against the application realm.
            const initOptions = win.Object.create(win.Object.prototype) as {
              module: WebAssembly.Module;
            };
            initOptions.module = wasmModule;
            freshGlue.initSync(initOptions);
            expect(freshGlue.evaluate('40+2')).to.equal('42');
          });
        });
      });
  });
});
