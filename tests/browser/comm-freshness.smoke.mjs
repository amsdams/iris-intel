import {test, expect} from '@playwright/test';
import {DEFAULT_LAYER_SETTINGS} from '../../apps/iitc-iris/src/map/layers/layer-registry.ts';

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.addInitScript(() => {
    const nativeNow = Date.now;
    // The cache captures Date.now during boot, before Playwright replaces the clock.
    Date.now = () => window.freshFixture.clockInstalled ? window.Date.now() : nativeNow();
    window.freshFixture = {phase: 0, entities: [], comm: [], times: {}, errors: [], events: []};
    window.addEventListener('error', event => window.freshFixture.errors.push(event.message));
    window.addEventListener('message', ({data}) => {
      if (['IITC_IRIS_REQUEST_COMM', 'IITC_IRIS_COMM_STATUS', 'IITC_IRIS_COMM_VISIBILITY', 'IITC_IRIS_ENTITY_STATUS'].includes(data.type)) {
        window.freshFixture.events.push({type: data.type, time: Date.now(), tab: data.commTab ?? data.comm?.tab, status: data.comm?.status});
      }
      if (data.type === 'IITC_IRIS_ENTITY_STATUS') window.freshFixture.mapStatus = data;
      if (data.type === 'IITC_IRIS_COMM_STATUS') window.freshFixture.commStatus = data.comm;
    });
    const nativeFetch = window.fetch.bind(window);
    const fetchFixture = async (url, init) => {
      const endpoint = String(url).split('/').pop();
      const state = window.freshFixture;
      if (endpoint === 'getEntities') {
        const payload = JSON.parse(init.body);
        state.entities.push(payload);
        const geometry = state.phase ? [] : [
          ['old-link', Date.now(), ['e', 'E', 'capture', 52000000, 4000000, 'b', 52001000, 4001000]],
          ['old-field', Date.now(), ['r', 'E', [['capture', 52000000, 4000000], ['b', 52001000, 4001000], ['c', 52000000, 4002000]]]],
        ];
        return Response.json({result: {map: Object.fromEntries(payload.tileKeys.map(key => [key, {gameEntities: [
          ['capture', Date.now(), ['p', state.phase ? 'R' : 'E', 52000000, 4000000, 1, 100, 1, '', 'Capture portal', [], false, false, null, Date.now()]],
          ...geometry,
        ]}]))}});
      }
      if (endpoint === 'getPlexts') {
        const payload = JSON.parse(init.body);
        state.comm.push(payload);
        const phase = state.phase;
        const time = state.times[phase] ??= Date.now() - 1000;
        const name = phase === 2 ? 'AreaAgent' : 'ProbeAgent';
        const row = [`${payload.tab}-${phase}`, time, {plext: {text: `${name} captured phase ${phase}`,
          markup: [['PLAYER', {plain: name, team: 'RESISTANCE'}], ['TEXT', {plain: ` captured phase ${phase} `}],
            ['PORTAL', {name: 'Capture portal', latE6: phase === 2 ? 52050000 : phase ? 52000000 : 51999000, lngE6: phase === 2 ? 4050000 : 4000000}]],
          categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST'}}];
        const rows = state.bulk ? Array.from({length: 40}, (_, index) => [
          `${payload.tab}-${phase}-${index}`, time - 40 + index,
          {plext: {...row[2].plext, markup: [['TEXT', {plain: `phase ${phase} message ${index}`}]]}},
        ]) : [row];
        const filtered = rows.filter(row => payload.minTimestampMs <= row[1]);
        if (!payload.ascendingTimestampOrder) filtered.reverse();
        return Response.json({result: filtered});
      }
      if (endpoint === 'getArtifactPortals') return Response.json({result: {}});
      if (String(url).includes('/r/')) return Response.json({result: false});
      return nativeFetch(url, init);
    };
    // Keep the fixture HTML's generic empty endpoint wrapper from replacing these responses.
    Object.defineProperty(window, 'fetch', {configurable: true, get: () => fetchFixture, set: () => {}});
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.freshFixture.mapStatus?.status)).toBe('entities ready');
  await page.clock.install();
  await page.evaluate(settings => {
    window.freshFixture.clockInstalled = true;
    window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: {...settings, playerTrackerResistance: true}}, '*');
    // Re-arm the pre-install native map timer under the controlled clock.
    window.__iitcIrisMap.fire('moveend');
  }, DEFAULT_LAYER_SETTINGS);
  await page.clock.runFor(300);
});

const snapshot = page => page.evaluate(() => ({
  requests: window.freshFixture.entities.length,
  color: window.__iitcIrisLayers.entityLayerIndex.portals.get('capture')?.[0]?.options.color,
  oldLink: window.__iitcIrisLayers.entityLayerIndex.links.has('old-link'),
  oldField: window.__iitcIrisLayers.entityLayerIndex.fields.has('old-field'),
}));

test.afterEach(async ({page}) => {
  expect(await page.evaluate(() => window.freshFixture.errors)).toEqual([]);
});

