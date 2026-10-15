import { defineConfig } from 'cypress';
import { preview } from 'vite';

export default defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:4173',
    specPattern: 'cypress/offline/math-wasm-offline.cy.ts',
    async setupNodeEvents(on) {
      let server: Awaited<ReturnType<typeof preview>> | undefined;
      const buildOutDir = process.env.MATH_WASM_TEST_BUILD_DIR ?? 'build';

      on('before:run', async () => {
        server = await preview({
          build: { outDir: buildOutDir },
          preview: { host: '127.0.0.1', port: 4173, strictPort: true },
        });
      });
      on('after:run', async () => {
        await server?.close();
      });
      on('task', {
        async stopPreview() {
          await server?.close();
          server = undefined;
          return null;
        },
      });
    },
  },
});
