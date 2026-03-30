import {defineConfig} from 'vite';
import preact from '@preact/preset-vite';
import webExtension, {readJsonFile} from 'vite-plugin-web-extension';
import path from 'node:path';

const pkg = readJsonFile('package.json');
const gitSha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
const shortGitSha = gitSha ? gitSha.slice(0, 7) : '';

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
            skipManifestValidation: true,
        }),
    ],
    resolve: {
        alias: {
            '@iris/core': path.resolve(__dirname, '../core/src'),
        },
    },
    define: {
        __IRIS_VERSION__: JSON.stringify(pkg.version),
        __IRIS_GIT_SHA__: JSON.stringify(shortGitSha),
    },
    build: {
        outDir: mode === 'firefox' ? 'dist-firefox' : 'dist',
    },
}));
