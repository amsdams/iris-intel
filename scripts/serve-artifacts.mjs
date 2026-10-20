import {createServer} from 'node:http';
import {createReadStream, lstatSync, readFileSync, readdirSync} from 'node:fs';
import {networkInterfaces} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const builds = join(root, 'apps/iitc-iris/builds');
const apkDirectory = join(root, 'apps/android-intel-spike/app/build/outputs/apk/debug');
const port = Number(process.env.PORT || 6969);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');

function fileInfo(path) {
  try { const info = lstatSync(path); return info.isFile() ? info : null; }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function artifacts() {
  const files = [];
  let entries;
  try { entries = readdirSync(builds, {withFileTypes: true}); }
  catch (error) { if (error.code !== 'ENOENT') throw error; entries = []; }
  for (const entry of entries) {
    if (!entry.isFile() || !/^iitc-iris-(chrome-[a-z\d.T-]+\.zip|firefox-[a-z\d.T-]+\.xpi)$/.test(entry.name)) continue;
    const path = join(builds, entry.name);
    const info = fileInfo(path);
    if (info) files.push({name: entry.name, path, info,
      type: entry.name.endsWith('.xpi') ? 'Firefox XPI' : 'Chrome ZIP',
      mime: entry.name.endsWith('.xpi') ? 'application/x-xpinstall' : 'application/zip'});
  }
  const apkPath = join(apkDirectory, 'app-debug.apk');
  const info = fileInfo(apkPath);
  if (info) {
    let version = '';
    try { version = JSON.parse(readFileSync(join(apkDirectory, 'output-metadata.json'), 'utf8')).elements?.[0]?.versionName || ''; }
    catch { /* The APK remains downloadable without optional version metadata. */ }
    files.push({name: 'iris-intel-test.apk', path: apkPath, info, type: 'Android APK',
      version, mime: 'application/vnd.android.package-archive'});
  }
  return files.sort((a, b) => b.info.mtimeMs - a.info.mtimeMs || a.name.localeCompare(b.name));
}

const escape = (text) => String(text).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function page(files) {
  const groups = [
    ['Firefox XPI', 'npm run package'], ['Chrome ZIP', 'npm run package'], ['Android APK', 'npm run android:build'],
  ];
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>IRIS downloads</title>
<style>
body{font:16px system-ui;max-width:56rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#e8f4ff;background:#071019}
h1,h2{line-height:1.2}section{margin:2rem 0}ul{list-style:none;padding:0}li{padding:1rem 0;border-bottom:1px solid #29434d}
a{color:#7ed8ef;overflow-wrap:anywhere}small{display:block;color:#b3c6cf;margin-top:.35rem}code{color:#b9e7be}
</style>
<h1>IRIS downloads</h1><p>Local build artifacts, newest first in each section. Refresh after building.</p>
${groups.map(([type, command]) => {
    const matching = files.filter((file) => file.type === type);
    return `<section><h2>${type}</h2>${matching.length ? `<ul>${matching.map((file) => `<li>
<a href="/downloads/${encodeURIComponent(file.name)}" download>${escape(file.name)}</a>
<small>${file.version ? `${escape(file.version)} · ` : ''}${Math.ceil(file.info.size / 1024)} KB · ${escape(file.info.mtime.toISOString())}</small>
</li>`).join('')}</ul>` : '<p>No build yet.</p>'}<p>Build: <code>${command}</code></p></section>`;
  }).join('')}
<p>Android: install the update, open <b>IRIS Intel Test</b>, and tap <b>Load IRIS</b>. Reload returns to stock Intel.</p>
</html>`;
}

const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, {Allow: 'GET, HEAD'}).end(); return;
  }
  let path;
  try { path = new URL(request.url, 'http://localhost').pathname; }
  catch { response.writeHead(400).end('Invalid URL'); return; }
  try {
    const files = artifacts();
    if (path === '/') {
      const html = page(files);
      response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(html), 'X-Content-Type-Options': 'nosniff'});
      response.end(request.method === 'HEAD' ? undefined : html);
      return;
    }
    let name;
    try { name = path === '/iris-intel-test.apk' ? 'iris-intel-test.apk'
      : path.startsWith('/downloads/') ? decodeURIComponent(path.slice('/downloads/'.length)) : null; }
    catch { response.writeHead(400).end('Invalid filename'); return; }
    const file = files.find((file) => file.name === name);
    if (!file) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, {'Content-Type': file.mime, 'Content-Length': file.info.size,
      'Content-Disposition': `attachment; filename="${file.name}"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
    if (request.method === 'HEAD') response.end();
    else {
      const stream = createReadStream(file.path);
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    }
  } catch {
    response.writeHead(500).end('Could not read local build artifacts.');
  }
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '0.0.0.0', () => {
  console.log('Serving IRIS ZIP, XPI, and APK artifacts only. Stop with Ctrl+C.');
  console.log(`Local: http://localhost:${port}`);
  for (const entries of Object.values(networkInterfaces())) {
    for (const address of entries || []) {
      if (!address.internal && address.family === 'IPv4') console.log(`Same Wi-Fi: http://${address.address}:${port}`);
    }
  }
});
