import {test as base, expect} from '@playwright/test';

export {expect};

// All suites share strict request/error tracking, including reloads and popup pages.
export const test = base.extend({
  checkConsoleErrors: [false, {option: true}],
  smokeChecks: [async ({context, checkConsoleErrors}, use, testInfo) => {
    const errors = [];
    const unexpectedRequests = [];
    const unexpectedRpcs = [];
    const watched = new WeakSet();
    const watch = candidate => {
      if (watched.has(candidate)) return;
      watched.add(candidate);
      candidate.on('pageerror', error => errors.push({url: candidate.url(), message: error.message}));
      if (checkConsoleErrors) candidate.on('console', message => {
        if (message.type() === 'error') errors.push({url: candidate.url(), message: message.text()});
      });
    };
    context.on('page', watch);
    context.pages().forEach(watch);
    // Keep this log in the runner: browser globals disappear on reload or when a popup closes.
    await context.exposeBinding('__irisReportUnexpectedRpc', ({page: source}, endpoint) => {
      unexpectedRpcs.push({url: source.url(), endpoint});
    });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://127.0.0.1:6973') return route.continue();
      if (['tile.openstreetmap.org', 'a.tile.openstreetmap.org', 'b.tile.openstreetmap.org', 'c.tile.openstreetmap.org'].includes(url.hostname)) {
        return route.fulfill({status: 200, body: ''}); // Tile imagery is outside these UI/link tests.
      }
      if (['www.google.com', 'www.bing.com', 'www.openstreetmap.org'].includes(url.hostname)
        && route.request().isNavigationRequest()) {
        return route.fulfill({status: 200, contentType: 'text/html', body: '<title>External map fixture</title>'});
      }
      unexpectedRequests.push(route.request().url());
      return route.fulfill({status: 502, body: 'Unexpected external request in smoke test'});
    });
    await use();
    if (errors.length || unexpectedRequests.length || unexpectedRpcs.length) {
      await testInfo.attach('smoke-diagnostics', {body: JSON.stringify({errors, unexpectedRequests, unexpectedRpcs}, null, 2), contentType: 'application/json'});
    }
    expect(errors, 'Uncaught errors, including popup pages').toEqual([]);
    expect(unexpectedRequests, 'Unexpected external requests').toEqual([]);
    expect(unexpectedRpcs, 'RPC calls missing explicit fixtures').toEqual([]);
  }, {auto: true}],
});

/** Map replacement clears the previous status; wait on the replacement's actual response, not an old snapshot. */
export async function setFixtureSource(page, {id, label, url}) {
  await page.evaluate(({id, label, url}) => {
    window.__irisFixtureSourceStatus = undefined;
    if (!window.__irisFixtureSourceListener) {
      window.__irisFixtureSourceListener = ({source, data}) => {
        if (source === window && data.type === 'IITC_IRIS_ENTITY_STATUS') window.__irisFixtureSourceStatus = data.status;
      };
      window.addEventListener('message', window.__irisFixtureSourceListener);
    }
    window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {mode: 'fixture', id, label, url}}, '*');
  }, {id, label, url});
  await expect.poll(() => page.evaluate(() => window.__irisFixtureSourceStatus)).toBe(`fixture ${label}`);
}
