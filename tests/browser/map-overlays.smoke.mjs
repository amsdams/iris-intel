import {test, expect} from '@playwright/test';

const layerCounts = page => page.evaluate(() => ({
  drawings: window.__iitcIrisLayers.drawnItems.length,
  missions: window.__iitcIrisLayers.missions.length,
}));

test('drawing actions and cached mission overlays still work after map replacement', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:6973'
    ? route.continue() : route.fulfill({status: 200, body: ''}));
  await page.addInitScript(() => {
    localStorage.setItem('iitc-iris:missions:details-cache', JSON.stringify({test: {time: Date.now(), data: {
      guid: 'test', title: 'Overlay fixture', description: '', typeNum: 1,
      waypoints: [0, 1].map(index => ({index, hidden: index > 0, guid: `point-${index}`, title: `Point ${index}`,
        typeNum: 1, type: 'Portal', objectiveNum: 1, objective: 'Hack',
        latE6: 52000000 + index * 10000, lngE6: 4000000 + index * 10000})),
      bounds: {south: 52, west: 4, north: 52.01, east: 4.01},
    }}}));
  });
  await page.goto('/');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.evaluate(() => {
    window.postMessage({type: 'IITC_IRIS_DRAW_TOOLS', drawToolsAction: 'addMarker',
      drawToolsLatLngs: [{lat: 52, lng: 4}], drawToolsColor: '#ff0000', drawToolsLabel: 'Fixture marker'}, '*');
    window.postMessage({type: 'IITC_IRIS_DRAW_TOOLS', drawToolsAction: 'addPolyline',
      drawToolsLatLngs: [{lat: 52, lng: 4}, {lat: 52.01, lng: 4.01}]}, '*');
    window.postMessage({type: 'IITC_IRIS_REQUEST_MISSION_DETAILS', missionGuid: 'test'}, '*');
  });
  await expect.poll(() => layerCounts(page)).toEqual({drawings: 2, missions: 5});
  await expect(page.locator('.iitc-iris-mission-waypoint-label')).toHaveCount(2);
  await expect(page.locator('.leaflet-zoom-anim, .leaflet-pan-anim')).toHaveCount(0);
  await page.evaluate(() => {
    // Exercise the implicit pane renderers with redraw frames still pending.
    const map = window.__iitcIrisMap;
    map.eachLayer(layer => layer.redraw?.());
    map.panBy([5, 5], {animate: false});
    const old = document.getElementById('iitc-iris-map');
    const replacement = document.createElement('div');
    replacement.id = old.id;
    replacement.className = 'iitc-iris-map';
    old.replaceWith(replacement);
    window.dispatchEvent(new Event('IITC_IRIS_CONTAINER_READY'));
  });
  // Drawings persist; mission geometry is recreated only on the next explicit selection.
  await expect.poll(() => layerCounts(page)).toEqual({drawings: 2, missions: 0});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_REQUEST_MISSION_DETAILS', missionGuid: 'test'}, '*'));
  await expect.poll(() => layerCounts(page)).toEqual({drawings: 2, missions: 5});
  await page.evaluate(() => window.postMessage({type: 'IITC_IRIS_DRAW_TOOLS', drawToolsAction: 'undo', drawToolsItemType: 'polyline'}, '*'));
  await expect.poll(() => layerCounts(page)).toEqual({drawings: 1, missions: 5});
  await expect(page.locator('.iitc-iris-draw-tools-marker')).toHaveCount(1);
  await expect(page.locator('.iitc-iris-mission-waypoint-label')).toHaveCount(2);
  // Let pending Canvas redraw callbacks run before checking replacement cleanup.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(errors).toEqual([]);
});
