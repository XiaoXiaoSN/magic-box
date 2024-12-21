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
      transformIgnorePatterns: [
        'node_modules/(?!(react-syntax-highlighter)/)',
      ],
    },
  },
};
