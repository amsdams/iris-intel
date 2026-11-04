import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Opt-in reuse; the Playwright server verifies freshness before serving any files.
const cli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
const result = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  stdio: 'inherit', env: {...process.env, IRIS_REUSE_WEB_BUILD: '1'},
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
