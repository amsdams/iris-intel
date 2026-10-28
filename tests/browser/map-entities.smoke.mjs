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
const levelLabels = (page, team) => page.evaluate(team => window.__iitcIrisLayers.labels
  .filter(layer => typeof layer.options.levelLabel === 'number' && (!team || layer.options.className.endsWith(`-${team}`)))
  .map(layer => String(layer.options.levelLabel)), team);
const levelInkAtPortal = (page, guid) => page.evaluate(guid => {
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
const keyLabels = page => page.evaluate(() => window.__iitcIrisLayers.labels
  .filter(layer => typeof layer.options.keyCountLabel === 'number').map(layer => layer.options.keyCountLabel));
const keyInkAtPortal = (page, guid) => page.evaluate(guid => {
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
const keyItem = (guid, portalGuid) => [guid, 1, {resource: {resourceType: 'PORTAL_LINK_KEY'},
  portalCoupler: {portalGuid, portalTitle: portalGuid}}];
async function loadKeys(page) {
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
async function refreshKeys(page, items) {
  await page.evaluate(items => {
    window.entityFixture.inventory = undefined;
    window.entityFixture.inventoryItems = items;
    window.postMessage({type: 'IITC_IRIS_REQUEST_INVENTORY'}, '*');
  }, items);
  await expect.poll(() => page.evaluate(() => window.entityFixture.inventory?.status)).toBe(items.length ? 'ready' : 'error');
}
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

test('level labels retain layers and their shared canvas through refreshes, update changed levels and obey collisions and filters', async ({page}) => {
  await settings(page, {labels: true});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(3);
  await expect(page.locator('.iitc-iris-level-labels-canvas')).toHaveCount(1);
  await expect(page.locator('.iitc-iris-level-label')).toHaveCount(0);
  await expect.poll(() => levelInkAtPortal(page, 'res')).toBe(true);
  await page.evaluate(() => {
    window.entityFixture.levelLabels = window.__iitcIrisLayers.labels.slice();
    window.entityFixture.levelCanvas = document.querySelector('.iitc-iris-level-labels-canvas');
  });
  await render(page, {...entities, generation: 901, portals: entities.portals.map(p => ({...p, health: 80}))});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => window.__iitcIrisLayers.labels.every((label, i) =>
    label === window.entityFixture.levelLabels[i]) &&
    document.querySelector('.iitc-iris-level-labels-canvas') === window.entityFixture.levelCanvas)).toBe(true);

  const updated = {...entities.portals[0], level: 7};
  await render(page, {...entities, generation: 902, portals: [updated, ...entities.portals.slice(1)]});
  await expect.poll(() => levelLabels(page, 'R')).toEqual(['7']);
  expect(await page.evaluate(() => ({
    oldDetached: !window.entityFixture.levelLabels[0]._map,
    othersRetained: window.entityFixture.levelLabels.slice(1).every(label => window.__iitcIrisLayers.labels.includes(label)),
  }))).toEqual({oldDetached: true, othersRetained: true});

  await render(page, {...entities, generation: 903, portals: [updated, ...entities.portals.slice(1),
    {...updated, guid: 'overlapping', level: 8},
    {...portal('placeholder', 'R', 8, 3000), isPlaceholder: true},
    {...portal('unknown', 'R', undefined, 4000)},
  ]});
  await expect.poll(() => levelLabels(page, 'R')).toEqual(['8']);
  await expect.poll(async () => (await levelLabels(page)).length).toBe(3);
  await settings(page, {level8Portals: false});
  await expect.poll(() => levelLabels(page, 'R')).toEqual(['7']);
  await settings(page, {resistance: false});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(2);
  await settings(page, {labels: false});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(0);
  await settings(page, {labels: true});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(2);
  await render(page, {...entities, generation: 904, portals: []});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(0);
});

test('canvas level text follows animated pan and zoom and clears when disabled', async ({page}) => {
  await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {fixture: {
    gameEntities: entities.portals.map(p => [p.guid, 1000, ['p', p.team, p.latE6, p.lngE6, p.level, 100, 8, '', 'Fixture', [], false, false, null, 1000]]),
  }}}}}));
  await settings(page, {labels: true});
  await expect.poll(() => levelInkAtPortal(page, 'res')).toBe(true);
  await page.evaluate(() => new Promise(resolve => {
    const map = window.__iitcIrisMap;
    map.once('moveend', resolve);
    map.panBy([40, 30], {animate: true, duration: 0.1});
  }));
  await expect.poll(() => levelInkAtPortal(page, 'res')).toBe(true);
  await page.evaluate(() => new Promise(resolve => {
    const map = window.__iitcIrisMap;
    map.once('zoomend', resolve);
    map.setZoom(17, {animate: true});
  }));
  await expect.poll(() => levelInkAtPortal(page, 'res')).toBe(true);
  await expect(page.locator('.iitc-iris-level-labels-canvas')).toHaveCount(1);
  await settings(page, {labels: false});
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector('.iitc-iris-level-labels-canvas');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((_, i) => i % 4 === 3 && data[i] !== 0);
  })).toBe(false);
});

