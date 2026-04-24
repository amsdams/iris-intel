import { defineConfig } from 'vite';
import { resolve } from 'path';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@iris/core': resolve(__dirname, '../packages/core/src'),
      '@iris/plugin-sdk': resolve(__dirname, '../packages/plugin-sdk/src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't empty so we can run sequential builds
    lib: {
      entry: resolve(__dirname, 'src/content.tsx'),
      name: 'ContentScript',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
