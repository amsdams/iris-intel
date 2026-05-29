const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const leafletDistDir = path.join(__dirname, '../../node_modules/leaflet/dist');
const fixtureDir = path.join(distDir, 'fixtures');

fs.mkdirSync(distDir, {recursive: true});
fs.mkdirSync(fixtureDir, {recursive: true});
fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(distDir, 'manifest.json'));
fs.copyFileSync(path.join(leafletDistDir, 'leaflet.css'), path.join(distDir, 'leaflet.css'));
fs.copyFileSync(path.join(__dirname, '../../docs/update-map/get-entities-z10.json'), path.join(fixtureDir, 'get-entities-z10.json'));
fs.copyFileSync(path.join(__dirname, '../../docs/update-map/get-entities-z14.json'), path.join(fixtureDir, 'get-entities-z14.json'));
fs.copyFileSync(path.join(__dirname, '../../docs/update-map/get-entities-damrak-iitc-z15.json'), path.join(fixtureDir, 'get-entities-damrak-iitc-z15.json'));
