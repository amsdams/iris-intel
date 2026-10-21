import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.smoke.mjs',
  workers: 1,
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
    command: 'npm run build -w apps/iitc-iris && node tests/browser/server.mjs',
    url: 'http://127.0.0.1:6973',
    timeout: 60_000,
    reuseExistingServer: false,
  },
});
