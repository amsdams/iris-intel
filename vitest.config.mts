import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@iris/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@iris/extension': path.resolve(__dirname, './packages/extension/src'),
    },
  },
});
