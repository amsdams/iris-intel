import {test, expect, entities, render, counts} from './entity-fixture.mjs';

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
    overlay: window.__iitcIrisLayers.selectedPortal.length}))).toEqual({details: 'ready', owner: 'FixtureOwner', title: 'Detailed portal', overlay: 2});
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
    overlay: window.__iitcIrisLayers.selectedPortal.length}))).toEqual({requests: 2, cached: true, selected: 'pending', overlay: 2});
  await page.evaluate(() => window.entityFixture.finishDetails());
  await expect.poll(() => page.evaluate(() => ({cached: window.entityFixture.status?.portalDetails?.cached ?? false,
    status: window.entityFixture.status?.portalDetails?.status, owner: window.entityFixture.status?.portalDetails?.owner})))
    .toEqual({cached: false, status: 'ready', owner: 'CachedOwner'});
});
