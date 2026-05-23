const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'manifest.json');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(manifestPath, path.join(distDir, 'manifest.json'));
