import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/interceptor.ts'),
      name: 'Interceptor',
      formats: ['iife'],
      fileName: () => 'interceptor.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