test('level and key-count labels coexist across zoom changes and recover after a full clear', async ({page}) => {
  await loadKeys(page);
  await settings(page, {labels: true, keyCount: true});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(3);
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  await settings(page, {labels: false});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(0);
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  await settings(page, {labels: true, keyCount: false});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(3);
  await expect.poll(() => keyLabels(page)).toEqual([]);

  await page.evaluate(() => window.__iitcIrisMap.setZoom(13, {animate: false}));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.renderPolicy?.detailedPortals)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.renderPolicy?.labels)).toBe(true);
  await expect.poll(async () => (await levelLabels(page)).length).toBe(0);
  await page.evaluate(() => window.__iitcIrisMap.setZoom(16, {animate: false}));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.renderPolicy?.labels)).toBe(true);
  await render(page, {...entities, generation: 905});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(3);

  await settings(page, {keyCount: true});
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  // Fetching the empty fixture clears all layers independently of incremental render synchronization.
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'clear-labels', label: 'clear-labels', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture clear-labels');
  await expect.poll(async () => (await levelLabels(page)).length).toBe(0);
  await expect.poll(() => keyLabels(page)).toEqual([]);
  await render(page, {...entities, generation: 906});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(3);
  await expect.poll(() => keyLabels(page)).toEqual([1]);
});

test('wide views explain missing map data and style only known portal details without changing enabled settings', async ({page}) => {
  const open = async name => {
    const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Map', exact: true});
    if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
    await page.locator('.iitc-iris-sheet-tabbar-secondary').getByRole('button', {name, exact: true}).click();
  };
  const notice = page.getByLabel('Map data availability', {exact: true});
  await open('Display');
  await expect(notice).toHaveCount(0);
  await page.getByRole('checkbox', {name: 'Level labels', exact: true}).check();
  await page.getByRole('radio', {name: 'Level color', exact: true}).check();
  await page.evaluate(() => window.__iitcIrisMap.setZoom(13, {animate: false}));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.renderPolicy?.detailedPortals)).toBe(false);
  await expect(notice).toContainText('including unclaimed portals and portal levels');
  await expect(notice).toContainText('Enabled level labels and highlights use only known portal data');
  await expect(page.getByRole('checkbox', {name: 'Level labels', exact: true})).toBeChecked();
  await expect(page.getByRole('radio', {name: 'Level color', exact: true})).toBeChecked();

  const known = {...portal('res', 'R', 8), health: 50,
    history: {visited: false, captured: false, scoutControlled: false}};
  const unknown = {...portal('unknown', 'R', undefined, 10000), health: undefined, history: undefined};
  const anchor = {...unknown, guid: 'anchor', isPlaceholder: true, latE6: 52020000};
  await render(page, {...entities, generation: 950, portals: [known, unknown, anchor]});
  await expect.poll(() => levelLabels(page)).toEqual(['8']);
  const fills = () => page.evaluate(() => Object.fromEntries(['res', 'unknown', 'anchor'].map(guid =>
    [guid, window.__iitcIrisLayers.entityLayerIndex.portals.get(guid)?.[0].options.fillColor])));
  const baseColor = (await fills()).unknown;
  expect((await fills()).res).not.toBe(baseColor);
  expect((await fills()).anchor).toBe(baseColor);
  await page.getByRole('radio', {name: 'Needs recharge', exact: true}).check();
  await expect.poll(async () => (await fills()).res).not.toBe(baseColor);
  expect((await fills()).unknown).toBe(baseColor);
  for (const name of ['Not visited', 'Not captured', 'Not scout controlled']) {
    await page.getByRole('radio', {name, exact: true}).check();
    await expect.poll(fills).toEqual({res: 'red', unknown: baseColor, anchor: baseColor});
  }
  await page.getByRole('radio', {name: 'None', exact: true}).check();
  await page.getByRole('checkbox', {name: 'Level labels', exact: true}).uncheck();
  await expect(notice).not.toContainText('Enabled level labels');
  await expect.poll(() => levelLabels(page)).toEqual([]);
  for (const name of ['Counts', 'List', 'Scoreboard']) {
    await open(name);
    await expect(notice).toContainText('Results use loaded map data');
    await expect(notice).not.toContainText('Shorter links'); // zoom 13 includes all link lengths
  }
  await page.evaluate(() => window.__iitcIrisMap.setZoom(12, {animate: false}));
  await expect(notice).toContainText('Shorter links are also omitted at this zoom');
  await page.evaluate(() => window.__iitcIrisMap.setZoom(15, {animate: false}));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.renderPolicy?.detailedPortals)).toBe(true);
  await expect(notice).toHaveCount(0);
  for (const name of ['Counts', 'List', 'Display']) {
    await open(name);
    await expect(notice).toHaveCount(0);
  }
});

