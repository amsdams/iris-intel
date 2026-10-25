import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Check the source tree before any packaging or signing starts. */
export function verifyReleaseVersions(directory, tag = '') {
  const read = path => JSON.parse(readFileSync(resolve(directory, path), 'utf8'));
  const root = read('package.json').version;
  const app = read('apps/iitc-iris/package.json').version;
  const manifest = read('apps/iitc-iris/manifest.json').version;
  const lock = read('package-lock.json');
  if (!/^\d+\.\d+\.\d+$/.test(root) ||
      [app, manifest, lock.version, lock.packages[''].version, lock.packages['apps/iitc-iris'].version]
        .some(version => version !== root)) {
    throw new Error('Root/app packages, manifest, and lockfile versions must match; run npm run version:bump.');
  }
  if (tag && (!/^v\d+\.\d+\.\d+$/.test(tag) || tag !== `v${root}`)) {
    throw new Error('Release tag must be vX.Y.Z and match the source versions; run npm run version:bump before tagging.');
  }
  return root;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Verified release versions: ${verifyReleaseVersions(process.cwd(), process.env.RELEASE_TAG)}`);
}
