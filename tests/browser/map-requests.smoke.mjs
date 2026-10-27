import {test, expect} from '@playwright/test';

test('live request retries deliver real layers and subsequent refreshes reuse cached tiles', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.addInitScript(() => {
    window.requestFixture = {requests: 0};
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_ENTITY_STATUS') window.requestFixture.status = data;
    });
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.__iitcIrisMap && window.requestFixture.status))).toBe(true);
  await page.evaluate(() => {
    const fetchBefore = window.fetch;
    const attempted = new Set();
    window.fetch = async (url, init) => {
      if (String(url).includes('/r/getArtifactPortals')) return Response.json({result: {}});
      if (!String(url).includes('/r/getEntities')) return fetchBefore(url, init);
      window.requestFixture.requests += 1;
      const {tileKeys, v} = JSON.parse(init.body);
      if (v !== 'smoke-test' || init.headers['X-CSRFToken'] !== 'smoke-test') throw new Error('Missing Intel request metadata');
      return Response.json({result: {map: Object.fromEntries(tileKeys.map(key => {
        if (!attempted.has(key)) {
          attempted.add(key);
          return [key, {error: 'TIMEOUT'}];
        }
        return [key, {gameEntities: [['request-portal', 1000,
          ['p', 'R', 52000000, 4000000, 8, 100, 8, '', 'Request fixture', [], false, false, null, 1000]]]}];
      }))}});
    };
    window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {mode: 'live'}}, '*');
  });
  await expect.poll(() => page.evaluate(() => window.requestFixture.status.status)).toBe('entities ready');
  const status = await page.evaluate(() => window.requestFixture.status);
  expect(status.retryRequests).toBeGreaterThan(0);
  expect(status.recoveredTileKeys.length).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.entityLayerIndex.portals.get('request-portal')?.length)).toBe(1);
  const before = await page.evaluate(() => window.requestFixture.requests);
  await page.evaluate(() => window.__iitcIrisMap.fire('moveend'));
  await expect.poll(() => page.evaluate(() => window.requestFixture.status.cacheFreshTileKeys?.length ?? 0)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.requestFixture.requests)).toBe(before);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(errors).toEqual([]);
});