test('key-count canvas retains unchanged badges, updates inventory and filters, and preserves cached counts on failure', async ({page}) => {
  await loadKeys(page);
  await settings(page, {labels: false, keyCount: true});
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  await expect.poll(() => keyInkAtPortal(page, 'res')).toBe(true);
  await expect(page.locator('.iitc-iris-key-count-label')).toHaveCount(0);
  await page.evaluate(() => {window.entityFixture.keyLabel = window.__iitcIrisLayers.labels[0];});
  await render(page, {...entities, generation: 920, portals: entities.portals.map(p => ({...p, health: 70}))});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => window.__iitcIrisLayers.labels[0] === window.entityFixture.keyLabel)).toBe(true);
  await refreshKeys(page, [keyItem('key-1', 'res'), keyItem('key-2', 'res')]);
  await expect.poll(() => keyLabels(page)).toEqual([2]);
  expect(await page.evaluate(() => !window.entityFixture.keyLabel._map)).toBe(true);
  await expect.poll(() => keyInkAtPortal(page, 'res')).toBe(true);
  await refreshKeys(page, []);
  await expect.poll(() => keyLabels(page)).toEqual([2]);
  await refreshKeys(page, [keyItem('other-key', 'enl')]);
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  await expect.poll(() => keyInkAtPortal(page, 'enl')).toBe(true);
  await settings(page, {enlightened: false});
  await expect.poll(() => keyLabels(page)).toEqual([]);
  await settings(page, {enlightened: true});
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  await render(page, {...entities, generation: 921, portals: entities.portals.map(p => p.guid === 'enl' ? {...p, level: 8, latE6: p.latE6 + 1000} : p)});
  await expect.poll(() => keyInkAtPortal(page, 'enl')).toBe(true);
  await settings(page, {keyCount: false});
  await expect.poll(() => keyLabels(page)).toEqual([]);
  await expect.poll(() => page.evaluate(() => {
    const c = document.querySelector('.iitc-iris-key-counts-canvas');
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v !== 0);
  })).toBe(false);
});

test('key badges follow animated pan/zoom and stay above level text when enabled first', async ({page}) => {
  await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {fixture: {
    gameEntities: entities.portals.map(p => [p.guid, 1000, ['p', p.team, p.latE6, p.lngE6, p.level, 100, 8, '', 'Fixture', [], false, false, null, 1000]]),
  }}}}}));
  await loadKeys(page);
  await settings(page, {labels: false, keyCount: true});
  await expect.poll(() => keyInkAtPortal(page, 'res')).toBe(true);
  await settings(page, {labels: true});
  await expect.poll(() => levelInkAtPortal(page, 'res')).toBe(true);
  expect(await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('.leaflet-iitc-iris-labels-pane canvas')];
    return canvases.map(c => c.className);
  })).toEqual([expect.stringContaining('iitc-iris-level-labels-canvas'), expect.stringContaining('iitc-iris-key-counts-canvas')]);
  for (const action of ['pan', 'zoom']) {
    await page.evaluate(action => new Promise(resolve => {
      const map = window.__iitcIrisMap;
      map.once(action === 'pan' ? 'moveend' : 'zoomend', resolve);
      if (action === 'pan') map.panBy([40, 30], {animate: true, duration: 0.1});
      else map.setZoom(17, {animate: true});
    }), action);
    await expect.poll(() => keyInkAtPortal(page, 'res')).toBe(true);
    await expect.poll(() => levelInkAtPortal(page, 'res')).toBe(true);
  }
  await expect(page.locator('.iitc-iris-key-counts-canvas')).toHaveCount(1);
});

test('map removal cancels canvas redraws queued before synchronous movement', async ({page}) => {
  const state = await page.evaluate(() => {
    const map = window.__iitcIrisMap;
    const portal = window.__iitcIrisLayers.entityLayerIndex.portals.get('res')[0];
    const renderer = portal._renderer;
    portal.redraw();
    const queued = renderer._redrawRequest;
    map.panBy([5, 5], {animate: false});
    const afterMove = renderer._redrawRequest;
    map.remove();
    return {queued: Boolean(queued), afterMove: Boolean(afterMove), destroyed: !renderer._ctx};
  });
  expect(state).toEqual({queued: true, afterMove: false, destroyed: true});
});

