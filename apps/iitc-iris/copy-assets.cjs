const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const leafletDistDir = path.join(__dirname, '../../node_modules/leaflet/dist');

fs.mkdirSync(distDir, {recursive: true});
fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(distDir, 'manifest.json'));
fs.copyFileSync(path.join(leafletDistDir, 'leaflet.css'), path.join(distDir, 'leaflet.css'));
