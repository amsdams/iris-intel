import {spawn, spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = join(root, 'apps/android-intel-spike');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  || (process.platform === 'darwin' ? join(homedir(), 'Library/Android/sdk') : '');
let javaHome = process.env.JAVA_HOME;
if (!javaHome && process.platform === 'darwin') {
  const result = spawnSync('/usr/libexec/java_home', ['-v', '21'], {encoding: 'utf8'});
  if (result.status === 0) javaHome = result.stdout.trim();
}
if (!sdk || !existsSync(sdk)) throw new Error('Set ANDROID_HOME to an installed Android SDK.');
const args = process.argv.slice(2);
const child = spawn(join(project, 'gradlew'), ['--no-daemon', '--console=plain', ...args], {
  cwd: project, stdio: 'inherit',
  env: {...process.env, ANDROID_HOME: sdk, ...(javaHome ? {JAVA_HOME: javaHome} : {})},
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