test('replacement maps receive fresh entity layers without retaining old renderer resources', async ({page}) => {
  await loadKeys(page);
  await settings(page, {labels: true, keyCount: true});
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  await page.evaluate(() => {window.entityFixture.oldKeyLabel = window.__iitcIrisLayers.labels.find(l => l.options.keyCountLabel);});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(3);
  await page.evaluate(() => { window.entityFixture.oldLevelLabel = window.__iitcIrisLayers.labels.find(l => l.options.levelLabel === 8); });
  await page.evaluate(() => {
    // Replace with entity/label redraws still queued; removal must cancel their frames.
    const map = window.__iitcIrisMap;
    map.eachLayer(layer => layer.redraw?.());
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
  await settings(page, {labels: true, keyCount: true});
  await expect.poll(async () => (await levelLabels(page)).length).toBe(3);
  expect(await page.evaluate(() => {
    const current = window.__iitcIrisLayers.entityLayerIndex.portals.get('res')[0];
    const old = window.entityFixture.original.portals.get('res')[0];
    const oldLabel = window.entityFixture.oldLevelLabel;
    const oldKey = window.entityFixture.oldKeyLabel;
    return {fresh: current !== old, oldDetached: !old._map, currentMap: current._map === window.__iitcIrisMap,
      labelsFresh: !window.__iitcIrisLayers.labels.includes(oldLabel), oldLabelDetached: !oldLabel._map,
      keyFresh: !window.__iitcIrisLayers.labels.includes(oldKey), oldKeyDetached: !oldKey._map};
  })).toEqual({fresh: true, oldDetached: true, currentMap: true, labelsFresh: true, oldLabelDetached: true, keyFresh: true, oldKeyDetached: true});
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  await expect.poll(() => keyInkAtPortal(page, 'res')).toBe(true);
});

test('portal details promote shared entities, reuse cached state and reject a cancelled late response', async ({page}) => {
  await page.evaluate(() => {
    const original = window.fetch;
    window.entityFixture.detailRequests = [];
    window.fetch = (url, init) => {
      if (!String(url).includes('/r/getPortalDetails')) return original(url, init);
      window.entityFixture.detailRequests.push({payload: JSON.parse(init.body), signal: init.signal});
      const body = {result: ['p', 'R', 52000000, 4000000, 8, 90, 8, '', 'Detailed portal', [], false, false,
        null, 1717027200000, [], [], 'FixtureOwner', null, 3]};
      if (window.entityFixture.detailRequests.length === 1) return Promise.resolve(Response.json(body));
      return new Promise(resolve => {window.entityFixture.finishDetails = () => resolve(Response.json(body));});
    };
    window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: 'res', portalLat: 52, portalLng: 4, zoom: 16}, '*');
  });
  await expect.poll(() => page.evaluate(() => ({details: window.entityFixture.status?.portalDetails?.status,
    owner: window.entityFixture.status?.portalDetails?.owner, title: window.entityFixture.status?.selectedPortal?.title,
    overlay: window.__iitcIrisLayers.selectedPortal.length}))).toEqual({details: 'ready', owner: 'FixtureOwner', title: 'Detailed portal', overlay: 1});
  expect(await page.evaluate(() => window.entityFixture.detailRequests[0].payload)).toEqual({guid: 'res', v: 'smoke-test'});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: 'res'}, '*'));
  await expect.poll(() => page.evaluate(() => ({requests: window.entityFixture.detailRequests.length,
    cached: window.entityFixture.status?.portalDetails?.cached}))).toEqual({requests: 2, cached: true});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_CLEAR_PORTAL_SELECTION'}, '*'));
  await expect.poll(() => page.evaluate(() => ({selected: window.entityFixture.status?.selectedPortal,
    details: window.entityFixture.status?.portalDetails, aborted: window.entityFixture.detailRequests[1].signal.aborted})))
    .toEqual({selected: null, details: null, aborted: true});
  await page.evaluate(() => window.entityFixture.finishDetails());
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.selectedPortal.length)).toBe(0);
  expect(await page.evaluate(() => window.entityFixture.status.selectedPortal)).toBeNull();
});

test('real map context gestures select portals, links, fields and empty map points', async ({page}) => {
  await page.evaluate(() => {
    window.entityFixture.contexts = [];
    window.addEventListener('message', ({data}) => {
      if (data.type === 'IITC_IRIS_MAP_CONTEXT') window.entityFixture.contexts.push(data);
    });
    window.postMessage({type: 'IITC_IRIS_RENDER_ENTITIES', entities: {generation: 903,
      portals: [{guid: 'context-portal', title: 'Context portal', team: 'R', isPlaceholder: false, latE6: 52000000, lngE6: 4000000}],
      links: [{guid: 'context-link', team: 'R', oGuid: 'context-portal', dGuid: 'other',
        oLatE6: 52000000, oLngE6: 4000000, dLatE6: 52000000, dLngE6: 4005000}],
      fields: [{guid: 'context-field', team: 'E', points: [
        {latE6: 52000250, lngE6: 4000250}, {latE6: 52000250, lngE6: 4005000}, {latE6: 52002500, lngE6: 4000250},
      ]}] }}, '*');
  });
  const contextAt = async (lat, lng, target) => {
    const position = await page.evaluate(({lat, lng}) => {
      const map = window.__iitcIrisMap;
      const point = map.latLngToContainerPoint([lat, lng]);
      const rect = map.getContainer().getBoundingClientRect();
      return {x: rect.left + point.x, y: rect.top + point.y};
    }, {lat, lng});
    await page.mouse.click(position.x, position.y, {button: 'right'});
    await expect.poll(() => page.evaluate(() => window.entityFixture.contexts.at(-1)?.contextTarget)).toBe(target);
    // Close the context sheet so the next native gesture reaches the map.
    const close = page.locator('aside:visible').getByRole('button', {name: /^Close /});
    await expect(close).toHaveCount(1);
    await close.click();
    await expect(page.locator('.iitc-iris-shell')).toHaveClass(/iitc-iris-sheet-map(?:\s|$)/);
  };
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.entityLayerIndex.portals.has('context-portal'))).toBe(true);
  await contextAt(52, 4, 'portal');
  await contextAt(52, 4.0025, 'link');
  await contextAt(52.00075, 4.0015, 'field');
  await contextAt(51.99925, 3.9985, 'map');
  const contexts = await page.evaluate(() => window.entityFixture.contexts);
  expect(contexts.map(value => value.contextTarget)).toEqual(['portal', 'link', 'field', 'map']);
  expect(contexts[1]).toMatchObject({contextGuid: 'context-link', contextPortalGuids: ['context-portal', 'other']});
  expect(contexts[2]).toMatchObject({contextGuid: 'context-field'});
});

