import { defineConfig } from 'cypress';

import webpackConfig from './webpack.config';

export default defineConfig({
  projectId: 'sjqi3t',
  e2e: {
    baseUrl: 'http://localhost:3000',
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
      // NOTE: different from webpackConfig, there is a extra wrap `resolve`.
      webpackConfig: {
        resolve: {
          alias: webpackConfig.alias,
        },
        plugins: webpackConfig.plugins,
      },
    },
  },
});
