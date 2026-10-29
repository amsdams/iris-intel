import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Read the assembled APK's metadata, not GitHub tags or a second version counter.
export function createUpdateProperties(metadata) {
  const apk = metadata?.elements?.length === 1 ? metadata.elements[0] : null;
  if (metadata?.applicationId !== 'io.github.amsdams.iris'
      || !Number.isInteger(apk?.versionCode) || apk.versionCode < 1 || apk.versionCode > 2100000000
      || typeof apk.versionName !== 'string' || !/^[0-9A-Za-z.+-]{1,100}$/.test(apk.versionName)) {
    throw new Error('Expected version metadata for a single IRIS APK.');
  }
  return `schema=1\napplicationId=${metadata.applicationId}\nversionCode=${apk.versionCode}\nversionName=${apk.versionName}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , input, output] = process.argv;
  if (!input || !output) throw new Error('Usage: write-android-update.mjs output-metadata.json output.properties');
  await writeFile(output, createUpdateProperties(JSON.parse(await readFile(input, 'utf8'))));
}