test('pending portal selection resolves on arrival and detail cache survives map replacement', async ({page}) => {
  await page.evaluate(() => {
    const original = window.fetch;
    window.entityFixture.detailCount = 0;
    window.fetch = (url, init) => {
      if (!String(url).includes('/r/getPortalDetails')) return original(url, init);
      window.entityFixture.detailCount += 1;
      const body = {result: ['p', 'R', 52000000, 4000000, 8, 100, 8, '', 'Arrived portal', [], false, false,
        null, 1717027200000, [], [], 'CachedOwner', null, 3]};
      if (window.entityFixture.detailCount === 1) return Promise.resolve(Response.json(body));
      return new Promise(resolve => {window.entityFixture.finishDetails = () => resolve(Response.json(body));});
    };
    window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: 'pending'}, '*');
  });
  await render(page, {...entities, generation: 904, portals: [{...entities.portals[0], guid: 'pending'}]});
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.portalDetails?.owner)).toBe('CachedOwner');
  // Keep the portal in subsequent fixture refreshes, including moveend after reselecting it.
  await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {fixture: {
    gameEntities: [['pending', 1000, ['p', 'R', 52000000, 4000000, 8, 100, 8, '', 'Arrived portal', [], false, false, null, 1000]]],
  }}}}}));
  await page.evaluate(() => {
    const map = window.__iitcIrisMap;
    map.eachLayer(layer => layer.redraw?.());
    map.panBy([5, 5], {animate: false});
    window.entityFixture.dataSource = null;
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = old.className;
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  await expect.poll(() => page.evaluate(() => window.entityFixture.dataSource?.mode)).toBe('live');
  await page.evaluate(() => {
    window.entityFixture.status = null;
    window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
      mode: 'fixture', id: 'renderer', label: 'renderer', url: '/entity-fixture.json',
    }}, '*');
  });
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture renderer');
  await expect.poll(() => counts(page)).toEqual([1, 0, 0]);
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.entityLayerIndex.portals.has('pending'))).toBe(true);
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL', portalGuid: 'pending'}, '*'));
  await expect.poll(() => page.evaluate(() => ({requests: window.entityFixture.detailCount,
    cached: window.entityFixture.status?.portalDetails?.cached, selected: window.entityFixture.status?.selectedPortal?.guid,
    overlay: window.__iitcIrisLayers.selectedPortal.length}))).toEqual({requests: 2, cached: true, selected: 'pending', overlay: 1});
  await page.evaluate(() => window.entityFixture.finishDetails());
  await expect.poll(() => page.evaluate(() => ({cached: window.entityFixture.status?.portalDetails?.cached ?? false,
    status: window.entityFixture.status?.portalDetails?.status, owner: window.entityFixture.status?.portalDetails?.owner})))
    .toEqual({cached: false, status: 'ready', owner: 'CachedOwner'});
});

test('combined layer, highlighter and base-map updates retain order and two-frame diagnostics', async ({page}) => {
  await page.evaluate(() => {
    const settings = {...window.entityFixture.settings, portals: false};
    window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', layerSettings: settings,
      highlighterSettings: {active: 'history-visited'}, baseLayerId: 'osm', sentAt: performance.now()}, '*');
  });
  await expect.poll(() => counts(page)).toEqual([0, 1, 1]);
  await expect.poll(() => page.evaluate(() => {
    const status = window.entityFixture.status;
    const updates = status?.timing?.interactionUpdates ?? [];
    const last = updates.slice(-2);
    return {base: status?.baseLayerId, highlighter: status?.highlighterSettings?.active,
      kinds: last.map(item => item.kind),
      painted: last.length === 2 && last.every(item => typeof item.secondAnimationFrameMs === 'number'),
      mirrorPainted: typeof status?.timing?.layerUpdate?.secondAnimationFrameMs === 'number'};
  })).toEqual({base: 'osm', highlighter: 'history-visited', kinds: ['layer', 'highlighter'], painted: true, mirrorPainted: true});
  await settings(page, {portals: true});
  await expect.poll(() => counts(page)).toEqual([3, 1, 1]);
  expect(await page.evaluate(() => {
    const current = window.__iitcIrisLayers.entityLayerIndex.portals.get('res')[0];
    return {same: current === window.entityFixture.original.portals.get('res')[0], fill: current.options.fillColor};
  })).toEqual({same: true, fill: 'yellow'});
});


