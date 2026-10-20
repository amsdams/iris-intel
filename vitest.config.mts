import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'reference/**'],
    alias: {
      '@iris/iitc-core': path.resolve(__dirname, './packages/iitc-core/src/index.ts'),
    },
  },
});
