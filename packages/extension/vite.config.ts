import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';
import path from 'node:path';

function generateManifest() {
  const manifest = readJsonFile('src/manifest.json');
  const pkg = readJsonFile('package.json');
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  plugins: [
    preact(),
    webExtension({
      manifest: generateManifest,
    }),
  ],
  resolve: {
    alias: {
      '@iris/core': path.resolve(__dirname, '../core/src'),
    },
  },
});
