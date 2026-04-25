import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    exclude: ['**/node_modules/**', '**/dist/**', 'reference/**'],
    alias: {
      '@iris/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@iris/extension': path.resolve(__dirname, './packages/extension/src'),
      'mini-iris': path.resolve(__dirname, './apps/mini-iris/src'),
    },
  },
});
