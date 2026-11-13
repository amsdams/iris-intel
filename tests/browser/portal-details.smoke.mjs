import {test, expect} from './smoke-fixtures.mjs';
import {installPortalFixture, setupPortalMap, selectPortal} from './portal-fixture.mjs';

test.use({locale: 'en-US', timezoneId: 'UTC'});
test.beforeEach(installPortalFixture);

for (const theme of ['light', 'dark']) for (const width of [320, 1200]) {
  test(`portal statistics and access/link ranges (${theme}, ${width}px)`, async ({page}) => {
    await page.setViewportSize({width, height: 780});
    await setupPortalMap(page, theme);
    await selectPortal(page, 'alpha');
    const primary = page.locator('.iitc-iris-sheet-tabbar-primary');
    await primary.getByRole('button', {name: 'Portal', exact: true}).click();
    const portal = page.getByRole('complementary', {name: 'Selected portal details'});
    await portal.locator('summary').filter({hasText: /^Advanced statistics$/}).click();
    await expect(portal).toContainText('320 m');
    await expect(portal).toContainText('4,000 / 8,000 XM');
    await expect(portal).toContainText('cooldown 1m 30s');
    const range = await page.evaluate(() => window.__iitcIrisLayers.selectedPortal.map(layer => ({
      name: layer.options.className, radius: layer.getRadius?.(), dashed: layer.options.dashArray,
    })));
    expect(range).toHaveLength(3);
    expect(range).toContainEqual(expect.objectContaining({name: 'iitc-iris-portal-access-range', radius: 40}));
    expect(range).toContainEqual(expect.objectContaining({name: 'iitc-iris-portal-link-range'}));
    const rangeDistances = await page.evaluate(() => {
      const ring = window.__iitcIrisLayers.selectedPortal.find(layer => layer.options.className === 'iitc-iris-portal-link-range');
      const radians = Math.PI / 180;
      return ring.getLatLngs()[0].map(point => {
        const a = Math.sin((point.lat - 52) * radians / 2) ** 2
          + Math.cos(52 * radians) * Math.cos(point.lat * radians) * Math.sin((point.lng - 4) * radians / 2) ** 2;
        return 2 * 6367000 * Math.asin(Math.sqrt(a));
      });
    });
    expect(rangeDistances.length).toBeGreaterThanOrEqual(48);
    expect(rangeDistances.every(distance => Math.abs(distance - 320) < 0.001)).toBe(true);
    expect(await portal.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await selectPortal(page, 'beta');
    expect(await page.evaluate(() => window.__iitcIrisLayers.selectedPortal.find(layer =>
      layer.options.className === 'iitc-iris-portal-link-range')?.options.dashArray)).toBe('10,10');
  });
}

test('range zoom keeps a visible circle when wider map responses omit the selected portal', async ({page, context}) => {
  await page.setViewportSize({width: 412, height: 780});
  await setupPortalMap(page);
  await page.evaluate(() => {
    const original = window.__irisRpcHandlers.getPortalDetails;
    window.__irisRpcHandlers.getPortalDetails = async init => {
      const body = await (await original(init)).json();
      body.result[4] = 8;
      body.result[15].forEach(reso => {reso[1] = 8;});
      return Response.json(body);
    };
  });
  await selectPortal(page, 'alpha');
  await page.locator('.iitc-iris-sheet-tabbar-primary').getByRole('button', {name: 'Portal', exact: true}).click();
  const panel = page.getByRole('complementary', {name: 'Selected portal details'});
  let wideResponses = 0;
  await context.route('**/portal-feature-map.json', async route => {
    if (await page.evaluate(() => window.__iitcIrisMap.getZoom()) >= 15) return route.fallback();
    wideResponses += 1;
    return route.fulfill({json: {result: {map: {wide: {gameEntities: []}}}}});
  });
  await panel.getByTitle('Zoom to portal link range', {exact: true}).click();
  await expect.poll(() => wideResponses).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => ({
    guid: window.portalFixture.entity?.selectedPortal?.guid,
    range: window.portalFixture.entity?.portalDetails?.statistics?.range.range,
    overlays: window.__iitcIrisLayers.selectedPortal.length,
    mapPortals: window.__iitcIrisLayers.entityLayerIndex.portals.size,
  }))).toEqual({guid: 'alpha', range: 1310720, overlays: 3, mapPortals: 0});
  await expect(panel).toBeHidden();
  await expect(page.locator('.leaflet-zoom-anim, .leaflet-pan-anim')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const layer = window.__iitcIrisLayers.selectedPortal.find(item => item.options.className === 'iitc-iris-portal-link-range');
    if (!layer || !window.__iitcIrisMap.getBounds().contains(layer.getBounds())) return 0;
    const canvas = layer._renderer?._container;
    if (!(canvas instanceof HTMLCanvasElement)) return 0;
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 180 && pixels[i + 1] < 100 && pixels[i + 2] < 100 && pixels[i + 3] > 128) red++;
    }
    return red;
  })).toBeGreaterThan(50);
});
