import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import { configs, rules as airbnbExtendedRules } from 'eslint-config-airbnb-extended';
import importX from 'eslint-plugin-import-x';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

export default defineConfig([
  ...configs.react.typescript,
  airbnbExtendedRules.base.importsStrict,
  airbnbExtendedRules.react.strict,
  airbnbExtendedRules.typescript.typescriptEslintStrict,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin as never,
      react: reactPlugin as never,
      '@stylistic': stylistic as never,
      'import-x': importX as never,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['tsconfig.json'],
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-use-before-define': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    },
  },
]);
