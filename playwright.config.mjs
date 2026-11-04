import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.smoke.mjs',
  // Two local workers passed repeated full-suite benchmarks; CI remains conservative.
  workers: process.env.CI ? 1 : 2,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:6973',
    viewport: {width: 412, height: 780},
    launchOptions: {slowMo: process.env.npm_lifecycle_event === 'test:browser:watch' ? 250 : 0},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node scripts/web-build.mjs ${process.env.IRIS_REUSE_WEB_BUILD === '1' ? 'verify' : 'build'} && node tests/browser/server.mjs`,
    url: 'http://127.0.0.1:6973',
    timeout: 60_000,
    reuseExistingServer: false,
  },
});
