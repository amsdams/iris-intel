const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function zipDirectory(sourceDir, outPath, extraFiles) {
    const archive = archiver('zip', { zlib: { level: 9 } });
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
        console.log('Building ZIP/XPI package...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const distDir = path.join(__dirname, 'dist');
        const buildsDir = path.join(__dirname, 'builds');
        
        if (!fs.existsSync(buildsDir)) {
            fs.mkdirSync(buildsDir);
        }

        const zipPath = path.join(buildsDir, `extension-${timestamp}.zip`);
        const xpiPath = path.join(buildsDir, `extension-${timestamp}.xpi`);
        const manifestPath = path.join(__dirname, 'manifest.json');
        
        // Copy manifest to dist for unpacked loading
        fs.copyFileSync(manifestPath, path.join(distDir, 'manifest.json'));
        
        await zipDirectory(distDir, zipPath, []);
        
        // Also create a .xpi copy for convenience
        fs.copyFileSync(zipPath, xpiPath);
        
        console.log(`Success! Package created at: ${zipPath}`);
        console.log(`Success! Package created at: ${xpiPath}`);
    } catch (err) {
        console.error('Failed to create ZIP package:', err);
        process.exit(1);
    }
})();