test('stationary authoritative refresh changes faction and removes old links/fields after COMM moves the player', async ({page}) => {
  const initial = await snapshot(page);
  expect(initial).toMatchObject({color: '#03dc03', oldLink: true, oldField: true});
  await page.evaluate(() => { window.freshFixture.phase = 1; });
  await page.clock.fastForward(40_100);
  await expect.poll(() => page.evaluate(() => Object.values(window.__iitcIrisMap._layers)
    .find(layer => layer.options?.title?.includes('ProbeAgent'))?.getLatLng().lat)).toBe(52);
  expect(await snapshot(page)).toEqual(initial);
  await page.clock.fastForward(300_000);
  await expect.poll(() => snapshot(page)).toMatchObject({color: '#0088ff', oldLink: false, oldField: false});
  expect((await snapshot(page)).requests).toBeGreaterThan(initial.requests);
});

test('public panel and tracker share polling; faction and alerts continue refreshing without switching tabs', async ({page}) => {
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'COMM', exact: true}).click();
  await page.clock.runFor(100);
  const panel = page.locator('aside:visible');
  await expect(panel).toContainText('phase 0');
  const before = await page.evaluate(() => window.freshFixture.comm.length);
  await page.evaluate(() => {window.freshFixture.phase = 1;});
  await page.clock.fastForward(40_100);
  await expect(panel).toContainText('phase 1');
  expect(await page.evaluate(() => window.freshFixture.comm.length)).toBe(before + 1);
  for (const tab of ['Faction', 'Alerts']) {
    await page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name: tab, exact: true}).click();
    await expect.poll(() => page.evaluate(() => ({tab: window.freshFixture.commStatus?.tab, status: window.freshFixture.commStatus?.status})))
      .toEqual({tab: tab.toLowerCase(), status: 'ready'});
    await page.clock.runFor(1000);
    const count = await page.evaluate(() => window.freshFixture.comm.length);
    await page.clock.fastForward(40_100);
    expect(await page.evaluate(count => window.freshFixture.comm.slice(count).map(payload => payload.tab).sort(), count),
      JSON.stringify(await page.evaluate(() => window.freshFixture.events.slice(-25)))).toEqual(['all', tab.toLowerCase()].sort());
    expect(await page.evaluate(() => window.freshFixture.commStatus.tab)).toBe(tab.toLowerCase());
  }
});

test('a new area starts public history again and finds activity older than the previous cursor', async ({page}) => {
  await page.evaluate(() => {
    window.freshFixture.times[2] = window.freshFixture.times[0] - 60_000;
    window.freshFixture.phase = 2;
    window.__iitcIrisMap.setView([52.05, 4.05], 16, {animate: false});
  });
  await page.clock.fastForward(10_500);
  const payload = await page.evaluate(() => window.freshFixture.comm.at(-1));
  expect(payload).toMatchObject({minTimestampMs: -1, maxTimestampMs: -1});
  expect(payload.plextContinuationGuid).toBeUndefined();
  await expect(page.locator('.leaflet-marker-icon[title*="AreaAgent"]')).toHaveCount(1);
});

test('background updates preserve a reader scroll position and leaving COMM stops its channel poll', async ({page}) => {
  await page.evaluate(() => {window.freshFixture.phase = 3; window.freshFixture.bulk = true;});
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'COMM', exact: true}).click();
  const panel = page.locator('aside:visible');
  await panel.getByRole('button', {name: 'Refresh', exact: true}).click();
  await expect(panel).toContainText('phase 3 message 39');
  await page.clock.runFor(300);
  const list = page.locator('.iitc-iris-comm-list');
  await list.evaluate(element => {element.scrollTop = 100; element.dispatchEvent(new Event('scroll'));});
  await page.clock.runFor(100);
  await page.evaluate(() => {window.freshFixture.phase = 4;});
  await page.clock.fastForward(40_100);
  await expect(panel).toContainText('phase 4 message 39');
  await page.clock.runFor(100);
  expect(await list.evaluate(element => element.scrollTop)).toBe(100);
  // Move to another side panel: this does not use the global panel-cancellation path.
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Agent', exact: true}).click();
  await page.clock.runFor(300);
  await page.evaluate(settings => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: settings}, '*'), DEFAULT_LAYER_SETTINGS);
  await page.clock.runFor(300);
  const before = await page.evaluate(() => window.freshFixture.comm.length);
  await page.clock.fastForward(40_100);
  expect(await page.evaluate(() => window.freshFixture.comm.length)).toBe(before);
});

test('hidden pages pause automatic work and resume overdue map/COMM refreshes once visible', async ({page}) => {
  const before = await snapshot(page);
  const commBefore = await page.evaluate(() => window.freshFixture.comm.length);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, value: true});
    document.dispatchEvent(new Event('visibilitychange'));
    window.freshFixture.phase = 1;
  });
  await page.clock.fastForward(310_000);
  expect(await snapshot(page)).toEqual(before);
  expect(await page.evaluate(() => window.freshFixture.comm.length)).toBe(commBefore);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, value: false});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5100);
  await expect.poll(() => snapshot(page)).toMatchObject({color: '#0088ff', oldLink: false, oldField: false});
  expect(await page.evaluate(() => window.freshFixture.comm.length)).toBe(commBefore + 1);
});
