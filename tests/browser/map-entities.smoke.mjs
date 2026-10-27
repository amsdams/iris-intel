import {test, expect} from '@playwright/test';

const portal = (guid, team, level, offset = 0) => ({guid, team, level, isPlaceholder: false,
  latE6: 52000000 + offset, lngE6: 4000000 + offset, health: 100,
  history: {visited: true, captured: false, scoutControlled: false}});
const entities = {
  generation: 900,
  portals: [portal('res', 'R', 8), portal('enl', 'E', 5, 1000), portal('neutral', 'N', 0, 2000)],
  links: [{guid: 'link', team: 'R', oLatE6: 52000000, oLngE6: 4000000, dLatE6: 52001000, dLngE6: 4001000}],
  fields: [{guid: 'field', team: 'E', points: [
    {latE6: 52000000, lngE6: 4000000}, {latE6: 52001000, lngE6: 4001000}, {latE6: 52000000, lngE6: 4002000},
  ]}],
};
const render = (page, value) => page.evaluate(entities => window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities}, '*'), value);
const counts = page => page.evaluate(() => {
  const layers = window.__iitcIrisLayers;
  return ['portals', 'links', 'fields'].map(key => layers.coreLayerGroups[key].getLayers().filter(layer => window.__iitcIrisMap.hasLayer(layer)).length);
});
const settings = (page, patch) => page.evaluate(patch => {
  window.entityFixture.settings = {...window.entityFixture.settings, ...patch};
  window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: window.entityFixture.settings}, '*');
}, patch);

let errors;
test.beforeEach(async ({page}) => {
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {}}}}));
  await page.addInitScript(() => {
    window.entityFixture = {};
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_LAYER_SETTINGS' && data.layerSettings) window.entityFixture.settings = data.layerSettings;
      if (data.type === 'IITC_IRIS_ENTITY_STATUS') window.entityFixture.status = data;
      if (data.type === 'IITC_IRIS_DATA_SOURCE_SETTINGS') window.entityFixture.dataSource = data.dataSource;
    });
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.entityFixture.settings && window.__iitcIrisLayers))).toBe(true);
  // Fixture mode cancels live retries and provides a settled render plan with detailed portals.
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'renderer', label: 'renderer', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture renderer');
  await render(page, entities);
  await expect.poll(() => counts(page)).toEqual([3, 1, 1]);
  await page.evaluate(() => {
    const index = window.__iitcIrisLayers.entityLayerIndex;
    window.entityFixture.original = Object.fromEntries(['portals', 'links', 'fields'].map(key => [key, new Map(index[key])]));
  });
});
test.afterEach(async ({page}) => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(errors).toEqual([]);
});

test('incremental generations retain unchanged layers and replace or remove changed entities', async ({page}) => {
  await render(page, {...entities, generation: 901,
    portals: [entities.portals[0], {...entities.portals[1], health: 50}, portal('machina', 'M', 4, 3000)],
    fields: [],
  });
  await expect.poll(() => counts(page)).toEqual([3, 1, 0]);
  expect(await page.evaluate(() => {
    const index = window.__iitcIrisLayers.entityLayerIndex;
    const original = window.entityFixture.original;
    return {
      unchangedPortal: index.portals.get('res')[0] === original.portals.get('res')[0],
      changedPortal: index.portals.get('enl')[0] !== original.portals.get('enl')[0],
      removedPortal: !index.portals.has('neutral'), addedPortal: index.portals.has('machina'),
      unchangedLink: index.links.get('link')[0] === original.links.get('link')[0],
      removedField: !index.fields.has('field'),
    };
  })).toEqual({unchangedPortal: true, changedPortal: true, removedPortal: true, addedPortal: true, unchangedLink: true, removedField: true});
});

test('overlay, faction and level filters restore layers; highlighters restyle existing markers', async ({page}) => {
  await settings(page, {portals: false});
  await expect.poll(() => counts(page)).toEqual([0, 1, 1]);
  await settings(page, {portals: true});
  await expect.poll(() => counts(page)).toEqual([3, 1, 1]);
  await settings(page, {resistance: false});
  await expect.poll(() => counts(page)).toEqual([2, 0, 1]);
  await settings(page, {resistance: true});
  await expect.poll(() => counts(page)).toEqual([3, 1, 1]);
  await settings(page, {level8Portals: false});
  await expect.poll(() => counts(page)).toEqual([2, 1, 1]);
  await settings(page, {level8Portals: true, unclaimedPortals: false});
  await expect.poll(() => counts(page)).toEqual([2, 1, 1]);
  await settings(page, {unclaimedPortals: true});
  await expect.poll(() => counts(page)).toEqual([3, 1, 1]);
  const marker = () => page.evaluate(() => {
    const current = window.__iitcIrisLayers.entityLayerIndex.portals.get('res')[0];
    return {same: current === window.entityFixture.original.portals.get('res')[0], fill: current.options.fillColor};
  });
  expect((await marker()).same).toBe(true);
  const originalFill = (await marker()).fill;
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', highlighterSettings: {active: 'history-visited'}}, '*'));
  await expect.poll(marker).toEqual({same: true, fill: 'yellow'});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', highlighterSettings: {active: 'none'}}, '*'));
  await expect.poll(marker).toEqual({same: true, fill: originalFill});
});

test('replacement maps receive fresh entity layers without retaining old renderer resources', async ({page}) => {
  // Let Canvas finish painting before replacement; the immediate-redraw edge case is tracked separately.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => {
    window.entityFixture.status = null;
    window.entityFixture.dataSource = null;
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = old.className;
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  // The UI replays its saved live preference on PAGE_READY; then restore the test's controlled source.
  await expect.poll(() => page.evaluate(() => window.entityFixture.dataSource?.mode)).toBe('live');
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'renderer', label: 'renderer', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture renderer');
  await expect.poll(() => counts(page)).toEqual([0, 0, 0]);
  await render(page, {...entities, generation: 902});
  await expect.poll(() => counts(page)).toEqual([3, 1, 1]);
  expect(await page.evaluate(() => {
    const current = window.__iitcIrisLayers.entityLayerIndex.portals.get('res')[0];
    const old = window.entityFixture.original.portals.get('res')[0];
    return {fresh: current !== old, oldDetached: !old._map, currentMap: current._map === window.__iitcIrisMap};
  })).toEqual({fresh: true, oldDetached: true, currentMap: true});
});
