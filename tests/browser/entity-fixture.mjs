import {waitForMapFrames} from './navigation-fixture.mjs';
import {test as base, expect} from './smoke-fixtures.mjs';
export {expect};

export const portal = (guid, team, level, offset = 0) => ({guid, team, level, isPlaceholder: false,
  latE6: 52000000 + offset, lngE6: 4000000 + offset, health: 100,
  history: {visited: true, captured: false, scoutControlled: false}});
export const entities = {
  generation: 900,
  portals: [portal('res', 'R', 8), portal('enl', 'E', 5, 1000), portal('neutral', 'N', 0, 2000)],
  links: [{guid: 'link', team: 'R', oLatE6: 52000000, oLngE6: 4000000, dLatE6: 52001000, dLngE6: 4001000}],
  fields: [{guid: 'field', team: 'E', points: [
    {latE6: 52000000, lngE6: 4000000}, {latE6: 52001000, lngE6: 4001000}, {latE6: 52000000, lngE6: 4002000},
  ]}],
};
export const render = (page, value) => page.evaluate(entities => window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities}, '*'), value);
export const levelLabels = (page, team) => page.evaluate(team => window.__iitcIrisLayers.labels
  .filter(layer => typeof layer.options.levelLabel === 'number' && (!team || layer.options.className.endsWith(`-${team}`)))
  .map(layer => String(layer.options.levelLabel)), team);
export const levelInkAtPortal = (page, guid) => page.evaluate(guid => {
  const canvas = document.querySelector('.iitc-iris-level-labels-canvas');
  const marker = window.__iitcIrisLayers.entityLayerIndex.portals.get(guid)?.[0];
  if (!canvas || !marker) return false;
  const map = window.__iitcIrisMap;
  const point = map.latLngToContainerPoint(marker.getLatLng());
  const mapRect = map.getContainer().getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = Math.round((mapRect.left + point.x - rect.left) * scale);
  const y = Math.round((mapRect.top + point.y - rect.top) * scale);
  const pixels = canvas.getContext('2d').getImageData(x - 6 * scale, y - 6 * scale, 12 * scale, 12 * scale).data;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 220 && pixels[i + 1] > 220 && pixels[i + 2] > 130 && pixels[i + 3] > 128) return true;
  }
  return false;
}, guid);
export const keyLabels = page => page.evaluate(() => window.__iitcIrisLayers.labels
  .filter(layer => typeof layer.options.keyCountLabel === 'number').map(layer => layer.options.keyCountLabel));
export const keyInkAtPortal = (page, guid) => page.evaluate(guid => {
  const canvas = document.querySelector('.iitc-iris-key-counts-canvas');
  const marker = window.__iitcIrisLayers.entityLayerIndex.portals.get(guid)?.[0];
  if (!canvas || !marker) return false;
  const map = window.__iitcIrisMap;
  const point = map.latLngToContainerPoint(marker.getLatLng());
  const mapRect = map.getContainer().getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = Math.round((mapRect.left + point.x + 1 - rect.left) * scale);
  const y = Math.round((mapRect.top + point.y - marker.options.radius - 4 - rect.top) * scale);
  const pixels = canvas.getContext('2d').getImageData(x - 6 * scale, y - 4 * scale, 12 * scale, 8 * scale).data;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 220 && pixels[i + 1] > 220 && pixels[i + 2] > 220 && pixels[i + 3] > 128) return true;
  }
  return false;
}, guid);
export const keyItem = (guid, portalGuid) => [guid, 1, {resource: {resourceType: 'PORTAL_LINK_KEY'},
  portalCoupler: {portalGuid, portalTitle: portalGuid}}];
export async function loadKeys(page) {
  await page.evaluate(() => {
    window.entityFixture.inventoryItems = [['key', 1, {resource: {resourceType: 'PORTAL_LINK_KEY'},
      portalCoupler: {portalGuid: 'res', portalTitle: 'Res'}}]];
    const original = window.fetch;
    window.fetch = (url, init) => {
      if (String(url).endsWith('/getHasActiveSubscription')) return Promise.resolve(Response.json({result: true}));
      if (String(url).endsWith('/getInventory')) return Promise.resolve(Response.json({result: window.entityFixture.inventoryItems}));
      return original(url, init);
    };
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_INVENTORY_STATUS') window.entityFixture.inventory = data.inventory;
    });
    window.postMessage({type: 'IITC_IRIS_REQUEST_INVENTORY'}, '*');
  });
  await expect.poll(() => page.evaluate(() => window.entityFixture.inventory?.status)).toBe('ready');
}
export async function refreshKeys(page, items) {
  await page.evaluate(items => {
    window.entityFixture.inventory = undefined;
    window.entityFixture.inventoryItems = items;
    window.postMessage({type: 'IITC_IRIS_REQUEST_INVENTORY'}, '*');
  }, items);
  await expect.poll(() => page.evaluate(() => window.entityFixture.inventory?.status)).toBe(items.length ? 'ready' : 'error');
}
export const counts = page => page.evaluate(() => {
  const layers = window.__iitcIrisLayers;
  return ['portals', 'links', 'fields'].map(key => layers.coreLayerGroups[key].getLayers().filter(layer => window.__iitcIrisMap.hasLayer(layer)).length);
});
export const settings = (page, patch) => page.evaluate(patch => {
  window.entityFixture.settings = {...window.entityFixture.settings, ...patch};
  window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: window.entityFixture.settings}, '*');
}, patch);

export const test = base.extend({
  entityMap: [async ({page}, use) => {
    await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {}}}}));
    await page.addInitScript(() => {
      window.entityFixture = {};
      window.__irisRpcHandlers = {getPortalDetails: () => Response.json({result: false})};
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
    await use();
    await waitForMapFrames(page);
  }, {auto: true}],
});
