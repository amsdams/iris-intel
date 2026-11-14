import {test, expect, portal, entities, render, levelLabels, levelInkAtPortal, keyLabels, keyInkAtPortal, keyItem, counts, settings, loadKeys, refreshKeys} from './entity-fixture.mjs';
import {waitForMapFrames} from './navigation-fixture.mjs';

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
  await waitForMapFrames(page);
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

test('key-count canvas retains unchanged badges, updates inventory and filters, and preserves cached counts on failure', async ({page}) => {
  await loadKeys(page);
  await settings(page, {labels: false, keyCount: true});
  await expect.poll(() => keyLabels(page)).toEqual([1]);
  await expect.poll(() => keyInkAtPortal(page, 'res')).toBe(true);
  await expect(page.locator('.iitc-iris-key-count-label')).toHaveCount(0);
  await page.evaluate(() => {window.entityFixture.keyLabel = window.__iitcIrisLayers.labels[0];});
  await render(page, {...entities, generation: 920, portals: entities.portals.map(p => ({...p, health: 70}))});
  await waitForMapFrames(page);
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
