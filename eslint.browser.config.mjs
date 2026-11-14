import eslint from '@eslint/js';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  {
    files: ['tests/browser/**/*.mjs'],
    languageOptions: {globals: {...globals.browser, ...globals.node}},
    rules: {'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none'}]},
  },
  {
    files: ['tests/browser/**/*.smoke.mjs'],
    rules: {'no-restricted-imports': ['error', {paths: [{name: '@playwright/test', importNames: ['test'],
      message: 'Import test from smoke-fixtures.mjs or a fixture extending it.'}]}]},
  },
];
