const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');

async function zipDirectory(sourceDir, outPath, extraFiles) {
    const { ZipArchive } = await import('archiver');
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', err => reject(err))
            .pipe(stream);
        
        extraFiles.forEach(file => {
            if (fs.existsSync(file)) {
                archive.file(file, { name: path.basename(file) });
            }
        });

        stream.on('close', () => resolve());
        archive.finalize();
    });
}

(async () => {
    try {
        console.log('Building mini-IRIS ZIP/XPI packages...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const version = packageJson.version;
        const distDir = path.join(__dirname, 'dist');
        const buildsDir = path.join(__dirname, 'builds');
        const target = process.argv[2] ?? 'all';
        const shouldPackageChrome = target === 'all' || target === 'chrome';
        const shouldPackageFirefox = target === 'all' || target === 'firefox';

        if (!shouldPackageChrome && !shouldPackageFirefox) {
            throw new Error(`Unknown package target: ${target}`);
        }

        fs.rmSync(buildsDir, { recursive: true, force: true });
        fs.mkdirSync(buildsDir, { recursive: true });

        const chromeZipPath = path.join(buildsDir, `mini-iris-chrome-${version}-${timestamp}.zip`);
        const firefoxXpiPath = path.join(buildsDir, `mini-iris-firefox-${version}-${timestamp}.xpi`);
        const manifestPath = path.join(__dirname, 'manifest.json');

        // Copy manifest to dist for unpacked loading
        fs.copyFileSync(manifestPath, path.join(distDir, 'manifest.json'));

        if (shouldPackageChrome) {
            await zipDirectory(distDir, chromeZipPath, []);
            console.log(`Success! Chrome ZIP package created at: ${chromeZipPath}`);
        }

        if (shouldPackageFirefox) {
            await zipDirectory(distDir, firefoxXpiPath, []);
            console.log(`Success! Firefox XPI package created at: ${firefoxXpiPath}`);
        }
    } catch (err) {
        console.error('Failed to create mini-IRIS packages:', err);
        process.exit(1);
    }
})();
