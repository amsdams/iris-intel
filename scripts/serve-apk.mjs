import {createServer} from 'node:http';
import {createReadStream, existsSync, statSync} from 'node:fs';
import {networkInterfaces} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apk = resolve(root, 'apps/android-intel-spike/app/build/outputs/apk/debug/app-debug.apk');
const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
if (!existsSync(apk)) throw new Error('No APK yet. Run npm run android:build first.');
const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, {Allow: 'GET, HEAD'}).end(); return;
  }
  let path;
  try { path = new URL(request.url, 'http://localhost').pathname; }
  catch { response.writeHead(400).end('Invalid URL'); return; }
  if (path === '/iris-intel-test.apk') {
    if (!existsSync(apk)) { response.writeHead(404).end('Build the APK again.'); return; }
    response.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="iris-intel-test.apk"',
      'Content-Length': statSync(apk).size, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else {
      const stream = createReadStream(apk);
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    }
  } else if (path === '/') {
    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
    response.end(request.method === 'HEAD' ? undefined : `<!doctype html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IRIS Intel test</title>
<style>body{font:18px system-ui;max-width:36em;margin:2em auto;padding:0 1em;line-height:1.5}a{display:inline-block;padding:.7em;background:#146d82;color:white;border-radius:.3em}</style>
<h1>IRIS Intel test</h1>
<p>Debug APK for testing Intel login on your Android phone. IRIS is not injected yet.</p>
<p><a href="/iris-intel-test.apk" download>Download APK</a></p>
<p>Open the download and allow installation from your browser when Android asks. Launch <b>IRIS Intel Test</b>, sign in, and tap <b>Check session</b>. Close and reopen the app, then check again.</p>
<p>If sign-in opens your browser, its session is separate from this app. Report that result using the app’s Diagnostics button.</p>`);
  } else response.writeHead(404).end('Not found');
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '0.0.0.0', () => {
  console.log('Serving only the test APK and its download page. Stop with Ctrl+C.');
  console.log(`Local: http://localhost:${port}`);
  for (const entries of Object.values(networkInterfaces())) {
    for (const address of entries || []) {
      if (!address.internal && address.family === 'IPv4') console.log(`Phone on the same Wi-Fi: http://${address.address}:${port}`);
    }
  }
});
