const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');

async function zipDirectory(sourceDir, outPath) {
  const {ZipArchive} = await import('archiver');
  const archive = new ZipArchive({zlib: {level: 9}});
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

(async () => {
  try {
    console.log('Building IITC IRIS ZIP/XPI packages...');
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

    fs.rmSync(buildsDir, {recursive: true, force: true});
    fs.mkdirSync(buildsDir, {recursive: true});
    fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(distDir, 'manifest.json'));

    if (shouldPackageChrome) {
      const chromeZipPath = path.join(buildsDir, `iitc-iris-chrome-${version}-${timestamp}.zip`);
      await zipDirectory(distDir, chromeZipPath);
      console.log(`Success! Chrome ZIP package created at: ${chromeZipPath}`);
    }

    if (shouldPackageFirefox) {
      const firefoxXpiPath = path.join(buildsDir, `iitc-iris-firefox-${version}-${timestamp}.xpi`);
      await zipDirectory(distDir, firefoxXpiPath);
      console.log(`Success! Firefox XPI package created at: ${firefoxXpiPath}`);
    }
  } catch (err) {
    console.error('Failed to create IITC IRIS packages:', err);
    process.exit(1);
  }
})();