const decoratedEntities = {
  ...entities, generation: 1100,
  portals: entities.portals.map((p, i) => ({...p, ornaments: ['fixture-ring'],
    artifacts: [{type: 'fixture', role: i === 0 ? 'target' : 'fragment', ids: [String(i)]}]})),
};
const decorationCounts = page => page.evaluate(() => ['ornaments', 'artifacts'].map(key => window.__iitcIrisLayers[key].length));
async function imageFixture(page) {
  const images = await page.evaluate(() => {
    window.entityFixture.images = [];
    // Keep fixtures same-origin so pixel assertions can inspect the canvas; real image display
    // deliberately keeps the old <img> permissions and does not depend on remote CORS headers.
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {...src, set(value) {
      const url = new URL(value, location.href);
      src.set.call(this, url.pathname.includes('/marker_images/') ? `${location.origin}${url.pathname}` : value);
    }});
    window.Image = new Proxy(window.Image, {construct(Target, args) {
      const image = Reflect.construct(Target, args);
      window.entityFixture.images.push(image);
      return image;
    }});
    return Object.fromEntries(['yellow', 'red', 'blue'].map(color => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 60;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 60, 60);
      return [color, canvas.toDataURL().split(',')[1]];
    }));
  });
  await page.route('**/marker_images/**', route => route.fulfill({contentType: 'image/png',
    body: Buffer.from(images[/shard_target|fixture-red/.test(route.request().url()) ? 'red'
      : /shard|fixture-blue/.test(route.request().url()) ? 'blue' : 'yellow'], 'base64')}));
  return images;
}
const imagePixel = (page, key, guid = 'res', dx = 0, dy = 0) => page.evaluate(({key, guid, dx, dy}) => {
  const canvas = document.querySelector(`.iitc-iris-${key}-canvas`);
  const layer = window.__iitcIrisLayers[key].find(l => JSON.parse(l.options.portalImage.guid)[0] === guid);
  if (!canvas || !layer) return [];
  const map = window.__iitcIrisMap;
  const point = map.latLngToContainerPoint(layer.getLatLng());
  const mapRect = map.getContainer().getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = Math.round((mapRect.left + point.x + dx - rect.left) * scale);
  const y = Math.round((mapRect.top + point.y + dy - rect.top) * scale);
  return [...canvas.getContext('2d').getImageData(x, y, 1, 1).data];
}, {key, guid, dx, dy});
const emptyImageCanvases = page => page.evaluate(() => [...document.querySelectorAll(
  '.iitc-iris-ornaments-canvas,.iitc-iris-artifacts-canvas')].every(canvas => {
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  return !data.some((value, i) => i % 4 === 3 && value);
}));

