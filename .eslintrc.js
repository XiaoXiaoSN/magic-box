// the .eslintrc.js is for craco only, please use eslint.config.ts instead
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: ['./tsconfig.json'],
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
    },
    env: {
      browser: true,
      es2021: true,
    },
    plugins: ['@typescript-eslint', 'react', 'simple-import-sort'],
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'airbnb',
      'airbnb/hooks',
      'plugin:react-hooks/recommended',
    ],
    rules: {
      '@typescript-eslint/no-use-before-define': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  };
  