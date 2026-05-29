import {defineConfig} from 'vite';
import {resolve} from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@iris/iitc-core': resolve(__dirname, '../../packages/iitc-core/src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/page-map-runtime.ts'),
      name: 'IitcIrisPageMapRuntime',
      formats: ['iife'],
      fileName: () => 'page-map-runtime.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
