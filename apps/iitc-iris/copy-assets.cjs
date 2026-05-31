const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const leafletDistDir = path.join(__dirname, '../../node_modules/leaflet/dist');
const fixtureDir = path.join(distDir, 'fixtures');
const imageDir = path.join(distDir, 'images');
const iitcPluginImageDir = path.join(__dirname, '../../reference/IITC-CE/plugins/images');
const iitcCoreImageDir = path.join(__dirname, '../../reference/IITC-CE/core/external/images');

fs.mkdirSync(distDir, {recursive: true});
fs.mkdirSync(fixtureDir, {recursive: true});
fs.mkdirSync(imageDir, {recursive: true});
fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(distDir, 'manifest.json'));
fs.copyFileSync(path.join(leafletDistDir, 'leaflet.css'), path.join(distDir, 'leaflet.css'));
fs.copyFileSync(path.join(__dirname, '../../docs/update-map/get-entities-z10.json'), path.join(fixtureDir, 'get-entities-z10.json'));
fs.copyFileSync(path.join(__dirname, '../../docs/update-map/get-entities-z14.json'), path.join(fixtureDir, 'get-entities-z14.json'));
fs.copyFileSync(path.join(__dirname, '../../docs/update-map/get-entities-damrak-iitc-z15.json'), path.join(fixtureDir, 'get-entities-damrak-iitc-z15.json'));
fs.copyFileSync(path.join(iitcPluginImageDir, 'marker-blue.png'), path.join(imageDir, 'marker-blue.png'));
fs.copyFileSync(path.join(iitcPluginImageDir, 'marker-blue-2x.png'), path.join(imageDir, 'marker-blue-2x.png'));
fs.copyFileSync(path.join(iitcPluginImageDir, 'marker-green.png'), path.join(imageDir, 'marker-green.png'));
fs.copyFileSync(path.join(iitcPluginImageDir, 'marker-green-2x.png'), path.join(imageDir, 'marker-green-2x.png'));
fs.copyFileSync(path.join(iitcCoreImageDir, 'marker-shadow.png'), path.join(imageDir, 'marker-shadow.png'));
