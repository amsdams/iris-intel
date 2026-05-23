const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const packageJson = require('./package.json');

function packageDirectory(sourceDir, outPath) {
    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Missing build directory: ${sourceDir}`);
    }
    if (!fs.existsSync(path.join(sourceDir, 'manifest.json'))) {
        throw new Error(`Missing manifest.json in: ${sourceDir}`);
    }

    const result = spawnSync('zip', ['-qr', outPath, '.'], {
        cwd: sourceDir,
        stdio: 'inherit',
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`zip exited with status ${result.status}`);
    }
}

try {
    console.log('Building IRIS ZIP/XPI packages...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const version = packageJson.version;
    const rootDir = __dirname;
    const buildsDir = path.join(rootDir, 'builds');
    const chromeDistDir = path.join(rootDir, 'dist');
    const firefoxDistDir = path.join(rootDir, 'dist-firefox');

    fs.mkdirSync(buildsDir, {recursive: true});

    const target = process.argv[2] ?? 'all';
    const shouldPackageChrome = target === 'all' || target === 'chrome';
    const shouldPackageFirefox = target === 'all' || target === 'firefox';
    if (!shouldPackageChrome && !shouldPackageFirefox) {
        throw new Error(`Unknown package target: ${target}`);
    }

    if (shouldPackageChrome) {
        const chromeZipPath = path.join(buildsDir, `iris-chrome-${version}-${timestamp}.zip`);
        packageDirectory(chromeDistDir, chromeZipPath);
        console.log(`Success! Chrome package created at: ${chromeZipPath}`);
    }

    if (shouldPackageFirefox) {
        const firefoxXpiPath = path.join(buildsDir, `iris-firefox-${version}-${timestamp}.xpi`);
        packageDirectory(firefoxDistDir, firefoxXpiPath);
        console.log(`Success! Firefox package created at: ${firefoxXpiPath}`);
    }
} catch (err) {
    console.error('Failed to create IRIS packages:', err);
    process.exit(1);
}
