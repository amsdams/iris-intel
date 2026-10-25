import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {verifyReleaseVersions} from './verify-release.mjs';

function source(t, change = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'iris-release-'));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  const files = {
    'package.json': {version: '1.2.3'},
    'apps/iitc-iris/package.json': {version: '1.2.3'},
    'apps/iitc-iris/manifest.json': {version: '1.2.3'},
    'package-lock.json': {version: '1.2.3', packages: {'': {version: '1.2.3'}, 'apps/iitc-iris': {version: '1.2.3'}}},
    ...change,
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, file)), {recursive: true});
    writeFileSync(join(directory, file), JSON.stringify(content));
  }
  return directory;
}

test('accepts matching versions for main and an explicit release tag', t => {
  const directory = source(t);
  assert.equal(verifyReleaseVersions(directory), '1.2.3');
  assert.equal(verifyReleaseVersions(directory, 'v1.2.3'), '1.2.3');
});
test('rejects a mismatched or malformed tag before release work', t => {
  const directory = source(t);
  for (const tag of ['v1.2.4', 'latest', 'v1.2.3-beta', 'refs/heads/main']) {
    assert.throws(() => verifyReleaseVersions(directory, tag), /Release tag/);
  }
});
for (const file of ['package.json', 'apps/iitc-iris/package.json', 'apps/iitc-iris/manifest.json', 'package-lock.json']) {
  test(`rejects a version mismatch in ${file}`, t => {
    const replacement = file === 'package-lock.json'
      ? {version: '1.2.3', packages: {'': {version: '1.2.3'}, 'apps/iitc-iris': {version: '9.0.0'}}}
      : {version: '9.0.0'};
    assert.throws(() => verifyReleaseVersions(source(t, {[file]: replacement})), /must match/);
  });
}