test('image overlays retain unchanged decorations, update styles/positions and preserve exclusions and visibility', async ({page}) => {
  await imageFixture(page);
  await settings(page, {ornaments: true, artifacts: true});
  await render(page, decoratedEntities);
  await expect.poll(() => decorationCounts(page)).toEqual([3, 3]);
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([255, 0, 0, 255]);
  await expect.poll(() => imagePixel(page, 'artifacts', 'enl')).toEqual([0, 0, 255, 153]);
  await expect(page.locator('.iitc-iris-ornament-icon,.iitc-iris-artifact-icon')).toHaveCount(0);
  await expect(page.locator('.iitc-iris-ornaments-canvas,.iitc-iris-artifacts-canvas')).toHaveCount(2);
  expect(await imagePixel(page, 'ornaments', 'res', 31)).toEqual([0, 0, 0, 0]);
  expect(await imagePixel(page, 'artifacts', 'res', 26)).toEqual([0, 0, 0, 0]);
  expect(await imagePixel(page, 'artifacts', 'enl', 16)).toEqual([0, 0, 0, 0]);
  await page.evaluate(() => {
    window.entityFixture.decorations = Object.fromEntries(['ornaments', 'artifacts']
      .map(key => [key, window.__iitcIrisLayers[key].slice()]));
  });
  await render(page, {...decoratedEntities, generation: 1101,
    portals: decoratedEntities.portals.map(p => ({...p, health: 50, artifacts: p.artifacts.map(a => ({...a, ids: ['new']}))}))});
  await expect.poll(() => page.evaluate(() => ['ornaments', 'artifacts'].every(key =>
    window.__iitcIrisLayers[key].every((layer, i) => layer === window.entityFixture.decorations[key][i])))).toBe(true);
  expect(await page.evaluate(() => window.entityFixture.images.length)).toBe(3);
  // These image overlays deliberately use entity portals rather than the label faction filters.
  await settings(page, {resistance: false, level8Portals: false});
  await expect.poll(() => decorationCounts(page)).toEqual([3, 3]);
  await page.evaluate(() => localStorage.setItem('excludedOrnaments', JSON.stringify(['fixture-'])));
  await render(page, {...decoratedEntities, generation: 1102});
  await expect.poll(() => decorationCounts(page)).toEqual([0, 3]);
  await page.evaluate(() => localStorage.removeItem('excludedOrnaments'));
  const changed = {...decoratedEntities, generation: 1103, portals: [
    {...decoratedEntities.portals[0], latE6: 52000200, level: 5,
      ornaments: ['fixture-new'], artifacts: [{type: 'fixture', role: 'fragment', ids: ['0']}]},
    decoratedEntities.portals[1],
  ]};
  await render(page, changed);
  await expect.poll(() => decorationCounts(page)).toEqual([2, 2]);
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([0, 0, 255, 153]);
  expect(await page.evaluate(() => {
    const previous = window.entityFixture.decorations.artifacts;
    const layers = window.__iitcIrisLayers.artifacts;
    return [layers[0] === previous[1], layers[1] !== previous[0], layers[1].getLatLng().lat,
      window.__iitcIrisLayers.ornaments[0].options.portalImage.zIndexOffset];
  })).toEqual([true, true, 52.0002, 8]);
  await settings(page, {ornaments: false, artifacts: false});
  await expect.poll(() => decorationCounts(page)).toEqual([0, 0]);
  await expect.poll(() => emptyImageCanvases(page)).toBe(true);
  await settings(page, {ornaments: true, artifacts: true});
  await expect.poll(() => decorationCounts(page)).toEqual([2, 2]);
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  const stacked = {...decoratedEntities, generation: 1104, portals: [{...decoratedEntities.portals[0], artifacts: [],
    ornaments: ['fixture-red', 'fixture-blue']}]};
  await render(page, stacked);
  await expect.poll(async () => {
    const pixel = await imagePixel(page, 'ornaments');
    return pixel[2] > pixel[0] && pixel[3] === 214;
  }).toBe(true);
  await page.evaluate(() => { window.entityFixture.topOrnament = window.__iitcIrisLayers.ornaments[1]; });
  await render(page, {...stacked, generation: 1105, portals: [{...stacked.portals[0], ornaments: ['fixture-new', 'fixture-blue']}]});
  await expect.poll(async () => {
    const pixel = await imagePixel(page, 'ornaments');
    return pixel[2] > pixel[0] && pixel[1] > 0 && pixel[3] === 214;
  }).toBe(true);
  expect(await page.evaluate(() => window.__iitcIrisLayers.ornaments.includes(window.entityFixture.topOrnament))).toBe(true);
  await render(page, {...stacked, generation: 1106, portals: [{...stacked.portals[0], isPlaceholder: true}]});
  await expect.poll(() => decorationCounts(page)).toEqual([2, 0]);
});

test('image overlays follow animated gestures, preserve stacking and recover after full clear and map replacement', async ({page}) => {
  await imageFixture(page);
  // Include two roles at the same portal: targets must stack above fragments, regardless of array order.
  const value = {...decoratedEntities, portals: [{...decoratedEntities.portals[0], artifacts: [
    {type: 'fixture', role: 'target', ids: ['1']}, {type: 'fixture', role: 'fragment', ids: ['2']},
  ]}]};
  await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {fixture: {
    gameEntities: value.portals.map(p => [p.guid, 1000, ['p', p.team, p.latE6, p.lngE6, p.level, 100, 8, '', 'Fixture', p.ornaments,
      false, false, [[['fixture', ['2']]], [['fixture', ['1']]]], 1000]]),
  }}}}}));
  await settings(page, {ornaments: true, artifacts: true});
  await render(page, value);
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([255, 0, 0, 255]);
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await page.evaluate(() => new Promise(resolve => {
    const map = window.__iitcIrisMap;
    map.once('moveend', resolve);
    map.panBy([40, 30], {animate: true, duration: 0.1});
  }));
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await page.evaluate(() => new Promise(resolve => {
    const map = window.__iitcIrisMap;
    map.once('zoomend', resolve);
    map.setZoom(17, {animate: true});
  }));
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([255, 0, 0, 255]);
  await page.evaluate(() => window.__iitcIrisMap.setZoom(13, {animate: false}));
  // Image overlays remain enabled at low zoom; only ornament size changes.
  await expect.poll(() => decorationCounts(page)).toEqual([1, 2]);
  await expect.poll(() => page.evaluate(() => window.__iitcIrisLayers.ornaments[0].options.portalImage.size)).toBe(48);
  await page.evaluate(() => window.__iitcIrisMap.setZoom(16, {animate: false}));
  await render(page, {...value, generation: 1104});
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await page.route('**/entity-fixture.json', route => route.fulfill({json: {result: {map: {}}}}));
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'image-clear', label: 'image-clear', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture image-clear');
  await expect.poll(() => decorationCounts(page)).toEqual([0, 0]);
  await expect.poll(() => emptyImageCanvases(page)).toBe(true);
  await render(page, {...value, generation: 1105});
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  await page.evaluate(() => {
    window.entityFixture.oldImages = [...window.__iitcIrisLayers.ornaments, ...window.__iitcIrisLayers.artifacts];
    window.entityFixture.oldImageCanvases = [...document.querySelectorAll('.iitc-iris-ornaments-canvas,.iitc-iris-artifacts-canvas')];
    const map = window.__iitcIrisMap;
    map.eachLayer(layer => layer.redraw?.());
    map.panBy([5, 5], {animate: false});
    window.entityFixture.dataSource = null;
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = old.className;
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  await expect.poll(() => page.evaluate(() => window.entityFixture.dataSource?.mode)).toBe('live');
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'image-replace', label: 'image-replace', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture image-replace');
  await render(page, {...value, generation: 1106});
  await settings(page, {ornaments: true, artifacts: true});
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 153]);
  expect(await page.evaluate(() => ({
    detached: window.entityFixture.oldImageCanvases.every(canvas => !canvas.isConnected),
    fresh: [...window.__iitcIrisLayers.ornaments, ...window.__iitcIrisLayers.artifacts]
      .every(layer => !window.entityFixture.oldImages.includes(layer)),
    passive: [...document.querySelectorAll('.iitc-iris-ornaments-canvas,.iitc-iris-artifacts-canvas')]
      .every(canvas => getComputedStyle(canvas).pointerEvents === 'none'),
  }))).toEqual({detached: true, fresh: true, passive: true});
});

