import { defineConfig } from "eslint/config";
import react from "eslint-plugin-react";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import stylistic from "@stylistic/eslint-plugin-ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    extends: compat.extends(
      "airbnb",
      "@kesills/airbnb-typescript",
      "airbnb/hooks",
      "plugin:@typescript-eslint/recommended",
      "plugin:react/recommended"
    ),
    plugins: {
      react,
      "@typescript-eslint": typescriptEslint,
      "simple-import-sort": simpleImportSort,
      "@stylistic/ts": stylistic,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parser: tsParser as any,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: ["tsconfig.json"],
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
        },
      ],
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "arrow-function",
          unnamedComponents: "arrow-function",
        },
      ],
      "@typescript-eslint/no-use-before-define": "warn",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@stylistic/ts/brace-style": ["error", "1tbs", { allowSingleLine: true }],
    },
  },
]);
