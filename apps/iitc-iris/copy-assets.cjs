const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const leafletDistDir = path.join(__dirname, '../../node_modules/leaflet/dist');
const imageDir = path.join(distDir, 'images');
const assetDir = path.join(__dirname, 'assets');

function copyRequired(from, to) {
  if (!fs.existsSync(from)) throw new Error(`Required asset is missing: ${from}`);
  fs.copyFileSync(from, to);
}

fs.mkdirSync(distDir, {recursive: true});
// Previous builds generated empty fixture maps here. Do not carry them into new packages.
fs.rmSync(path.join(distDir, 'fixtures'), {recursive: true, force: true});
fs.mkdirSync(imageDir, {recursive: true});
copyRequired(path.join(__dirname, 'manifest.json'), path.join(distDir, 'manifest.json'));
copyRequired(path.join(leafletDistDir, 'leaflet.css'), path.join(distDir, 'leaflet.css'));
for (const name of [
  'marker-blue.png', 'marker-blue-2x.png', 'marker-green.png', 'marker-green-2x.png',
  'mission-length.png', 'mission-type-hidden.png', 'mission-type-random.png',
  'mission-type-sequential.png', 'mission-type-unknown.png', 'marker-shadow.png',
]) {
  copyRequired(path.join(assetDir, 'images', name), path.join(imageDir, name));
}
fs.cpSync(path.join(assetDir, 'licenses'), path.join(distDir, 'licenses'), {recursive: true});
copyRequired(path.join(__dirname, '../../LICENSE'), path.join(distDir, 'licenses/GPL-3.0.txt'));
copyRequired(path.join(__dirname, '../../CREDITS.md'), path.join(distDir, 'licenses/CREDITS.md'));

for (const [dependency, filename, output] of [
  ['preact', 'LICENSE', 'Preact.txt'],
  ['maplibre-gl', 'LICENSE.txt', 'MapLibre-GL-JS.txt'],
  ['@maplibre/maplibre-gl-leaflet', 'LICENSE', 'MapLibre-GL-Leaflet.txt'],
]) {
  copyRequired(path.join(__dirname, '../../node_modules', dependency, filename), path.join(distDir, 'licenses', output));
}
