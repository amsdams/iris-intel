import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const assets = new URL('../../apps/iitc-iris/dist/', import.meta.url);
const fixture = new URL('./intel-fixture.html', import.meta.url);
const types = {css: 'text/css', js: 'text/javascript', cjs: 'text/javascript', png: 'image/png'};

// Serve only the test page and explicitly allowed build assets, on loopback.
createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1:6973').pathname;
    if (path === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(await readFile(fixture));
    } else if (path === '/favicon.ico') {
      response.writeHead(204).end();
    } else if (/^\/(content\.js|page-map-runtime\.js|maplibre-worker\.cjs|iitc-iris\.css|leaflet\.css|images\/[a-z0-9-]+\.png)$/.test(path)) {
      response.setHeader('Content-Type', types[path.split('.').at(-1)]);
      response.end(await readFile(new URL(path.slice(1), assets)));
    } else {
      response.writeHead(404).end();
    }
  } catch (error) {
    console.error(error);
    response.writeHead(500).end();
  }
}).listen(6973, '127.0.0.1');
