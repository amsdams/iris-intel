import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = 'apps/iitc-iris';
const stampPath = `${app}/build/web-build.json`;
const inputPaths = [
  'package.json', 'package-lock.json', 'node_modules/.package-lock.json', 'tsconfig.json', 'LICENSE', 'CREDITS.md',
  'scripts/web-build.mjs', `${app}/package.json`, `${app}/manifest.json`,
  `${app}/vite.config.ts`, `${app}/vite.page-map.config.ts`, `${app}/copy-assets.cjs`, `${app}/tsconfig.json`,
  `${app}/src`, `${app}/assets`, 'packages/iitc-core/package.json', 'packages/iitc-core/tsconfig.json', 'packages/iitc-core/src',
];
const requiredOutputs = ['content.js', 'page-map-runtime.js', 'maplibre-worker.cjs', 'iitc-iris.css',
  'leaflet.css', 'manifest.json', 'images', 'licenses'];

function snapshot(directory, paths, omitTests = false) {
  const result = {};
  function visit(relative) {
    const path = join(directory, relative);
    const entry = lstatSync(path);
    if (entry.isDirectory()) {
      for (const child of readdirSync(path).sort()) visit(`${relative}/${child}`);
    } else if (entry.isFile()) {
      const sourceTest = (relative.startsWith(`${app}/src/`) || relative.startsWith('packages/iitc-core/src/')) &&
        /\.test\.[cm]?[jt]sx?$/.test(relative);
      if (!omitTests || !sourceTest) {
        result[relative] = createHash('sha256').update(readFileSync(path)).digest('hex');
      }
    } else throw new Error(`Unsupported build file: ${relative}`);
  }
  for (const path of [...paths].sort()) visit(path);
  return result;
}

function inputs(directory) {
  const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local']
    .map(name => `${app}/${name}`).filter(path => existsSync(join(directory, path)));
  return {node: process.version, platform: process.platform, arch: process.arch,
    environment: createHash('sha256').update(JSON.stringify(Object.entries(process.env)
      .filter(([key]) => key.startsWith('VITE_') || key === 'NODE_ENV' || key === 'NODE_OPTIONS').sort())).digest('hex'),
    files: snapshot(directory, [...inputPaths, ...envFiles], true)};
}

function outputs(directory) {
  for (const name of requiredOutputs) {
    if (!existsSync(join(directory, app, 'dist', name))) throw new Error(`Missing build output: ${name}`);
  }
  return snapshot(directory, [`${app}/dist`]);
}

/** Record only a completed build whose inputs stayed unchanged while compiling. */
export function recordWebBuild(directory, before = inputs(directory)) {
  const after = inputs(directory);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Inputs changed during the web build; rebuild.');
  const stamp = {version: 1, inputs: after, outputs: outputs(directory)};
  mkdirSync(join(directory, dirname(stampPath)), {recursive: true});
  writeFileSync(join(directory, stampPath), JSON.stringify(stamp));
}

/** Fail closed: never silently reuse a stale, incomplete or altered output directory. */
export function verifyWebBuild(directory = root) {
  try {
    const stamp = JSON.parse(readFileSync(join(directory, stampPath), 'utf8'));
    if (stamp.version !== 1 || JSON.stringify(stamp.inputs) !== JSON.stringify(inputs(directory)) ||
        JSON.stringify(stamp.outputs) !== JSON.stringify(outputs(directory))) throw new Error('Build fingerprint mismatch');
  } catch (cause) {
    throw new Error('Web build is missing, stale or modified. Run npm run build -w apps/iitc-iris before reusing it.', {cause});
  }
}

export function buildWeb(directory = root) {
  rmSync(join(directory, stampPath), {force: true});
  const before = inputs(directory);
  rmSync(join(directory, app, 'dist'), {recursive: true, force: true});
  for (const args of [
    [join(directory, 'node_modules/vite/bin/vite.js'), 'build'],
    [join(directory, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.page-map.config.ts'],
    ['copy-assets.cjs'],
  ]) {
    const result = spawnSync(process.execPath, args, {cwd: join(directory, app), stdio: 'inherit'});
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Web build failed (${result.status ?? result.signal})`);
  }
  recordWebBuild(directory, before);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2];
    if (command === 'build') buildWeb();
    else if (command === 'verify') {verifyWebBuild(); console.log('Reusing verified web build.');}
    else throw new Error('Usage: node scripts/web-build.mjs build|verify');
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
