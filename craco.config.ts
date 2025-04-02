import webpackConfig from './webpack.config';

export default {
  webpack: webpackConfig,
  jest: {
    configure: {
      moduleNameMapper: {
        '^@components(.*)$': '<rootDir>/src/components$1',
        '^@functions(.*)$': '<rootDir>/src/functions$1',
        '^@modules(.*)$': '<rootDir>/src/modules$1',
        '^@pages(.*)$': '<rootDir>/src/pages$1',
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      testEnvironment: 'jsdom',
      transformIgnorePatterns: [
        'node_modules/(?!(react-syntax-highlighter)/)',
      ],
    },
  },
};
