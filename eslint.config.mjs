import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['**/vite.config.ts'],
    languageOptions: {
        globals: {
            ...globals.node,
        }
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/vite.config.ts'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        chrome: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // THE "NO ANY" RULES
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      
      // STRENGTHEN API BOUNDARIES
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      
      // PREVENT COMMON TYPE BUGS
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^h$' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // REACT/PREACT SPECIFIC
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/dist-firefox/**',
      '**/out/**',
      '**/node_modules/**',
      '**/reference/**',
      'vite.config.ts',
      '**/vite.config.ts.timestamp-*',
      'eslint.config.mjs',
      'packages/extension/public/**'
    ],
  }
);
