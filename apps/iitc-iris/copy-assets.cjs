const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const leafletDistDir = path.join(__dirname, '../../node_modules/leaflet/dist');
const fixtureDir = path.join(distDir, 'fixtures');
const imageDir = path.join(distDir, 'images');
const referenceRoot = path.join(__dirname, '../../reference');
const iitcReferenceDir = [
  path.join(referenceRoot, 'ingress-intel-total-conversion'),
  path.join(referenceRoot, 'IITC-CE'),
].find((candidate) => fs.existsSync(candidate));
const iitcPluginImageDir = iitcReferenceDir ? path.join(iitcReferenceDir, 'plugins/images') : path.join(referenceRoot, 'ingress-intel-total-conversion/plugins/images');
const iitcCoreImageDir = iitcReferenceDir ? path.join(iitcReferenceDir, 'core/external/images') : path.join(referenceRoot, 'ingress-intel-total-conversion/core/external/images');
const emptyFixture = JSON.stringify({result: {map: {}}}, null, 2) + '\n';
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

function copyRequired(from, to) {
  if (!fs.existsSync(from)) throw new Error(`Required asset is missing: ${from}`);
  fs.copyFileSync(from, to);
}

function copyOptionalFixture(from, to) {
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    return;
  }
  fs.writeFileSync(to, emptyFixture);
  console.warn(`IITC IRIS: missing fixture ${from}; wrote empty fallback ${to}`);
}

function copyOptionalImage(from, to, fallback) {
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    return;
  }
  if (fallback && fs.existsSync(fallback)) {
    fs.copyFileSync(fallback, to);
    console.warn(`IITC IRIS: missing image ${from}; copied fallback ${fallback}`);
    return;
  }
  fs.writeFileSync(to, transparentPng);
  console.warn(`IITC IRIS: missing image ${from}; wrote transparent fallback ${to}`);
}

fs.mkdirSync(distDir, {recursive: true});
fs.mkdirSync(fixtureDir, {recursive: true});
fs.mkdirSync(imageDir, {recursive: true});
copyRequired(path.join(__dirname, 'manifest.json'), path.join(distDir, 'manifest.json'));
copyRequired(path.join(leafletDistDir, 'leaflet.css'), path.join(distDir, 'leaflet.css'));
copyOptionalFixture(path.join(__dirname, '../../docs/update-map/get-entities-z10.json'), path.join(fixtureDir, 'get-entities-z10.json'));
copyOptionalFixture(path.join(__dirname, '../../docs/update-map/get-entities-z14.json'), path.join(fixtureDir, 'get-entities-z14.json'));
copyOptionalFixture(path.join(__dirname, '../../docs/update-map/get-entities-damrak-iitc-z15.json'), path.join(fixtureDir, 'get-entities-damrak-iitc-z15.json'));
copyOptionalImage(path.join(iitcPluginImageDir, 'marker-blue.png'), path.join(imageDir, 'marker-blue.png'), path.join(leafletDistDir, 'images/marker-icon.png'));
copyOptionalImage(path.join(iitcPluginImageDir, 'marker-blue-2x.png'), path.join(imageDir, 'marker-blue-2x.png'), path.join(leafletDistDir, 'images/marker-icon-2x.png'));
copyOptionalImage(path.join(iitcPluginImageDir, 'marker-green.png'), path.join(imageDir, 'marker-green.png'), path.join(leafletDistDir, 'images/marker-icon.png'));
copyOptionalImage(path.join(iitcPluginImageDir, 'marker-green-2x.png'), path.join(imageDir, 'marker-green-2x.png'), path.join(leafletDistDir, 'images/marker-icon-2x.png'));
copyOptionalImage(path.join(iitcPluginImageDir, 'mission-length.png'), path.join(imageDir, 'mission-length.png'));
copyOptionalImage(path.join(iitcPluginImageDir, 'mission-type-hidden.png'), path.join(imageDir, 'mission-type-hidden.png'));
copyOptionalImage(path.join(iitcPluginImageDir, 'mission-type-random.png'), path.join(imageDir, 'mission-type-random.png'));
copyOptionalImage(path.join(iitcPluginImageDir, 'mission-type-sequential.png'), path.join(imageDir, 'mission-type-sequential.png'));
copyOptionalImage(path.join(iitcPluginImageDir, 'mission-type-unknown.png'), path.join(imageDir, 'mission-type-unknown.png'));
copyOptionalImage(path.join(iitcCoreImageDir, 'marker-shadow.png'), path.join(imageDir, 'marker-shadow.png'), path.join(leafletDistDir, 'images/marker-shadow.png'));