test('late or failed image loads do not revive removed overlays and toggling retries failures', async ({page}) => {
  const images = await imageFixture(page);
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  let started = 0;
  await page.route('**/marker_images/slow.png', async route => {
    started++;
    await pending;
    await route.fulfill({contentType: 'image/png', body: Buffer.from(images.yellow, 'base64')});
  });
  let failures = 0;
  await page.route('**/marker_images/broken.png', route => {
    failures++;
    return failures === 1 ? route.fulfill({status: 404, body: ''})
      : route.fulfill({contentType: 'image/png', body: Buffer.from(images.yellow, 'base64')});
  });
  await settings(page, {ornaments: true, artifacts: true});
  const value = {...decoratedEntities, portals: [{...decoratedEntities.portals[0], ornaments: ['slow', 'broken']}]};
  await render(page, value);
  await expect.poll(() => started).toBe(1);
  await expect.poll(() => failures).toBe(1);
  await expect.poll(() => imagePixel(page, 'artifacts')).toEqual([255, 0, 0, 255]);
  await settings(page, {ornaments: false});
  await expect.poll(() => decorationCounts(page)).toEqual([0, 1]);
  expect(await page.evaluate(() => window.entityFixture.images.filter(image => image.src.endsWith('/slow.png'))
    .every(image => image.onload === null && image.onerror === null))).toBe(true);
  finish();
  await expect.poll(() => emptyImageCanvases(page)).toBe(false); // artifact is unaffected
  await settings(page, {artifacts: false});
  await expect.poll(() => emptyImageCanvases(page)).toBe(true);
  await settings(page, {ornaments: true});
  await expect.poll(() => failures).toBe(2);
  await expect.poll(() => imagePixel(page, 'ornaments')).toEqual([255, 255, 0, 214]); // two 60% images
});

test('image cache bounds unused URLs and detaches pending loads when the map is replaced', async ({page}) => {
  const images = await imageFixture(page);
  await settings(page, {ornaments: true});
  const value = {...decoratedEntities, portals: [{...decoratedEntities.portals[0], artifacts: [],
    ornaments: Array.from({length: 132}, (_, i) => `cache-${i}`)}]};
  await render(page, value);
  await expect.poll(() => page.evaluate(() => window.entityFixture.images.filter(image => image.complete && image.naturalWidth).length)).toBe(132);
  await settings(page, {ornaments: false});
  await expect.poll(() => decorationCounts(page)).toEqual([0, 0]);
  expect(await page.evaluate(() => window.entityFixture.images.filter(image => image.onload !== null).length)).toBe(128);
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  let started = false;
  await page.route('**/marker_images/map-pending.png', async route => {
    started = true;
    await pending;
    await route.fulfill({contentType: 'image/png', body: Buffer.from(images.yellow, 'base64')});
  });
  await render(page, {...value, generation: 1107, portals: [{...value.portals[0], ornaments: ['map-pending']}]});
  await settings(page, {ornaments: true});
  await expect.poll(() => started).toBe(true);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => {
    window.entityFixture.pendingCanvas = document.querySelector('.iitc-iris-ornaments-canvas');
    window.entityFixture.dataSource = null;
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = old.className;
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  await expect.poll(() => page.evaluate(() => window.entityFixture.dataSource?.mode)).toBe('live');
  expect(await page.evaluate(() => window.entityFixture.images.every(image => image.onload === null && image.onerror === null))).toBe(true);
  finish();
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DATA_SOURCE_SETTINGS', dataSource: {
    mode: 'fixture', id: 'late-image', label: 'late-image', url: '/entity-fixture.json',
  }}, '*'));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.status)).toBe('fixture late-image');
  await expect.poll(() => decorationCounts(page)).toEqual([0, 0]);
  expect(await page.evaluate(() => window.entityFixture.pendingCanvas.isConnected)).toBe(false);
});
