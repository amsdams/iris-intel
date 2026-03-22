import {defineConfig} from 'vite';
import preact from '@preact/preset-vite';
import webExtension, {readJsonFile} from 'vite-plugin-web-extension';
import path from 'node:path';

function generateManifest(mode: string) {
    const manifestFile = mode === 'firefox'
        ? 'src/manifest.firefox.json'
        : 'src/manifest.chrome.json';

    const manifest = readJsonFile(manifestFile);
    const pkg = readJsonFile('package.json');

    return {
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        ...manifest,
    };
}

export default defineConfig(({mode}) => ({
    plugins: [
        preact(),
        webExtension({
            manifest: () => generateManifest(mode),
            // Explicitly include interceptor in all builds
            // Firefox doesn't reference it in the manifest directly
            // but the injector script needs it as a web-accessible resource
            additionalInputs: mode === 'firefox'
                ? ['src/content/interceptor.ts']
                : [],
        }),
    ],
    resolve: {
        alias: {
            '@iris/core': path.resolve(__dirname, '../core/src'),
        },
    },
    build: {
        outDir: mode === 'firefox' ? 'dist-firefox' : 'dist',
    },
}));