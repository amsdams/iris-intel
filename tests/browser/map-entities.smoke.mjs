import {test, expect, portal, entities, render, levelLabels, counts, settings} from './entity-fixture.mjs';
import {openMapGroupFor} from './navigation-fixture.mjs';

test('incremental generations retain unchanged layers and replace or remove changed entities', {tag: '@smoke'}, async ({page}) => {
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
    const {radius, weight, color, fillOpacity, opacity, dashArray} = current.options;
    return {same: current === window.entityFixture.original.portals.get('res')[0], fill: current.options.fillColor,
      radius, weight, color, fillOpacity, opacity, dashArray};
  });
  const originalStyle = await marker();
  expect(originalStyle).toEqual({same: true, radius: 11, weight: 4, color: '#0088ff', fill: '#0088ff',
    fillOpacity: 0.5, opacity: 1, dashArray: undefined});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', highlighterSettings: {active: 'history-visited'}}, '*'));
  await expect.poll(marker).toMatchObject({same: true, fill: 'yellow'});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_LAYER_SETTINGS', highlighterSettings: {active: 'none'}}, '*'));
  await expect.poll(marker).toEqual(originalStyle);
});

test('wide views explain missing map data and style only known portal details without changing enabled settings', async ({page}) => {
  const open = async name => {
    const primary = page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Map', exact: true});
    if (await primary.getAttribute('aria-pressed') !== 'true') await primary.click();
    await openMapGroupFor(page, name);
    await page.locator('.iitc-iris-sheet-tabbar').getByRole('button', {name, exact: true}).click();
  };
  const notice = page.getByLabel('Map data availability', {exact: true});
  await open('Layers');
  await expect(notice).toHaveCount(0);
  await page.locator('.iitc-iris-layer-secondary > summary').filter({hasText: /^Detail overlays$/}).click();
  await page.locator('.iitc-iris-layer-secondary > summary').filter({hasText: /^Portal highlighter$/}).click();
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
  for (const name of ['Counts', 'List', 'Viewport scores']) {
    await open(name);
    await expect(notice).toContainText('Results use loaded map data');
    await expect(notice).not.toContainText('Shorter links'); // zoom 13 includes all link lengths
  }
  await page.evaluate(() => window.__iitcIrisMap.setZoom(12, {animate: false}));
  await expect(notice).toContainText('Shorter links are also omitted at this zoom');
  await page.evaluate(() => window.__iitcIrisMap.setZoom(15, {animate: false}));
  await expect.poll(() => page.evaluate(() => window.entityFixture.status?.renderPolicy?.detailedPortals)).toBe(true);
  await expect(notice).toHaveCount(0);
  for (const name of ['Counts', 'List', 'Layers']) {
    await open(name);
    await expect(notice).toHaveCount(0);
  }
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
