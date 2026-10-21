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
const release = args.some((task) => task.endsWith('Release'));
const buildEnv = {...process.env, ANDROID_HOME: sdk, ...(javaHome ? {JAVA_HOME: javaHome} : {})};
if (release) {
  for (const name of ['IRIS_ANDROID_KEYSTORE', 'IRIS_ANDROID_STORE_PASSWORD', 'IRIS_ANDROID_KEY_ALIAS', 'IRIS_ANDROID_KEY_PASSWORD']) {
    if (!buildEnv[name]) throw new Error(`Release signing requires ${name}; see apps/android-intel-spike/README.md.`);
  }
  if (!existsSync(buildEnv.IRIS_ANDROID_KEYSTORE)) throw new Error('Release keystore file does not exist.');
  const gitValue = (gitArgs) => {
    const result = spawnSync('git', gitArgs, {cwd: root, encoding: 'utf8'});
    if (result.status !== 0) throw new Error('Release versioning requires a Git checkout with complete history.');
    return result.stdout.trim();
  };
  if (gitValue(['rev-parse', '--is-shallow-repository']) === 'true') throw new Error('Release versioning requires complete Git history (fetch-depth: 0).');
  buildEnv.IRIS_ANDROID_VERSION_CODE ||= String(1000 + Number(gitValue(['rev-list', '--count', 'HEAD'])));
  buildEnv.IRIS_ANDROID_BUILD_SHA ||= gitValue(['rev-parse', '--short=7', 'HEAD']);
}
const child = spawn(join(project, 'gradlew'), ['--no-daemon', '--console=plain', ...args], {
  cwd: project, stdio: 'inherit',
  env: buildEnv,
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
