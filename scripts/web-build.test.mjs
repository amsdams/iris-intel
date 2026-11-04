import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {buildWeb, recordWebBuild, verifyWebBuild} from './web-build.mjs';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'iris-web-build-'));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  const write = (path, text = path) => {
    mkdirSync(dirname(join(directory, path)), {recursive: true});
    writeFileSync(join(directory, path), text);
  };
  for (const path of [
    'package.json', 'package-lock.json', 'node_modules/.package-lock.json', 'tsconfig.json', 'LICENSE', 'CREDITS.md',
    'scripts/web-build.mjs', 'apps/iitc-iris/package.json', 'apps/iitc-iris/manifest.json',
    'apps/iitc-iris/vite.config.ts', 'apps/iitc-iris/vite.page-map.config.ts', 'apps/iitc-iris/copy-assets.cjs', 'apps/iitc-iris/tsconfig.json',
    'apps/iitc-iris/src/content.tsx', 'apps/iitc-iris/assets/images/test.png',
    'packages/iitc-core/package.json', 'packages/iitc-core/tsconfig.json', 'packages/iitc-core/src/comm.ts',
  ]) write(path);
  for (const path of ['content.js', 'page-map-runtime.js', 'maplibre-worker.cjs', 'iitc-iris.css',
    'leaflet.css', 'manifest.json', 'images/test.png', 'licenses/test.txt']) write(`apps/iitc-iris/dist/${path}`);
  recordWebBuild(directory);
  return {directory, write};
}

test('accepts unchanged output, including after test-only edits', t => {
  const {directory, write} = fixture(t);
  verifyWebBuild(directory);
  write('apps/iitc-iris/src/example.test.ts', 'new test');
  verifyWebBuild(directory);
});

for (const path of ['apps/iitc-iris/src/content.tsx', 'packages/iitc-core/src/comm.ts',
  'apps/iitc-iris/manifest.json', 'apps/iitc-iris/vite.config.ts', 'apps/iitc-iris/assets/images/test.png',
  'apps/iitc-iris/assets/runtime.test.js',
  'package-lock.json', 'node_modules/.package-lock.json', 'tsconfig.json', 'LICENSE', 'scripts/web-build.mjs',
  'apps/iitc-iris/.env.production', 'apps/iitc-iris/src/new-module.ts']) {
  test(`rejects changed/added input: ${path}`, t => {
    const {directory, write} = fixture(t);
    write(path, 'changed');
    assert.throws(() => verifyWebBuild(directory), /missing, stale or modified/);
  });
}

test('rejects deleted inputs and missing, tampered or extra outputs', t => {
  for (const mode of ['input', 'missing', 'tampered', 'extra']) {
    const {directory, write} = fixture(t);
    if (mode === 'input') rmSync(join(directory, 'packages/iitc-core/src/comm.ts'));
    if (mode === 'missing') rmSync(join(directory, 'apps/iitc-iris/dist/content.js'));
    if (mode === 'tampered') write('apps/iitc-iris/dist/content.js', 'altered');
    if (mode === 'extra') write('apps/iitc-iris/dist/old-file.js');
    assert.throws(() => verifyWebBuild(directory), /missing, stale or modified/);
  }
});

test('rejects missing/broken stamps and invalidates the old stamp before a failed build', t => {
  const {directory, write} = fixture(t);
  const stamp = 'apps/iitc-iris/build/web-build.json';
  write(stamp, 'bad json');
  assert.throws(() => verifyWebBuild(directory), /missing, stale or modified/);
  recordWebBuild(directory);
  rmSync(join(directory, 'package-lock.json'));
  assert.throws(() => buildWeb(directory));
  assert.throws(() => readFileSync(join(directory, stamp)), /ENOENT/);
});

test('does not certify a build if inputs changed during compilation', t => {
  const {directory, write} = fixture(t);
  const before = JSON.parse(readFileSync(join(directory, 'apps/iitc-iris/build/web-build.json'), 'utf8')).inputs;
  write('apps/iitc-iris/src/content.tsx', 'edited during build');
  assert.throws(() => recordWebBuild(directory, before), /Inputs changed/);
  assert.throws(() => verifyWebBuild(directory), /missing, stale or modified/);
});

test('rejects changed build environment without storing its values', t => {
  const key = 'VITE_IRIS_BUILD_TEST';
  const previous = process.env[key];
  t.after(() => {if (previous === undefined) delete process.env[key]; else process.env[key] = previous;});
  const {directory} = fixture(t);
  process.env[key] = 'changed-build-setting';
  assert.throws(() => verifyWebBuild(directory), /missing, stale or modified/);
  recordWebBuild(directory);
  assert.equal(readFileSync(join(directory, 'apps/iitc-iris/build/web-build.json'), 'utf8').includes('changed-build-setting'), false);
});
