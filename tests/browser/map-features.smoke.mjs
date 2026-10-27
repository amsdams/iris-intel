import {test, expect} from '@playwright/test';

let errors;
test.beforeEach(async ({page}) => {
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.addInitScript(() => {
    window.featureFixture = {};
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_LAYER_SETTINGS' && data.layerSettings) window.featureFixture.settings = data.layerSettings;
      if (data.type === 'IITC_IRIS_MISSIONS_STATUS') window.featureFixture.missions = data.missions;
      if (data.type === 'IITC_IRIS_ENTITY_STATUS') window.featureFixture.entities = data;
    });
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => ({map: Boolean(window.__iitcIrisMap), settings: Boolean(window.featureFixture.settings)}))).toEqual({map: true, settings: true});
});
test.afterEach(async ({page}) => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(errors).toEqual([]);
});

async function replaceMap(page) {
  await expect(page.locator('.leaflet-zoom-anim, .leaflet-pan-anim')).toHaveCount(0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => {
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = old.className;
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
}

test('live mission requests persist details and restore cached overlays on the replacement map', async ({page}) => {
  await page.evaluate(() => {
    const original = window.fetch;
    window.featureFixture.detailsRequests = 0;
    window.fetch = (url, init) => {
      if (String(url).includes('/r/getTopMissionsInBounds')) {
        window.featureFixture.bounds = JSON.parse(init.body);
        return Promise.resolve(Response.json({result: [['mission', 'Live mission']]}));
      }
      if (String(url).includes('/r/getMissionDetails')) {
        window.featureFixture.detailsRequests += 1;
        return Promise.resolve(Response.json({result: ['mission', 'Live mission', 'Description', 'Agent', 'RESISTANCE',
          900000, 60000, 1, 1, [[false, 'portal', 'Start', 1, 1, ['p', 'Start', 52000000, 4000000]]]]}));
      }
      return original(url, init);
    };
    window.postMessage({type: 'IITC_IRIS_REQUEST_MISSIONS', missionSource: 'view'}, '*');
  });
  await expect.poll(() => page.evaluate(() => window.featureFixture.missions?.status)).toBe('ready');
  expect(await page.evaluate(() => window.featureFixture.bounds)).toMatchObject({v: 'smoke-test', northE6: expect.any(Number)});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_REQUEST_MISSION_DETAILS', missionGuid: 'mission'}, '*'));
  await expect.poll(() => page.evaluate(() => window.featureFixture.missions?.detailsStatus)).toBe('ready');
  await expect(page.locator('.iitc-iris-mission-waypoint-label')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('iitc-iris:missions:details-cache')).mission.data.guid)).toBe('mission');
  await replaceMap(page);
  await expect(page.locator('.iitc-iris-mission-waypoint-label')).toHaveCount(0);
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_REQUEST_MISSION_DETAILS', missionGuid: 'mission'}, '*'));
  await expect(page.locator('.iitc-iris-mission-waypoint-label')).toHaveCount(1);
  expect(await page.evaluate(() => ({requests: window.featureFixture.detailsRequests,
    cached: window.featureFixture.missions.detailsCached}))).toEqual({requests: 1, cached: true});
});

test('COMM-driven grouped player markers retain history, popup navigation and faction filtering after replacement', async ({page}) => {
  await page.evaluate(() => {
    const original = window.fetch;
    const now = Date.now();
    const row = (name, time, guid, latE6) => [guid, time, {plext: {text: `${name} captured Portal`,
      markup: [['PLAYER', {plain: name, team: 'RESISTANCE'}], ['TEXT', {plain: ' captured '}],
        ['PORTAL', {name: 'Portal', latE6, lngE6: 4000000}]],
      categories: 1, team: 'RESISTANCE', plextType: 'SYSTEM_BROADCAST'}}];
    window.fetch = (url, init) => String(url).includes('/r/getPlexts') ? Promise.resolve(Response.json({result: [
      row('Agent A', now - 60000, 'previous', 51999000), row('Agent A', now, 'a', 52000000), row('Agent B', now, 'b', 52000000),
    ]})) : original(url, init);
    window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS',
      layerSettings: {...window.featureFixture.settings, playerTrackerResistance: true}}, '*');
  });
  const counter = page.locator('.iitc-iris-player-tracker-count');
  await expect(counter).toHaveText('2');
  await counter.click();
  const popup = page.locator('.iitc-iris-player-tracker-leaflet-popup');
  await expect(popup).toContainText('Agent A');
  await expect(popup).toContainText('Agent B');
  await popup.getByRole('button', {name: /Agent A/}).click();
  await expect(popup).toContainText('previous locations:');
  await popup.getByRole('button', {name: 'All agents (2)'}).click();
  await expect(popup.getByRole('button', {name: /Agent B/})).toBeVisible();
  await page.evaluate(() => window.__iitcIrisMap.closePopup());
  await replaceMap(page);
  // PAGE_READY replays the UI's saved preference; re-enable this test's explicit overlay setting.
  await expect.poll(() => page.evaluate(() => window.featureFixture.settings.playerTrackerResistance)).toBe(false);
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS',
    layerSettings: {...window.featureFixture.settings, playerTrackerResistance: true}}, '*'));
  await expect(counter).toHaveText('2');
  await counter.click();
  await popup.getByRole('button', {name: /Agent A/}).click();
  await expect(popup).toContainText('previous locations:');
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS',
    layerSettings: {...window.featureFixture.settings, playerTrackerResistance: false}}, '*'));
  await expect(counter).toHaveCount(0);
  await expect(popup).toHaveCount(0);
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS',
    layerSettings: {...window.featureFixture.settings, playerTrackerResistance: true}}, '*'));
  await expect(counter).toHaveText('2');
  await expect.poll(() => page.evaluate(() => window.featureFixture.entities?.playerTracker?.traces)).toBe(1);
});
