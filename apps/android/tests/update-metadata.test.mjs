import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUpdateProperties} from '../../../scripts/write-android-update.mjs';

test('publishes the actual APK version in the Android update-check format', () => {
  assert.equal(createUpdateProperties({applicationId: 'io.github.amsdams.iris',
    elements: [{versionCode: 1833, versionName: '0.4.1-alpha+abc1234'}]}),
  'schema=1\napplicationId=io.github.amsdams.iris\nversionCode=1833\nversionName=0.4.1-alpha+abc1234\n');
});

test('refuses missing, split, wrong-app or invalid APK version metadata', () => {
  for (const metadata of [null, {}, {applicationId: 'wrong.app', elements: [{versionCode: 1, versionName: '1.0'}]},
    {applicationId: 'org.iris.intelspike', elements: [{versionCode: 1833, versionName: '0.4.1'}]},
    {applicationId: 'io.github.amsdams.iris', elements: [{versionCode: 1, versionName: '1.0'}, {}]},
    ...[0, -1, 1.5, '1833', 2100000001].map(versionCode => ({applicationId: 'io.github.amsdams.iris',
      elements: [{versionCode, versionName: '1.0'}]})),
    {applicationId: 'io.github.amsdams.iris', elements: [{versionCode: 1833, versionName: '1.0\nschema=2'}]}]) {
    assert.throws(() => createUpdateProperties(metadata));
  }
});
