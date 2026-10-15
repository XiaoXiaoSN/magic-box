/// <reference types="cypress" />

interface MathWasmGlue {
  initSync(options: { module: WebAssembly.Module }): unknown;
  evaluate(input: string): string;
}

interface BuildManifest {
  serviceWorker: string;
}

describe('production math WASM recovery while offline', () => {
  it('loads a queried fresh glue module and its cached WASM after the server stops', () => {
    cy.visit('/');
    cy.window().then(
      { timeout: 60_000 },
      (win) => win.navigator.serviceWorker.ready,
    );
    cy.reload();
    cy.window().should((win) => {
      expect(win.navigator.serviceWorker.controller).not.to.equal(null);
    });

    cy.window()
      .then(async (win) => {
        const manifest = (await win
          .fetch('/version.json')
          .then((response) => response.json())) as BuildManifest;
        const workerSource = await win
          .fetch(manifest.serviceWorker)
          .then((response) => response.text());
        const gluePaths = Array.from(
          workerSource.matchAll(/url:"([^"]*math_box-[^"]+\.js)"/g),
          (match) => match[1],
        );
        const wasmPath = workerSource.match(
          /url:"([^"]*math_box_bg-[^"]+\.wasm)"/,
        )?.[1];
        if (!wasmPath)
          throw new Error('math-box WASM is missing from precache');

        let gluePath: string | undefined;
        for (const assetPath of gluePaths) {
          const source = await win
            .fetch(new URL(assetPath, win.location.origin))
            .then((response) => response.text());
          if (source.includes('initSync')) {
            gluePath = assetPath;
            break;
          }
        }
        if (!gluePath)
          throw new Error('raw math-box glue is missing from precache');

        const glueUrl = new URL(gluePath, win.location.origin).href;
        const wasmUrl = new URL(wasmPath, win.location.origin).href;
        let assetsAreCached = false;
        for (const name of await win.caches.keys()) {
          const cache = await win.caches.open(name);
          if ((await cache.match(glueUrl)) && (await cache.match(wasmUrl))) {
            assetsAreCached = true;
            break;
          }
        }
        if (!assetsAreCached)
          throw new Error(
            'raw glue and WASM are missing from Workbox precache',
          );
        return { glueUrl, wasmUrl };
      })
      .then(({ glueUrl, wasmUrl }) => {
        cy.task('stopPreview').then(() => {
          cy.window().then(async (win) => {
            const cachedGlue = await win.fetch(`${glueUrl}?recovery=1`);
            expect(cachedGlue.status).to.equal(200);
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
