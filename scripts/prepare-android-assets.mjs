import {spawnSync} from 'node:child_process';
import {cpSync, mkdirSync, rmSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = spawnSync('npm', ['run', 'build', '-w', 'apps/iitc-iris'], {cwd: root, stdio: 'inherit'});
if (build.status !== 0) process.exit(build.status ?? 1);
const source = join(root, 'apps/iitc-iris/dist');
const output = join(root, 'apps/android-intel-spike/app/build/generated/iris-assets/iris');
const files = ['content.js', 'page-map-runtime.js', 'iitc-iris.css', 'leaflet.css', 'images', 'licenses'];
// Fail before replacing generated assets if the web build is incomplete.
for (const file of files) statSync(join(source, file));
rmSync(output, {recursive: true, force: true});
mkdirSync(output, {recursive: true});
for (const file of files) cpSync(join(source, file), join(output, file), {recursive: true});
console.log('Prepared bundled IRIS assets for the APK.');
